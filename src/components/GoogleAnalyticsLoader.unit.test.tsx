import React, { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import {
  selectUserAuthStatus,
  selectUserDetails,
  type Gen3User,
  type LoginStatus,
} from '@gen3/core';
import GoogleAnalyticsLoader, {
  GA_PLACEHOLDER_LOG_MESSAGE,
} from './GoogleAnalyticsLoader';

jest.mock('@gen3/core', () => ({
  selectUserAuthStatus: jest.fn(),
  selectUserDetails: jest.fn(),
  useCoreSelector: (selector: () => unknown) => selector(),
}));

jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ src }: { src: string }) => (
    <div data-testid="google-tag" data-src={src} />
  ),
}));

const measurementId = 'G-TEST123';
const setIdentity = (status: LoginStatus, profile: Gen3User = {}) => {
  jest.mocked(selectUserAuthStatus).mockReturnValue(status);
  jest.mocked(selectUserDetails).mockReturnValue(profile);
};
const commands = () =>
  (window.dataLayer ?? []).map((command) => Array.from(command as IArguments));
const loader = (enabled = true) => (
  <GoogleAnalyticsLoader enabled={enabled} gaMeasurementId={measurementId} />
);

beforeEach(() => {
  jest.clearAllMocks();
  delete window.dataLayer;
  delete window.gtag;
  delete window.__mmrfGaMeasurementId;
  delete window.__mmrfGaUserId;
  delete window.__mmrfGaPlaceholderLogged;
  delete window[`ga-disable-${measurementId}`];
  setIdentity('unauthenticated');
});

test('does not load or queue Analytics before cookie consent', () => {
  setIdentity('authenticated', { user_id: 42 });
  render(loader(false));
  expect(screen.queryByTestId('google-tag')).not.toBeInTheDocument();
  expect(commands()).toEqual([]);
});

test('waits for login resolution and sets the account ID before the first page view', () => {
  setIdentity('not present');
  const view = render(loader());
  expect(screen.queryByTestId('google-tag')).not.toBeInTheDocument();
  expect(commands()).toEqual([]);

  setIdentity('pending');
  view.rerender(loader());
  expect(commands()).toEqual([]);

  setIdentity('authenticated', {
    user_id: 42,
    email: 'researcher@example.org',
    username: 'researcher@example.org',
    display_name: 'Example Researcher',
  });
  view.rerender(loader());
  expect(commands()).toEqual([
    ['js', expect.any(Date)],
    ['set', { user_id: 'fence-42' }],
    ['config', measurementId],
  ]);
  expect(screen.getByTestId('google-tag')).toHaveAttribute(
    'data-src',
    `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
  );
});

test('tracks public visitors anonymously, then updates login, account switch, and logout without extra page views', () => {
  const view = render(loader());
  expect(commands()).toEqual([
    ['js', expect.any(Date)],
    ['config', measurementId],
  ]);

  setIdentity('authenticated', { user_id: 42 });
  view.rerender(loader());
  expect(commands().at(-1)).toEqual(['set', { user_id: 'fence-42' }]);

  setIdentity('pending', { user_id: 42 });
  view.rerender(loader());
  expect(commands()).toHaveLength(3);
  setIdentity('authenticated', { user_id: 42 });
  view.rerender(loader());
  expect(commands()).toHaveLength(3);

  setIdentity('authenticated', { user_id: 57 });
  view.rerender(loader());
  expect(commands().at(-1)).toEqual(['set', { user_id: 'fence-57' }]);

  // Cached profile data must not keep an ID after authentication ends.
  setIdentity('unauthenticated', { user_id: 57 });
  view.rerender(loader());
  expect(commands().at(-1)).toEqual(['set', { user_id: null }]);
  expect(commands().filter(([command]) => command === 'config')).toHaveLength(
    1,
  );
});

test('uses the same account ID across fresh browser contexts and supports Fence id', () => {
  setIdentity('authenticated', { id: 42 });
  const view = render(loader());
  const firstId = commands()[1];
  view.unmount();
  delete window.dataLayer;
  delete window.gtag;
  delete window.__mmrfGaMeasurementId;
  delete window.__mmrfGaUserId;
  render(loader());
  expect(commands()[1]).toEqual(firstId);
  expect(firstId).toEqual(['set', { user_id: 'fence-42' }]);
});

test.each([undefined, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  'does not substitute identifying profile fields for an invalid account ID (%s)',
  (user_id) => {
    setIdentity('authenticated', {
      user_id,
      email: 'researcher@example.org',
      username: 'researcher@example.org',
      sub: 'researcher@example.org',
    });
    render(loader());
    expect(commands()).toEqual([
      ['js', expect.any(Date)],
      ['config', measurementId],
    ]);
  },
);

test('does not duplicate initialization on StrictMode effects or a component remount', () => {
  setIdentity('authenticated', { user_id: 42 });
  const view = render(<StrictMode>{loader()}</StrictMode>);
  expect(commands()).toHaveLength(3);
  view.unmount();
  render(loader());
  expect(commands()).toHaveLength(3);
});

test('disables an already loaded tag and clears identity when consent is withdrawn', () => {
  setIdentity('authenticated', { user_id: 42 });
  const view = render(loader());
  view.rerender(loader(false));
  expect(window[`ga-disable-${measurementId}`]).toBe(true);
  expect(commands().at(-1)).toEqual(['set', { user_id: null }]);
  expect(screen.queryByTestId('google-tag')).not.toBeInTheDocument();

  view.rerender(loader());
  expect(window[`ga-disable-${measurementId}`]).toBe(false);
  expect(commands().at(-1)).toEqual(['set', { user_id: 'fence-42' }]);
  expect(commands().filter(([command]) => command === 'config')).toHaveLength(
    1,
  );
});

test('keeps the no-measurement-ID placeholder without loading Analytics', () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  render(<GoogleAnalyticsLoader enabled />);
  expect(log).toHaveBeenCalledWith(GA_PLACEHOLDER_LOG_MESSAGE);
  expect(screen.queryByTestId('google-tag')).not.toBeInTheDocument();
  expect(commands()).toEqual([]);
  log.mockRestore();
});
