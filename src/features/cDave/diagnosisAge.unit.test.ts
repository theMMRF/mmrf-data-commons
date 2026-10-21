jest.mock('@gen3/frontend', () => ({ DAYS_IN_YEAR: 365.25 }));
import { DATA_DIMENSIONS } from './constants';
import { convertDataDimension, useDataDimension } from './utils';

describe('diagnosis age contract', () => {
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
