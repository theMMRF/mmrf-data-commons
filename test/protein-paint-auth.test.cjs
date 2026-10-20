const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { PassThrough } = require('node:stream');
const https = require('node:https');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/pages/api/protein-paint/[...path].ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const handlerModule = new Module(filename, module);
handlerModule.filename = filename;
handlerModule.paths = module.paths;
handlerModule._compile(compiled, filename);
const handler = handlerModule.exports.default;

test('development rewrites always use the PP handler for local and remote targets', async () => {
  const oldEnv = process.env.NODE_ENV;
  const oldTarget = process.env.PROTEINPAINT_API;
  const configPath = require.resolve('../next.config.js');
  try {
    process.env.NODE_ENV = 'development';
    for (const target of [undefined, 'http://localhost:3000', 'http://localhost:3000/']) {
      if (target === undefined) delete process.env.PROTEINPAINT_API;
      else process.env.PROTEINPAINT_API = target;
      delete require.cache[configPath];
      const rewrites = await require(configPath).rewrites();
      assert.equal(rewrites.find(route => route.source === '/protein-paint/:path*').destination,
        '/api/protein-paint/:path*');
    }
  } finally {
    delete require.cache[configPath];
    if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
    if (oldTarget === undefined) delete process.env.PROTEINPAINT_API; else process.env.PROTEINPAINT_API = oldTarget;
  }
});

function response() {
  const res = new PassThrough();
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.body = body; res.end(); return res; };
  res.writeHead = (code, headers) => { res.statusCode = code; res.headers = headers; };
  return res;
}

test('local credentials are forwarded only to the configured HTTPS service', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalTarget = process.env.NEXT_PUBLIC_GEN3_API_TARGET;
  const originalRequest = https.request;
  const captured = [];
  process.env.NODE_ENV = 'development';
  process.env.NEXT_PUBLIC_GEN3_API_TARGET = 'https://dev-virtuallab.themmrf.org';
  https.request = (url, options) => {
    captured.push({ url, options });
    const stream = new PassThrough();
    stream.setTimeout = () => {};
    return stream;
  };
  const makeRequest = () => Object.assign(new PassThrough(), {
    headers: { cookie: 'credentials_token=test-local', host: 'localhost:3000' },
    cookies: { credentials_token: 'test-local' },
    query: { path: ['termdb'] }, method: 'POST', url: '/api/protein-paint/termdb?genome=hg38',
  });
  try {
    const req = makeRequest();
    handler(req, response());
    req.end();
    assert.equal(captured.length, 1);
    assert.equal(captured[0].url.href, 'https://dev-virtuallab.themmrf.org/protein-paint/termdb?genome=hg38');
    assert.equal(captured[0].options.headers.authorization, 'Bearer test-local');
    assert.equal(captured[0].options.headers.cookie, undefined);
    assert.equal(captured[0].options.headers.host, 'dev-virtuallab.themmrf.org');

    const anonymous = makeRequest(); anonymous.cookies = {}; anonymous.headers = {};
    const denied = response(); handler(anonymous, denied);
    assert.equal(denied.statusCode, 401);
    assert.equal(captured.length, 1);

    const badHeader = makeRequest(); badHeader.headers.authorization = 'Basic invalid';
    handler(badHeader, response()); badHeader.end();
    assert.equal(captured[1].options.headers.authorization, 'Basic invalid');

    process.env.NODE_ENV = 'production';
    const production = response(); handler(makeRequest(), production);
    assert.equal(production.statusCode, 404);
    assert.equal(captured.length, 2);
  } finally {
    https.request = originalRequest;
    if (originalEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalEnv;
    if (originalTarget === undefined) delete process.env.NEXT_PUBLIC_GEN3_API_TARGET;
    else process.env.NEXT_PUBLIC_GEN3_API_TARGET = originalTarget;
  }
});


