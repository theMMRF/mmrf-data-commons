const test = require('node:test');
const assert = require('node:assert/strict');
const { getPathMatch } = require('next/dist/shared/lib/router/utils/path-match');
const { prepareDestination } = require('next/dist/shared/lib/router/utils/prepare-destination');

const TARGET = 'https://dev-virtuallab.themmrf.org';

async function loadDevConfig() {
  const original = { ...process.env };
  const configPath = require.resolve('../next.config.js');
  try {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_GEN3_API_TARGET = TARGET;
    delete require.cache[configPath];
    const config = require(configPath);
    return { config, rewrites: await config.rewrites() };
  } finally {
    delete require.cache[configPath];
    for (const key of ['NODE_ENV', 'NEXT_PUBLIC_GEN3_API_TARGET']) {
      if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key];
    }
  }
}

function resolve(rewrites, pathname) {
  for (const { source, destination } of rewrites) {
    const params = getPathMatch(source, { removeUnnamedParams: true, strict: true })(pathname);
    if (!params) continue;
    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false, destination, params, query: {},
    });
    return `${parsedDestination.protocol}//${parsedDestination.hostname}${parsedDestination.pathname}`;
  }
  return undefined;
}

test('development proxies Gen3 paths with and without a trailing slash unchanged', async () => {
  const { config, rewrites } = await loadDevConfig();
  assert.equal(config.skipTrailingSlashRedirect, true);
  for (const pathname of [
    '/analysis/v0/survival/',
    '/analysis/v0/survival/compare',
    '/analysis/v0/genomic/gene_table',
    '/guppy/graphql',
    '/user/user/',
    '/_status',
  ]) {
    assert.equal(resolve(rewrites, pathname), `${TARGET}${pathname}`, pathname);
  }
});
