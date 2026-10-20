import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { modals } from '@mantine/modals';
import { convertFilterSetToGqlFilter, type FilterSet } from '@gen3/core';
import { CasesCohortButtonFromFilters } from './CasesCohortButton';

let mockSource: FilterSet = { mode: 'and', root: {} };
const mockFetchCaseIds = jest.fn();
jest.mock('@gen3/core', () => ({
  ...jest.requireActual('@gen3/core'),
  useCoreSelector: () => ({ case_centric: mockSource }),
}));
jest.mock('@/core', () => ({ COHORT_FILTER_INDEX: 'case_centric' }));
jest.mock('@/core/features/cases/caseSlice', () => ({
  useLazyCohortCaseIdQuery: () => [mockFetchCaseIds, { isFetching: false }],
}));
jest.mock('@mantine/modals', () => ({
  modals: { openContextModal: jest.fn() },
}));
jest.mock('./SelectCohortsModal', () => ({ SelectCohortsModal: () => null }));
jest.mock('@/components/tailwindComponents', () => ({
  CountsIcon: () => null,
}));
jest.mock('@/components/DropdownWithIcon/DropdownWithIcon', () => ({
  DropdownWithIcon: ({
    dropdownElements,
  }: {
    dropdownElements: { title: string; onClick: () => void }[];
  }) => <button onClick={dropdownElements[0].onClick}>Save selection</button>,
}));

const selected: FilterSet = {
  mode: 'and',
  root: {
    gender: { field: 'gender', operator: 'includes', operands: ['male'] },
  },
};
const renderButton = (filters = selected) =>
  render(
    <MantineProvider>
      <CasesCohortButtonFromFilters
        numCases={10}
        filters={filters}
        asFilterRepresentation
      />
    </MantineProvider>,
  );
const savedFilters = () =>
  (modals.openContextModal as jest.Mock).mock.calls[0][0].innerProps.filters
    .case_centric;

beforeEach(() => {
  jest.clearAllMocks();
  mockSource = {
    mode: 'and',
    root: {
      race: { field: 'race', operator: 'includes', operands: ['white'] },
    },
  };
  mockFetchCaseIds.mockReturnValue({ unwrap: async () => ['case-1'] });
});

it('saves clinical selections and their source criteria without fetching IDs', () => {
  renderButton();
  fireEvent.click(screen.getByText('Save selection'));
  expect(savedFilters()).toEqual({
    mode: 'and',
    root: { ...mockSource.root, ...selected.root },
  });
  expect(mockFetchCaseIds).not.toHaveBeenCalled();
});

it('does not overwrite an overlapping source range during fallback', async () => {
  mockSource = {
    mode: 'and',
    root: {
      age: {
        operator: 'and',
        operands: [
          { field: 'age', operator: '>=', operand: 45 },
          { field: 'age', operator: '<', operand: 55 },
        ],
      },
    },
  };
  const bucket: FilterSet = {
    mode: 'and',
    root: {
      age: {
        operator: 'and',
        operands: [
          { field: 'age', operator: '>=', operand: 40 },
          { field: 'age', operator: '<', operand: 50 },
        ],
      },
    },
  };
  renderButton(bucket);
  fireEvent.click(screen.getByText('Save selection'));
  await waitFor(() => expect(modals.openContextModal).toHaveBeenCalled());
  const query = convertFilterSetToGqlFilter(
    mockFetchCaseIds.mock.calls[0][0].filter,
  );
  expect(query).toEqual({
    and: [
      {
        and: [
          { and: [{ '>=': { age: 45 } }, { '<': { age: 55 } }] },
          { and: [{ '>=': { age: 40 } }, { '<': { age: 50 } }] },
        ],
      },
    ],
  });
  expect(savedFilters().root.case_id.operands).toEqual(['case-1']);
});

it('normalizes a single clinical range for display', () => {
  const range = {
    operator: 'and' as const,
    operands: [
      { field: 'age', operator: '>=' as const, operand: 40 },
      { field: 'age', operator: '<' as const, operand: 50 },
    ],
  };
  renderButton({
    mode: 'and',
    root: { age: { operator: 'or', operands: [range] } },
  });
  fireEvent.click(screen.getByText('Save selection'));
  expect(savedFilters().root.age).toEqual(range);
  expect(mockFetchCaseIds).not.toHaveBeenCalled();
});

it('preserves top-level OR logic in the fallback query', async () => {
  mockSource = { mode: 'or', root: { ...mockSource.root, ...selected.root } };
  renderButton({ mode: 'and', root: {} });
  fireEvent.click(screen.getByText('Save selection'));
  await waitFor(() => expect(modals.openContextModal).toHaveBeenCalled());
  expect(
    convertFilterSetToGqlFilter(mockFetchCaseIds.mock.calls[0][0].filter),
  ).toEqual({
    and: [{ or: [{ in: { race: ['white'] } }, { in: { gender: ['male'] } }] }],
  });
});

it('keeps case-ID-only selections static without a lookup', () => {
  mockSource = { mode: 'and', root: {} };
  renderButton({
    mode: 'and',
    root: {
      'cases.case_id': {
        field: 'cases.case_id',
        operator: 'in',
        operands: ['case-1', 'case-2'],
      },
    },
  });
  fireEvent.click(screen.getByText('Save selection'));
  expect(savedFilters().root.case_id.operands).toEqual(['case-1', 'case-2']);
  expect(mockFetchCaseIds).not.toHaveBeenCalled();
});
