jest.mock('@gen3/frontend', () => ({ DAYS_IN_YEAR: 365.25 }));
import { DATA_DIMENSIONS, FACET_SORT } from './constants';
import type { StatsData } from '@gen3/core';
import { combineAnalysisResults, convertDataDimension, useDataDimension } from './utils';

describe('diagnosis age contract', () => {
  it('exposes the diagnosis age field under its actual clinical data group', () => {
    expect(FACET_SORT.diagnoses).toContain('age_at_diagnosis');
    expect(FACET_SORT.demographic).not.toContain('age_at_diagnosis');
  });
  it('keeps API ages in years and offers no days conversion toggle', () => {
    expect(DATA_DIMENSIONS['diagnoses.age_at_diagnosis']).toEqual({ unit: 'Years' });
    expect(useDataDimension('diagnoses.age_at_diagnosis')).toBe(false);
    expect(convertDataDimension(47, DATA_DIMENSIONS['diagnoses.age_at_diagnosis'].unit, 'Years')).toBe(47);
  });

  it('retains day-to-year conversion for follow-up durations', () => {
    expect(DATA_DIMENSIONS['diagnoses.days_to_last_follow_up'].unit).toBe('Days');
    expect(convertDataDimension(365.25, 'Days', 'Years')).toBe(1);
  });
});


describe('numeric clinical age bounds', () => {
  const age = { count: 3, min: 40, max: 85, sum: 189 };
  it('uses the singleton numeric histogram returned by Guppy', () => {
    const result = combineAnalysisResults({}, {
      'diagnoses.age_at_diagnosis': [age],
    } as unknown as StatsData);
    expect(result['diagnoses.age_at_diagnosis']).toEqual(age);
  });
  it('retains the existing flat stats contract', () => {
    expect(combineAnalysisResults({}, { 'diagnoses.age_at_diagnosis': age })['diagnoses.age_at_diagnosis']).toEqual(age);
  });
  it('handles an empty numeric histogram', () => {
    expect(combineAnalysisResults({}, {
      'diagnoses.age_at_diagnosis': [],
    } as unknown as StatsData)['diagnoses.age_at_diagnosis']).toEqual({ count: 0, min: 0, max: 0, sum: 0 });
  });
});
