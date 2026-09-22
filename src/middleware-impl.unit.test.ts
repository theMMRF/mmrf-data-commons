import { NextRequest } from 'next/server';
import { getRouteConfig } from './lib/auth/arboristConfig';
import { getLoginStatus } from './lib/auth/getLoginStatus';
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
  beforeEach(() => {
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
