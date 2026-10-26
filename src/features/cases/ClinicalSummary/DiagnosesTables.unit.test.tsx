import React from 'react';
import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import DiagnosesTables from './DiagnosesTables';
import type { Diagnoses } from './types';

jest.mock('@/components/HorizontalTable', () => ({
  HorizontalTable: ({ tableData }: any) => <div>{tableData.age_at_diagnosis}</div>,
}));
jest.mock('@/components/Table/VerticalTable', () => () => null);
jest.mock('@/features/files/utils', () => ({
  formatDataForHorizontalTable: (data: any) => data,
}));
jest.mock('src/utils', () => ({ ageDisplay: jest.fn(), humanify: ({ term }: any) => term }));

it.each([[47, '47 years'], [74, '74 years'], [1, '1 year'], [0, '0 years'], [null, '--']])(
  'shows API age %s without applying the day-based duration formatter',
  (age, expected) => {
    render(<MantineProvider><DiagnosesTables data={{ age_at_diagnosis: age, treatments: [] } as unknown as Diagnoses} /></MantineProvider>);
    expect(screen.getByText(expected)).toBeInTheDocument();
  },
);