test('upstream response errors close the downstream without an unhandled error', async () => {
  const oldEnv = process.env.NODE_ENV;
  const oldTarget = process.env.NEXT_PUBLIC_GEN3_API_TARGET;
  const oldRequest = https.request;
  process.env.NODE_ENV = 'development';
  process.env.NEXT_PUBLIC_GEN3_API_TARGET = 'https://dev-virtuallab.themmrf.org';
  const incoming = new PassThrough();
  https.request = (url, options, callback) => {
    const request = new PassThrough();
    request.setTimeout = () => {};
    callback(Object.assign(incoming, { statusCode: 200, headers: {} }));
    return request;
  };
  try {
    const req = Object.assign(new PassThrough(), {
      headers: { authorization: 'Bearer approved' }, cookies: {},
      query: { path: ['termdb'] }, method: 'POST', url: '/api/protein-paint/termdb',
    });
    const res = response();
    handler(req, res);
    req.end();
    incoming.write('partial');
    incoming.destroy(new Error('upstream disconnected'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(res.destroyed, true);
  } finally {
    https.request = oldRequest;
    if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
    if (oldTarget === undefined) delete process.env.NEXT_PUBLIC_GEN3_API_TARGET;
    else process.env.NEXT_PUBLIC_GEN3_API_TARGET = oldTarget;
  }
});

test('local PP mode forwards paths, bodies and queries without Gen3 credentials', async () => {
  const http = require('node:http');
  const original = { ...process.env };
  const received = [];
  const pp = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      received.push({ url: req.url, method: req.method, headers: req.headers, body });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise(resolve => pp.listen(0, '127.0.0.1', resolve));
  process.env.NODE_ENV = 'development';
  process.env.PROTEINPAINT_API = `http://127.0.0.1:${pp.address().port}`;
  delete process.env.NEXT_PUBLIC_GEN3_API_TARGET;
  const frontend = http.createServer((req, res) => {
    req.query = { path: ['termdb'] };
    req.cookies = { credentials_token: 'private-user-token' };
    handler(req, res);
  });
  await new Promise(resolve => frontend.listen(0, '127.0.0.1', resolve));
  try {
    const result = await fetch(`http://127.0.0.1:${frontend.address().port}/protein-paint/termdb?genome=hg38`, {
      method: 'POST', headers: { 'Content-Type': 'application/json',
        Authorization: 'Bearer private-user-token', Cookie: 'credentials_token=private-user-token' },
      body: JSON.stringify({ filter: {} }),
    });
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { ok: true });
    assert.equal(result.headers.get('cache-control'), 'private, no-store');
    assert.equal(received[0].url, '/termdb?genome=hg38');
    assert.equal(received[0].method, 'POST');
    assert.equal(received[0].body, '{"filter":{}}');
    assert.equal(received[0].headers.authorization, undefined);
    assert.equal(received[0].headers.cookie, undefined);
    // No commons session is required for an explicitly configured local PP server.
    const anonymous = await fetch(`http://127.0.0.1:${frontend.address().port}/protein-paint/termdb`);
    assert.equal(anonymous.status, 200);
    await anonymous.text();
  } finally {
    await Promise.all([pp, frontend].map(server => new Promise(resolve => server.close(resolve))));
    for (const key of ['NODE_ENV', 'PROTEINPAINT_API', 'NEXT_PUBLIC_GEN3_API_TARGET']) {
      if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key];
    }
  }
});

test('local override rejects remote hosts and malformed targets', () => {
  const originalEnv = process.env.NODE_ENV, originalPP = process.env.PROTEINPAINT_API;
  process.env.NODE_ENV = 'development';
  try {
    for (const target of ['http://remote.example:3000', 'https://remote.example', 'not a URL', 'http://user:pass@localhost:3000']) {
      process.env.PROTEINPAINT_API = target;
      const res = response();
      handler({ query: { path: ['genomes'] } }, res);
      assert.equal(res.statusCode, 503, target);
    }
    process.env.PROTEINPAINT_API = 'http://localhost:3000';
    process.env.NODE_ENV = 'production';
    const res = response(); handler({}, res);
    assert.equal(res.statusCode, 404);
  } finally {
    if (originalEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalEnv;
    if (originalPP === undefined) delete process.env.PROTEINPAINT_API; else process.env.PROTEINPAINT_API = originalPP;
  }
});


test('unapproved HTTPS commons cannot receive caller credentials', () => {
  const original = { ...process.env };
  const oldRequest = https.request;
  process.env.NODE_ENV = 'development';
  delete process.env.PROTEINPAINT_API;
  let calls = 0;
  https.request = () => { calls++; throw new Error('Must not contact unapproved origin'); };
  try {
    for (const target of ['https://unapproved.example', 'https://dev-virtuallab.themmrf.org:444', 'https://dev-virtuallab.themmrf.org.unapproved.example']) {
      process.env.NEXT_PUBLIC_GEN3_API_TARGET = target;
      const res = response();
      handler({ query: { path: ['genomes'] }, headers: { authorization: 'Bearer private-token' },
        cookies: { credentials_token: 'private-token' } }, res);
      assert.equal(res.statusCode, 503);
    }
    assert.equal(calls, 0);
  } finally {
    https.request = oldRequest;
    for (const key of ['NODE_ENV', 'PROTEINPAINT_API', 'NEXT_PUBLIC_GEN3_API_TARGET']) {
      if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key];
    }
  }
});
