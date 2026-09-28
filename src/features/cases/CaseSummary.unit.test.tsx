import React from 'react';
import { render } from 'test-utils';
import { CaseSummary } from './CaseSummary';
import * as caseSlice from '@/core/features/cases/caseSlice';

jest.mock('@/core/features/cases/caseSlice', () => ({
  useCaseSummaryQuery: jest.fn(),
}));

jest.mock('src/utils/contexts', () => ({
  URLContext: React.createContext(undefined),
}));

describe('<CaseSummary />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show Loading Overlay when fetching', () => {
    const loadingResponse = {
      data: undefined,
      isError: false,
      isFetching: true,
      isSuccess: true,
      isUninitialized: false,
    };

    jest
      .spyOn(caseSlice, 'useCaseSummaryQuery')
      .mockReturnValue(loadingResponse as any);
    const { getByTestId } = render(<CaseSummary caseId="testId" bioId="" />);

    expect(getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should show case not found error when wrong case id has been entered i.e, data is undefined', () => {
    const loadingResponse = {
      data: undefined,
      isError: false,
      isFetching: false,
      isSuccess: true,
      isUninitialized: false,
    };

    jest
      .spyOn(caseSlice, 'useCaseSummaryQuery')
      .mockReturnValue(loadingResponse as any);
    const { getByText } = render(<CaseSummary caseId="testId" bioId="" />);

    expect(getByText('Case Not Found')).toBeInTheDocument();
  });
});
