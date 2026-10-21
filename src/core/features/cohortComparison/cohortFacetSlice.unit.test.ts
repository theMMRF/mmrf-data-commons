let endpoint: any;
const mockHook = jest.fn();
jest.mock('@gen3/core', () => ({
  graphQLAPI: {
    injectEndpoints: ({ endpoints }: any) => {
      endpoint = endpoints({ query: (definition: any) => definition }).mmrfCohortFacets;
      return { useMmrfCohortFacetsQuery: mockHook };
    },
  },
}));
jest.mock('@/core/constants', () => ({ GEN3_ANALYSIS_API: '/analysis/v0' }));

import { useCohortFacetsQuery } from './index';

it('wires the application hook to the MMRF query rather than the upstream day-based endpoint', () => {
  expect(useCohortFacetsQuery).toBe(mockHook);
  expect(endpoint).toBeDefined();
});

it('requests ten-year buckets and preserves both cohort filters', () => {
  const primary = { in: { 'demographic.gender': ['female'] } };
  const comparison = { in: { 'demographic.gender': ['male'] } };
  const request = endpoint.query({
    index: 'case_centric', facetFields: ['diagnoses.age_at_diagnosis', 'demographic.gender'],
    continuousFacets: ['diagnoses.age_at_diagnosis'],
    primaryCohort: primary, comparisonCohort: comparison,
  });
  expect(request).toEqual({
    url: '/analysis/v0/compare/facets', method: 'POST',
    body: {
      doc_type: 'case_centric', cohort1: primary, cohort2: comparison,
      facets: ['diagnoses.age_at_diagnosis', 'demographic.gender'],
      interval: { 'diagnoses.age_at_diagnosis': 10 },
    },
  });
});
