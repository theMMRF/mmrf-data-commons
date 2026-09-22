import { NextRequest } from 'next/server';
import { getRouteConfig } from './lib/auth/arboristConfig';
import { getLoginStatus } from './lib/auth/getLoginStatus';
import { fetchArboristResources } from './lib/auth/fetchAuthz';
import { fetchTermsAcceptedFromBff } from './lib/terms/middlewareTermsCheck';
import { middleware } from './middleware-impl';

jest.mock('./lib/auth/arboristConfig', () => ({
  getRouteConfig: jest.fn(),
}));

jest.mock('./lib/auth/getLoginStatus', () => ({
  getAccessToken: jest.fn(),
  getLoginStatus: jest.fn(),
}));

jest.mock('./lib/auth/fetchAuthz', () => ({
  fetchArboristResources: jest.fn(),
}));

jest.mock('./lib/terms/exemptPaths', () => ({
  isExemptFromTermsCheck: jest.fn(() => false),
}));

jest.mock('./lib/terms/middlewareTermsCheck', () => ({
  fetchTermsAcceptedFromBff: jest.fn(),
}));

jest.mock('./lib/terms/referer', () => ({
  getSafeReferer: (referer: string) => referer,
}));

const mockedGetRouteConfig = jest.mocked(getRouteConfig);
const mockedGetLoginStatus = jest.mocked(getLoginStatus);
const mockedFetchTermsAcceptedFromBff = jest.mocked(fetchTermsAcceptedFromBff);

const request = (path: string) =>
  new NextRequest(new URL(path, 'https://virtuallab.themmrf.org'));

describe('middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    Object.assign(process.env, { NODE_ENV: 'development' });
    jest.clearAllMocks();
    mockedGetRouteConfig.mockResolvedValue({
      routes: {
        '*': { loginRequired: false },
      },
    });
    mockedFetchTermsAcceptedFromBff.mockResolvedValue({
      isLoggedIn: false,
      hasAcceptedLatestTerms: true,
    });
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else Object.assign(process.env, { NODE_ENV: originalNodeEnv });
  });

  it.each([
    '/protein-paint/genomes',
    '/protein-paint/termdb?getroot=1',
    '/api/protein-paint/termdb',
    '/analysis/v0/cases',
    '/guppy/graphql',
  ])(
    'leaves development data authorization to the backend for %s',
    async (path) => {
      const response = await middleware(request(path));

      expect(response.headers.get('x-middleware-next')).toBe('1');
      expect(mockedGetLoginStatus).not.toHaveBeenCalled();
      expect(mockedFetchTermsAcceptedFromBff).not.toHaveBeenCalled();
      expect(mockedGetRouteConfig).not.toHaveBeenCalled();
      expect(fetchArboristResources).not.toHaveBeenCalled();
    },
  );

  it.each([
    '/',
    '/DataLibrary',
    '/protein-paint-other',
    '/api/protein-paint-other',
    '/analysis/v01',
    '/guppy-other',
  ])(
    'still enforces terms acceptance on page routes and similar prefixes: %s',
    async (path) => {
      mockedGetLoginStatus.mockResolvedValue({ status: 'issued' });
      mockedFetchTermsAcceptedFromBff.mockResolvedValue({
        isLoggedIn: true,
        hasAcceptedLatestTerms: false,
      });
      const response = await middleware(request(path));
      expect(new URL(response.headers.get('location')!).pathname).toBe(
        '/TermsAcceptance',
      );
    },
  );

  it('does not change production middleware behavior', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    mockedGetLoginStatus.mockResolvedValue({ status: 'issued' });
    mockedFetchTermsAcceptedFromBff.mockResolvedValue({
      isLoggedIn: true,
      hasAcceptedLatestTerms: false,
    });
    const response = await middleware(request('/protein-paint/termdb'));
    expect(new URL(response.headers.get('location')!).pathname).toBe(
      '/TermsAcceptance',
    );
  });

  it('redirects unauthenticated root requests to the redesigned login landing page', async () => {
    mockedGetLoginStatus.mockResolvedValue({ status: 'not present' });

    const response = await middleware(request('/'));

    expect(response?.headers.get('location')).toBe(
      'https://virtuallab.themmrf.org/Login?referer=%2F',
    );
  });

  it('preserves the root analysis page for authenticated users', async () => {
    mockedGetLoginStatus.mockResolvedValue({ status: 'issued' });
    mockedFetchTermsAcceptedFromBff.mockResolvedValue({
      isLoggedIn: true,
      hasAcceptedLatestTerms: true,
    });

    const response = await middleware(request('/'));

    expect(response?.headers.get('location')).toBeNull();
    expect(mockedGetLoginStatus).toHaveBeenCalledTimes(1);
    expect(mockedFetchTermsAcceptedFromBff).toHaveBeenCalledWith(
      expect.any(NextRequest),
      { status: 'issued' },
    );
  });

  it('checks latest terms again on the next navigation', async () => {
    mockedGetLoginStatus.mockResolvedValue({ status: 'issued' });
    mockedFetchTermsAcceptedFromBff
      .mockResolvedValueOnce({ isLoggedIn: true, hasAcceptedLatestTerms: true })
      .mockResolvedValueOnce({
        isLoggedIn: true,
        hasAcceptedLatestTerms: false,
      });
    expect((await middleware(request('/'))).headers.get('location')).toBeNull();
    const next = await middleware(request('/?app=ProteinPaint'));
    expect(new URL(next.headers.get('location')!).pathname).toBe(
      '/TermsAcceptance',
    );
    expect(mockedFetchTermsAcceptedFromBff).toHaveBeenCalledTimes(2);
  });

  it('redirects to login when the terms API rejects the session', async () => {
    mockedGetLoginStatus.mockResolvedValue({ status: 'issued' });
    mockedFetchTermsAcceptedFromBff.mockResolvedValue({
      isLoggedIn: false,
      hasAcceptedLatestTerms: true,
    });
    const response = await middleware(request('/?app=ProteinPaint'));
    expect(new URL(response.headers.get('location')!).pathname).toBe('/Login');
  });
});
