import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryExpressionContext, QueryExpressionSection } from '@gen3/frontend';
import type { FilterSet } from '@gen3/core';
import { intersectCohortSelection } from './selectionFilters';

// The frontend bundle also exports server auth code; this test only renders its
// real cohort bar, so the ESM-only server auth dependency is not exercised.
jest.mock('jose', () => ({}));

const showFilters = (filters: FilterSet) =>
  render(
    <MantineProvider>
      <QueryExpressionContext.Provider
        value={{
          cohortId: 'saved',
          cohortName: 'Saved selection',
          fieldsAreFlat: true,
          displayOnly: true,
          showLogicalOperators: true,
          useGetFilters: () => filters,
          useClearCohortFilters: () => jest.fn(),
          useRemoveFilter: () => jest.fn(),
          useUpdateFilters: () => jest.fn(),
          useSetCohortFilters: () => jest.fn(),
          useFormatFilters: () => async (value) => value,
        }}
      >
        <QueryExpressionSection index="case_centric" displayOnly />
      </QueryExpressionContext.Provider>
    </MantineProvider>,
  );

it('shows saved source and selected values in the actual Gen3 cohort bar', async () => {
  showFilters(
    intersectCohortSelection(
      {
        mode: 'and',
        root: {
          'demographic.race': {
            field: 'demographic.race',
            operator: 'includes',
            operands: ['white'],
          },
        },
      },
      {
        mode: 'and',
        root: {
          'demographic.gender': {
            field: 'demographic.gender',
            operator: 'includes',
            operands: ['male'],
          },
        },
      },
    ),
  );
  await waitFor(() => {
    expect(screen.getByTestId('text-cohort-filters')).toHaveTextContent(
      'white',
    );
    expect(screen.getByTestId('text-cohort-filters')).toHaveTextContent('male');
  });
  expect(screen.getByTestId('query-logical-operator-and')).toBeInTheDocument();
  expect(screen.getByTestId('text-cohort-filters')).not.toHaveTextContent(
    'case_id',
  );
});

it('shows a normalized single clinical age bin as a range rather than Union', () => {
  showFilters(
    intersectCohortSelection(
      { mode: 'and', root: {} },
      {
        mode: 'and',
        root: {
          age: {
            operator: 'or',
            operands: [
              {
                operator: 'and',
                operands: [
                  { field: 'age', operator: '>=', operand: 40 },
                  { field: 'age', operator: '<', operand: 50 },
                ],
              },
            ],
          },
        },
      },
    ),
  );
  const bar = screen.getByTestId('text-cohort-filters');
  expect(bar).toHaveTextContent('40');
  expect(bar).toHaveTextContent('50');
  expect(bar).not.toHaveTextContent('Union');
});

jest.mock('react-markdown', () => ({ __esModule: true, default: () => null }));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => null }));
jest.mock('rehype-sanitize', () => ({ __esModule: true, default: () => null }));
