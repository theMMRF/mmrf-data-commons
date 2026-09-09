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
  process.env.NEXT_PUBLIC_GEN3_API_TARGET = 'https://dev.example';
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
    assert.equal(captured[0].url.href, 'https://dev.example/protein-paint/termdb?genome=hg38');
    assert.equal(captured[0].options.headers.authorization, 'Bearer test-local');
    assert.equal(captured[0].options.headers.cookie, undefined);
    assert.equal(captured[0].options.headers.host, 'dev.example');

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
