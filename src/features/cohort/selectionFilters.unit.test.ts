import {
  convertFilterSetToGqlFilter,
  type FilterSet,
  type Operation,
} from '@gen3/core';
import {
  canSaveCohortSelectionAsFilters,
  intersectCohortSelection,
} from './selectionFilters';

const empty: FilterSet = { mode: 'and', root: {} };
const enumFilter = (field: string, values: string[]): FilterSet => ({
  mode: 'and',
  root: { [field]: { field, operator: 'includes', operands: values } },
});
const ageRange = (min: number, max: number): FilterSet => ({
  mode: 'and',
  root: {
    age: {
      operator: 'and',
      operands: [
        { field: 'age', operator: '>=', operand: min },
        { field: 'age', operator: '<', operand: max },
      ],
    },
  },
});

// Evaluate the actual Guppy representation, so assertions exercise saved query
// membership rather than just mirroring the helper's object structure.
const matches = (query: any, row: Record<string, string | number>): boolean => {
  if (query.and) return query.and.every((q: any) => matches(q, row));
  if (query.or) return query.or.some((q: any) => matches(q, row));
  if (query.in)
    return Object.entries(query.in).every(([key, values]) =>
      (values as unknown[]).includes(row[key]),
    );
  const [operator, fields] = Object.entries(query)[0] as [
    string,
    Record<string, number>,
  ];
  return Object.entries(fields).every(([key, value]) => {
    if (operator === '>=') return Number(row[key]) >= value;
    if (operator === '<') return Number(row[key]) < value;
    throw new Error(`Unexpected operator ${operator}`);
  });
};

it('keeps different fields visible without mutating the source', () => {
  const source = enumFilter('race', ['white']);
  const result = intersectCohortSelection(
    source,
    enumFilter('gender', ['male']),
  );
  expect(canSaveCohortSelectionAsFilters(result)).toBe(true);
  expect(Object.keys(result.root)).toEqual(['race', 'gender']);
  expect(source).toEqual(enumFilter('race', ['white']));
});

it('does not lose source age bounds when the selected range overlaps', () => {
  const result = intersectCohortSelection(ageRange(45, 55), ageRange(40, 50));
  const query = convertFilterSetToGqlFilter(result);
  expect([42, 47, 52, 57].filter((age) => matches(query, { age }))).toEqual([
    47,
  ]);
  expect(canSaveCohortSelectionAsFilters(result)).toBe(false);
});

it.each(['and', 'or'] as const)(
  'preserves a source %s group when intersecting',
  (mode) => {
    const source: FilterSet = {
      mode,
      root: {
        ...enumFilter('race', ['white']).root,
        ...enumFilter('gender', ['male']).root,
      },
    };
    const selected = enumFilter('race', ['asian']);
    const result = intersectCohortSelection(source, selected);
    const query = convertFilterSetToGqlFilter(result);
    for (const row of [
      { race: 'white', gender: 'female' },
      { race: 'asian', gender: 'male' },
      { race: 'asian', gender: 'female' },
    ]) {
      expect(matches(query, row)).toBe(
        matches(convertFilterSetToGqlFilter(source, source.mode), row) &&
          matches(convertFilterSetToGqlFilter(selected, selected.mode), row),
      );
    }
  },
);

it('preserves an OR selection as a group rather than ANDing its terms', () => {
  const source = enumFilter('race', ['white']);
  const selection: FilterSet = {
    mode: 'or',
    root: {
      ...enumFilter('gender', ['male']).root,
      ...ageRange(40, 50).root,
    },
  };
  const query = convertFilterSetToGqlFilter(
    intersectCohortSelection(source, selection),
  );
  expect(matches(query, { race: 'white', gender: 'female', age: 45 })).toBe(
    true,
  );
  expect(matches(query, { race: 'white', gender: 'male', age: 55 })).toBe(true);
  expect(matches(query, { race: 'asian', gender: 'male', age: 45 })).toBe(
    false,
  );
});

it('retains static source IDs alongside new criteria', () => {
  const source = enumFilter('case_id', ['case-1', 'case-2']);
  const result = intersectCohortSelection(
    source,
    enumFilter('gender', ['male']),
  );
  expect(result.root.case_id).toEqual(source.root.case_id);
  expect(canSaveCohortSelectionAsFilters(result)).toBe(true);
});

it('keeps identical conditions readable', () => {
  const filters = ageRange(45, 55);
  const result = intersectCohortSelection(filters, filters);
  expect(result).toEqual(filters);
  expect(canSaveCohortSelectionAsFilters(result)).toBe(true);
});

it('normalizes a single selected clinical age bin into a visible range', () => {
  const range = ageRange(40, 50);
  const selected: FilterSet = {
    mode: 'and',
    root: {
      age: { operator: 'or', operands: [range.root.age] },
    },
  };
  const result = intersectCohortSelection(empty, selected);
  expect(result).toEqual(range);
  expect(canSaveCohortSelectionAsFilters(result)).toBe(true);
});

it.each([empty, enumFilter('gender', ['male'])])(
  'handles empty criteria on either side',
  (filters) => {
    expect(intersectCohortSelection(empty, filters)).toEqual(filters);
    expect(intersectCohortSelection(filters, empty)).toEqual(filters);
  },
);

it.each<Operation>([
  { field: 'race', operator: 'missing' },
  { field: 'race', operator: 'excludes', operands: ['white'] },
  {
    operator: 'and',
    operands: [
      { field: 'risk', operator: 'includes', operands: ['a'] },
      { field: 'risk', operator: 'includes', operands: ['b'] },
    ],
  },
])('accepts expression shapes the cohort bar can render: %j', (operation) => {
  expect(
    canSaveCohortSelectionAsFilters({
      mode: 'and',
      root: { selection: operation },
    }),
  ).toBe(true);
});

it('falls back for multi-valued enum intersections the bar would mislabel', () => {
  const result = intersectCohortSelection(
    enumFilter('race', ['white', 'asian']),
    enumFilter('race', ['asian']),
  );
  expect(canSaveCohortSelectionAsFilters(result)).toBe(false);
});

it('falls back for multiple clinical age bins or missing-plus-values selections', () => {
  const filters: FilterSet = {
    mode: 'and',
    root: {
      age: {
        operator: 'or',
        operands: [ageRange(40, 50).root.age, ageRange(60, 70).root.age],
      },
    },
  };
  expect(canSaveCohortSelectionAsFilters(filters)).toBe(false);
});
