import type { FilterSet, Operation } from '@gen3/core';
import { isEqual } from 'lodash';

const normalizeOperation = (operation: Operation): Operation => {
  if (operation.operator !== 'and' && operation.operator !== 'or')
    return operation;
  const operands = operation.operands.map(normalizeOperation);
  return operands.length === 1 ? operands[0] : { ...operation, operands };
};

const normalizeFilters = (filters: FilterSet): FilterSet => {
  const root = Object.fromEntries(
    Object.entries(filters.root).map(([key, value]) => [
      key,
      normalizeOperation(value),
    ]),
  );
  // Gen3's query converter defaults to AND regardless of FilterSet.mode.
  // Store OR explicitly as an operation so every save/query path preserves it.
  return {
    mode: 'and',
    root:
      filters.mode === 'or' && Object.keys(root).length > 1
        ? {
            cohort_selection: { operator: 'or', operands: Object.values(root) },
          }
        : root,
  };
};

/** Intersect a tool selection with its source cohort without replacing criteria. */
export const intersectCohortSelection = (
  sourceFilters: FilterSet,
  selectedFilters: FilterSet,
): FilterSet => {
  const source = normalizeFilters(sourceFilters);
  const selection = normalizeFilters(selectedFilters);
  if (Object.keys(source.root).length === 0) return selection;
  if (Object.keys(selection.root).length === 0) return source;

  const root = { ...source.root };
  for (const [field, selected] of Object.entries(selection.root)) {
    const existing = root[field];
    root[field] =
      existing && !isEqual(existing, selected)
        ? { operator: 'and', operands: [existing, selected] }
        : selected;
  }
  return { mode: 'and', root };
};

const isRangeBound = (filter: Operation): boolean =>
  ['<', '<=', '>', '>='].includes(filter.operator);

/** Match the expression shapes rendered by @gen3/frontend's cohort bar. */
const isVisibleOperation = (filter: Operation): boolean => {
  if (filter.operator === 'or' || filter.operator === 'nested') return false;
  if (filter.operator !== 'and') return true;

  const [first, second] = filter.operands;
  if (
    filter.operands.length === 2 &&
    isRangeBound(first) &&
    isRangeBound(second) &&
    'field' in first &&
    'field' in second &&
    first.field === second.field
  ) {
    return (
      ['>', '>='].includes(first.operator) &&
      ['<', '<='].includes(second.operator)
    );
  }

  // The bar flattens enum intersections into values joined with AND. Only
  // singleton operands have the same meaning after that transformation.
  return (
    filter.operands.length > 0 &&
    filter.operands.every(
      (operand) =>
        (operand.operator === 'in' || operand.operator === 'includes') &&
        operand.operands.length === 1 &&
        'field' in first &&
        operand.field === first.field,
    )
  );
};

export const canSaveCohortSelectionAsFilters = (filters: FilterSet): boolean =>
  filters.mode === 'and' &&
  Object.values(filters.root).every(isVisibleOperation);
