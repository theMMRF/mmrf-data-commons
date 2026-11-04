import { createFilters, formatBucket } from './utils';

const field = 'diagnoses.age_at_diagnosis';

describe('MMRF age buckets use years', () => {
  it.each([[40, 50], [70, 80], [80, 90], [90, 100]])(
    'labels [%s, %s) without converting days or inventing an open upper bound',
    (from, to) => {
      expect(formatBucket([from, to], field)).toBe(`${from} to <${to} years`);
      expect(createFilters(field, [from, to])).toEqual({
        mode: 'and',
        root: {
          [field]: {
            operator: 'and',
            operands: [
              { field, operator: '>=', operand: from },
              { field, operator: '<', operand: to },
            ],
          },
        },
      });
    },
  );

  it('keeps fractional ages immediately below a boundary in the lower cohort', () => {
    const filter = createFilters(field, [40, 50]).root[field] as unknown as {
      operands: { operator: string; operand: number }[];
    };
    const matches = (age: number) => filter.operands.every(({ operator, operand }) =>
      operator === '>=' ? age >= operand : age < operand);
    expect([39.9, 40, 47, 49.99, 50].filter(matches)).toEqual([40, 47, 49.99]);
  });

  it('keeps missing ages separate from numeric buckets', () => {
    expect(formatBucket('_missing', field)).toBe('missing');
    expect(createFilters(field, '_missing')).toEqual({
      mode: 'and', root: { [field]: { field, operator: 'missing' } },
    });
  });

  it('preserves categorical facets', () => {
    expect(formatBucket('female', 'demographic.gender')).toBe('female');
    expect(createFilters('demographic.gender', 'female').root).toEqual({
      'demographic.gender': {
        field: 'demographic.gender', operator: 'includes', operands: ['female'],
      },
    });
  });
});
