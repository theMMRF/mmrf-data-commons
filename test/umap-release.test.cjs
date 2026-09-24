const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const core = require('@gen3/core');

function loadTs(relativePath, imports) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = name => Object.hasOwn(imports, name)
    ? imports[name] : Module.prototype.require.call(loaded, name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return loaded.exports;
}

// Use the real converter and installed Gen3 operations; unrelated genomic
// helpers are not exercised by these case-cohort tests.
const { buildCohortGqlOperator } = loadTs('src/core/utils/filters.ts', {
  '@/core/types': {}, '@/core/genomic/genomicFilters': {},
});

function umapFilter(cohort, demo = false) {
  let launch, effect;
  const wrapper = loadTs('src/features/proteinpaint/UmapWrapper.tsx', {
    react: { ...React, useRef: value => ({ current: value === null
      ? { parentNode: { parentNode: { parentNode: { style: {} } } } } : value }),
      useState: () => [false, () => {}] },
    'use-deep-compare': { useDeepCompareEffect: fn => { effect = fn; } },
    '@sjcrh/proteinpaint-client': { bindProteinPaint: args => { launch = args; } },
    '@/hooks/useIsDemoApp': { useIsDemoApp: () => demo },
    '@gen3/core': { ...core, useCoreSelector: () => cohort,
      useFetchUserDetailsQuery: () => ({}), useCoreDispatch: () => () => {} },
    '@/components/tailwindComponents': { DemoText: 'demo-text' },
    '@/core/utils': { selectCurrentCohortCaseFilters: () => cohort },
    '@/core/utils/filters': { buildCohortGqlOperator },
    '@/core': { COHORT_FILTER_INDEX: 'case_centric', PROTEINPAINT_API: '/protein-paint' },
  });
  wrapper.UmapWrapper({});
  effect();
  return launch.initArgs.filter0;
}

const include = (field, ...operands) => ({ operator: 'in', field, operands });

test('UMAP respects a cohort top-level OR rather than silently using AND', () => {
  const cohort = { mode: 'or', root: {
    first: include('case_id', 'case-a'), second: include('case_id', 'case-b'),
  } };
  assert.deepEqual(umapFilter(cohort), {
    or: [{ in: { case_id: ['case-a'] } }, { in: { case_id: ['case-b'] } }],
  });
});

test('UMAP uses the cohort helper for combined cohorts and nested fields', () => {
  const cohort = { mode: 'and', root: {
    joinOrToAll: { operator: 'or', operands: [include('case_id', 'case-a'), include('case_id', 'case-b')] },
    gender: include('demographic.gender', 'female'),
  } };
  const before = structuredClone(cohort);
  const expected = buildCohortGqlOperator(cohort);
  assert.equal(expected.or.length, 2);
  assert.ok(expected.or.every(branch => branch.and[1].nested));
  assert.deepEqual(umapFilter(cohort), expected);
  assert.deepEqual(cohort, before);
});

test('UMAP retains CGS match-all filters and demo behavior', () => {
  const field = 'cgs_risk_key_criteria.other_criteria';
  const cohort = { mode: 'and', root: { criteria: {
    operator: 'and', operands: [include(field, 'criterion-a'), include(field, 'criterion-b')],
  } } };
  assert.deepEqual(umapFilter(cohort), core.convertFilterSetToGqlFilter(cohort));
  assert.equal(umapFilter(cohort, true), null);
  assert.equal(umapFilter({ mode: 'and', root: {} }), undefined);
});

const sections = [{ title: 'Analysis', tools: [
  { appId: 'Umap', title: 'Bulk RNA-seq UMAP' }, { appId: 'OncoMatrix', title: 'OncoMatrix' },
] }];
let route = {};
const page = loadTs('src/pages/index.tsx', {
  react: { ...React, useMemo: fn => fn() },
  'next/router': { useRouter: () => ({ query: route }) },
  '@/components/PageTitle': { __esModule: true, default: 'page-title' },
  '@gen3/frontend': { AnalysisPageGetServerSideProps: async () => ({ props: { sections } }),
    ProtectedContent: 'protected', CohortManager: 'cohorts', QueryExpression: 'filters' },
  '@gen3/core': {}, '@mantine/core': {},
  '@/components/analysis/AnalysisWorkspace': { __esModule: true, default: 'workspace' },
  '@/components/analysis/AnalysisToolSections': { __esModule: true, default: 'tool-sections' },
  '@/features/cohortComparison/AdditionalCohortSelection': {},
  'use-deep-compare': {}, '@/features/cohort/getCustomCohortButtons': { getCustomCohortButtons: () => [] },
  '@/hooks/useAppFilters': { useProjectId: () => undefined },
  '@/utils/formatQueryExpressionValues': {},
});

function findElement(tree, type) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (tree.type === type) return tree;
  for (const child of React.Children.toArray(tree.props?.children)) {
    const match = findElement(child, type);
    if (match) return match;
  }
}

test('UMAP card is hidden only on prod and its direct URL remains available', async () => {
  for (const headers of [
    { host: 'virtuallab.themmrf.org' },
    { host: 'internal', 'x-forwarded-host': 'virtuallab.themmrf.org' },
    { host: 'dev-virtuallab.themmrf.org' }, { host: 'localhost:3000' },
  ]) {
    const { props } = await page.getServerSideProps({ req: { headers } });
    const prod = (headers['x-forwarded-host'] || headers.host) === 'virtuallab.themmrf.org';
    assert.equal(props.hideProdOnlyTools, prod);
    route = {};
    const cards = findElement(page.default(props), 'tool-sections').props.sections[0].tools;
    assert.deepEqual(cards.map(t => t.appId), prod ? ['OncoMatrix'] : ['Umap', 'OncoMatrix']);
    route = { app: 'Umap' };
    assert.equal(findElement(page.default(props), 'workspace').props.appInfo.appId, 'Umap');
  }
  assert.equal(sections[0].tools.length, 2, 'visibility filtering must not mutate app registration');
});
