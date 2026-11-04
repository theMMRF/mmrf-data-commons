import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { MaintenanceNoticeView, MaintenanceConfig } from './MaintenanceNotice';

jest.mock('@gen3/core', () => ({
  useFetchUserDetailsQuery: jest.fn(),
}));
jest.mock('@mantine/core', () => ({
  Modal: ({
    opened,
    children,
  }: {
    opened: boolean;
    children: React.ReactNode;
  }) => (opened ? <div role="dialog">{children}</div> : null),
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  Group: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
const config: MaintenanceConfig = {
  enabled: true,
  id: 'test-upgrade',
  title: 'Maintenance',
  message: 'Brief downtime',
  buttonLabel: 'Understood',
  startsAt: '2026-10-28T12:00:00-04:00',
  endsAt: '2026-10-28T14:00:00-04:00',
};
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-28T13:00:00-04:00'));
  window.sessionStorage.clear();
});
afterEach(() => jest.useRealTimers());

test('dismissal survives remount and pending auth, but resets after confirmed logout', () => {
  const props = { config, loginStatus: 'authenticated' };
  const view = render(<MaintenanceNoticeView {...props} />);
  fireEvent.click(screen.getByText('Understood'));
  view.unmount();
  const next = render(<MaintenanceNoticeView config={config} />);
  next.rerender(<MaintenanceNoticeView {...props} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  next.rerender(
    <MaintenanceNoticeView {...props} loginStatus="unauthenticated" />,
  );
  next.rerender(<MaintenanceNoticeView {...props} />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
test('waits for authentication and cookie consent', () => {
  const view = render(<MaintenanceNoticeView config={config} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  view.rerender(
    <MaintenanceNoticeView
      config={config}
      loginStatus="authenticated"
      blocked
    />,
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  view.rerender(
    <MaintenanceNoticeView config={config} loginStatus="authenticated" />,
  );
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
test('opens and closes at scheduled boundaries without navigation', () => {
  jest.setSystemTime(new Date('2026-10-28T11:59:59-04:00'));
  render(<MaintenanceNoticeView config={config} loginStatus="authenticated" />);
  expect(screen.queryByRole('dialog')).toBeNull();
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(2 * 60 * 60 * 1000));
  expect(screen.queryByRole('dialog')).toBeNull();
});
test.each([
  { ...config, enabled: false },
  { ...config, endsAt: '' },
  { ...config, startsAt: config.endsAt },
])('does not show disabled or invalid windows', (invalid) => {
  render(
    <MaintenanceNoticeView config={invalid} loginStatus="authenticated" />,
  );
  expect(screen.queryByRole('dialog')).toBeNull();
});
