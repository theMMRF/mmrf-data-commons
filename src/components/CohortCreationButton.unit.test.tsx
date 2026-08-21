import React from 'react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import CohortCreationButton from './CohortCreationButton';

const mockGetCaseIds = jest.fn();
const mockOpenModalWithCohortFilterRepresentation = jest.fn();

jest.mock('@/core', () => ({
  MAX_CASES: 10_000,
  useLazyGetCohortCentricQuery: () => [
    mockGetCaseIds,
    {
      data: undefined,
      isFetching: false,
      isSuccess: false,
      isError: false,
    },
  ],
}));

jest.mock(
  '@/features/cases/CasesCohortButton/CasesCohortButton',
  () => ({
    openModalWithCohortFilterRepresentation: (
      filters: Record<string, unknown>,
    ) => mockOpenModalWithCohortFilterRepresentation(filters),
  }),
);

describe('<CohortCreationButton />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves the source cohort and selected facet filters when requested', async () => {
    const caseFilter = {
      mode: 'and' as const,
      root: {
        'demographic.race': {
          field: 'demographic.race',
          operator: 'includes' as const,
          operands: ['white'],
        },
      },
    };
    const selectedFacetFilter = {
      mode: 'and' as const,
      root: {
        'demographic.gender': {
          field: 'demographic.gender',
          operator: 'includes' as const,
          operands: ['male'],
        },
      },
    };

    const { getByTestId } = render(
      <MantineProvider>
        <CohortCreationButton
          label="10"
          numCases={10}
          caseFilter={caseFilter}
          filter={selectedFacetFilter}
          asFilterRepresentation
        />
      </MantineProvider>,
    );

    await userEvent.click(getByTestId('button-save-filtered-cohort'));

    expect(mockOpenModalWithCohortFilterRepresentation).toHaveBeenCalledWith({
      mode: 'and',
      root: {
        ...caseFilter.root,
        ...selectedFacetFilter.root,
      },
    });
    expect(mockGetCaseIds).not.toHaveBeenCalled();
  });
});
