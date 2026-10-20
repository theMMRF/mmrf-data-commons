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

jest.mock('@/features/cases/CasesCohortButton/CasesCohortButton', () => ({
  openModalWithCohortFilterRepresentation: (filters: Record<string, unknown>) =>
    mockOpenModalWithCohortFilterRepresentation(filters),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<CohortCreationButton />', () => {
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

const sourceAgeRange = {
  mode: 'and' as const,
  root: { age: { field: 'age', operator: '>=' as const, operand: 45 } },
};
const selectedAgeRange = {
  mode: 'and' as const,
  root: { age: { field: 'age', operator: '<' as const, operand: 50 } },
};

it('saves an overlapping source and selected age bound together', async () => {
  const { getByTestId } = render(
    <MantineProvider>
      <CohortCreationButton
        label="10"
        numCases={10}
        caseFilter={sourceAgeRange}
        filter={selectedAgeRange}
        asFilterRepresentation
      />
    </MantineProvider>,
  );
  await userEvent.click(getByTestId('button-save-filtered-cohort'));
  expect(mockOpenModalWithCohortFilterRepresentation).toHaveBeenCalledWith({
    mode: 'and',
    root: {
      age: {
        operator: 'and',
        operands: [sourceAgeRange.root.age, selectedAgeRange.root.age],
      },
    },
  });
});

it.each([
  { asFilterRepresentation: false },
  { asFilterRepresentation: true, createStaticCohort: true },
])('retains static saving when requested: %j', async (props) => {
  jest.clearAllMocks();
  const { getByTestId } = render(
    <MantineProvider>
      <CohortCreationButton
        label="10"
        numCases={10}
        caseFilter={sourceAgeRange}
        filter={selectedAgeRange}
        {...props}
      />
    </MantineProvider>,
  );
  await userEvent.click(getByTestId('button-save-filtered-cohort'));
  expect(mockOpenModalWithCohortFilterRepresentation).not.toHaveBeenCalled();
  expect(mockGetCaseIds).toHaveBeenCalledWith(
    expect.objectContaining({
      cohortFilter: { and: [{ '>=': { age: 45 } }] },
      filter: { and: [{ '<': { age: 50 } }] },
    }),
  );
});

it('falls back for OR sources while querying their original logical grouping', async () => {
  jest.clearAllMocks();
  const source = {
    mode: 'or' as const,
    root: {
      ...sourceAgeRange.root,
      gender: {
        field: 'gender',
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
        caseFilter={source}
        filter={selectedAgeRange}
        asFilterRepresentation
      />
    </MantineProvider>,
  );
  await userEvent.click(getByTestId('button-save-filtered-cohort'));
  expect(mockOpenModalWithCohortFilterRepresentation).not.toHaveBeenCalled();
  expect(mockGetCaseIds).toHaveBeenCalledWith(
    expect.objectContaining({
      cohortFilter: {
        or: [{ '>=': { age: 45 } }, { in: { gender: ['male'] } }],
      },
    }),
  );
});

it('does not save a disabled zero-count selection', async () => {
  jest.clearAllMocks();
  const { getByTestId } = render(
    <MantineProvider>
      <CohortCreationButton
        label="0"
        numCases={0}
        caseFilter={sourceAgeRange}
        filter={selectedAgeRange}
        asFilterRepresentation
      />
    </MantineProvider>,
  );
  await userEvent.click(getByTestId('button-save-filtered-cohort'));
  expect(mockOpenModalWithCohortFilterRepresentation).not.toHaveBeenCalled();
  expect(mockGetCaseIds).not.toHaveBeenCalled();
});
