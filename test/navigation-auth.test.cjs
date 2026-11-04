const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { generateKeyPair, exportSPKI, SignJWT } = require('jose');
const { NextRequest } = require('next/server');

// Exercise the actual TypeScript helpers with real JWT signatures. Only the
// remote Fence key lookup is replaced so rotation/outages are deterministic.
function loadTs(relativePath, imports) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (name) =>
    Object.hasOwn(imports, name)
      ? imports[name]
      : Module.prototype.require.call(loaded, name);
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
  return loaded.exports;
}

function loginHelper(fetchJWTKey) {
  const keyCache = loadTs('src/lib/auth/fenceJwtKey.ts', {
    '@gen3/frontend/server': { fetchJWTKey },
  });
  return loadTs('src/lib/auth/getLoginStatus.ts', { './fenceJwtKey': keyCache })
    .getLoginStatus;
}

async function identity() {
  const keys = await generateKeyPair('RS256');
  return { ...keys, pem: await exportSPKI(keys.publicKey) };
}

const cookie = async (key, expiration = '1h') =>
  `access_token=${await new SignJWT({
    context: { user: { email: 'test@example.invalid' } },
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(key)}`;

test('public-key caching coalesces requests but still rejects expired and forged tokens', async (t) => {
  const good = await identity(),
    other = await identity();
  let lookups = 0;
  const getLoginStatus = loginHelper(async () => {
    lookups++;
    return good.pem;
  });
  const valid = await cookie(good.privateKey);
  const statuses = await Promise.all(
    [1, 2, 3].map(() => getLoginStatus(valid)),
  );
  assert.ok(statuses.every((status) => status.status === 'issued'));
  assert.equal(lookups, 1);
  t.mock.method(console, 'error', () => {});
  assert.equal(
    (await getLoginStatus(await cookie(good.privateKey, '0s'))).status,
    'invalid',
  );
  assert.equal(
    (await getLoginStatus(await cookie(other.privateKey))).status,
    'invalid',
  );
  assert.equal((await getLoginStatus()).status, 'not present');
  assert.equal(lookups, 1);
});

test('signature failures refresh rotated keys with a cooldown, and expired cache fails closed on outage', async (t) => {
  const first = await identity(),
    second = await identity();
  let publicKey = first.pem,
    lookups = 0,
    offline = false;
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  t.mock.method(console, 'error', () => {});
  const getLoginStatus = loginHelper(async () => {
    lookups++;
    if (offline) throw new Error('Fence unavailable');
    return publicKey;
  });
  assert.equal(
    (await getLoginStatus(await cookie(first.privateKey))).status,
    'issued',
  );
  publicKey = second.pem;
  now += 5_001;
  const rotated = await cookie(second.privateKey);
  assert.equal((await getLoginStatus(rotated)).status, 'issued');
  assert.equal(lookups, 2);
  // The retired key cannot trigger a lookup per invalid request.
  const oldCookie = await cookie(first.privateKey);
  assert.equal((await getLoginStatus(oldCookie)).status, 'invalid');
  assert.equal((await getLoginStatus(oldCookie)).status, 'invalid');
  assert.equal(lookups, 2);
  now += 60_001;
  offline = true;
  assert.equal((await getLoginStatus(rotated)).status, 'invalid');
  assert.equal(lookups, 3);
  offline = false;
  assert.equal((await getLoginStatus(rotated)).status, 'issued');
  assert.equal(lookups, 4);
});

test('terms identity reuses verified request context without another token verification', async () => {
  let checks = 0;
  const { resolveUserIdentity } = loadTs('src/lib/terms/userEmail.ts', {
    '@gen3/core/server': { GEN3_API: '' },
    '@/lib/auth/getLoginStatus': {
      getLoginStatus: async () => {
        checks++;
        return { status: 'invalid' };
      },
      getAccessToken: () => undefined,
    },
    './requestOrigin': { buildAbsoluteGen3Url: () => undefined },
  });
  const status = {
    status: 'issued',
    userContext: { email: 'test@example.invalid', name: 'Test' },
  };
  assert.deepEqual(
    await resolveUserIdentity('request-cookie', undefined, status),
    { email: 'test@example.invalid', name: 'Test' },
  );
  assert.equal(checks, 0);
  assert.deepEqual(await resolveUserIdentity('invalid-cookie'), {});
  assert.equal(checks, 1);
});

test('terms lookup stays fresh and denies access when the service fails', async (t) => {
  const { fetchTermsAcceptedFromBff } = loadTs(
    'src/lib/terms/middlewareTermsCheck.ts',
    {},
  );
  const req = new NextRequest('http://localhost:3334/?app=ProteinPaint');
  let accepted = true,
    offline = false,
    checks = 0;
  t.mock.method(console, 'error', () => {});
  t.mock.method(global, 'fetch', async (url, options) => {
    checks++;
    assert.equal(options.cache, 'no-store');
    if (offline) throw new Error('terms service unavailable');
    return Response.json({ hasAcceptedLatestTerms: accepted });
  });
  const status = { status: 'issued' };
  assert.equal(
    (await fetchTermsAcceptedFromBff(req, status)).hasAcceptedLatestTerms,
    true,
  );
  accepted = false;
  assert.equal(
    (await fetchTermsAcceptedFromBff(req, status)).hasAcceptedLatestTerms,
    false,
  );
  assert.equal(checks, 2);
  offline = true;
  assert.equal(
    (await fetchTermsAcceptedFromBff(req, status)).hasAcceptedLatestTerms,
    false,
  );
});
