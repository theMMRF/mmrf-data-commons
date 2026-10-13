import { NextRequest } from 'next/server';
import { getRouteConfig } from './lib/auth/arboristConfig';
import { getLoginStatus } from './lib/auth/getLoginStatus';
import { fetchArboristResources } from './lib/auth/fetchAuthz';
import { fetchTermsAcceptedFromBff } from './lib/terms/middlewareTermsCheck';
import { middleware } from './middleware-impl';
import defaultAuthzConfig from '../config/authz_default.json';
import gen3AuthzConfig from '../config/gen3/authz.json';

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
    if (originalNodeEnv === undefined)
      Reflect.deleteProperty(process.env, 'NODE_ENV');
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

describe.each([
  ['fallback', defaultAuthzConfig],
  ['gen3', gen3AuthzConfig],
])('%s protected route configuration', (_name, config) => {
  const protectedPaths = [
    '/cases/da99c99c-6c34-46d0-96a9-c11f5865c455?bioId=sample-1',
    '/files/file-1',
    '/projects/MMRF-COMMPASS-IA24',
    '/genes/ENSG00000141510',
    '/ssms/mutation-1',
    '/app/ProteinPaint',
    '/cart',
    '/DataLibrary',
    '/Discovery',
    '/Workspace',
    '/Profile',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetRouteConfig.mockResolvedValue(config);
    mockedFetchTermsAcceptedFromBff.mockResolvedValue({
      isLoggedIn: true,
      hasAcceptedLatestTerms: true,
    });
  });

  it.each(protectedPaths)(
    'redirects missing, expired, and invalid sessions to login for %s',
    async (path) => {
      for (const status of ['not present', 'expired', 'invalid'] as const) {
        mockedGetLoginStatus.mockResolvedValue({ status });
        const response = await middleware(request(path));
        const location = new URL(response.headers.get('location')!);
        expect(location.pathname).toBe('/Login');
        expect(location.searchParams.get('referer')).toBe(path);
      }
      expect(mockedFetchTermsAcceptedFromBff).not.toHaveBeenCalled();
      expect(fetchArboristResources).not.toHaveBeenCalled();
    },
  );

  it.each(protectedPaths)('allows valid sessions on %s', async (path) => {
    mockedGetLoginStatus.mockResolvedValue({ status: 'issued' });
    const response = await middleware(request(path));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedGetLoginStatus).toHaveBeenCalledTimes(1);
    expect(mockedFetchTermsAcceptedFromBff).toHaveBeenCalledTimes(1);
  });

  it.each([
    '/DataDictionary',
    '/404',
    '/cases-other/example',
    '/cases',
    '/cases/',
    '/cases/example/extra',
  ])('preserves the public fallback for unmatched paths: %s', async (path) => {
    mockedGetLoginStatus.mockResolvedValue({ status: 'not present' });
    expect(
      (await middleware(request(path))).headers.get('x-middleware-next'),
    ).toBe('1');
  });

  it('gives exact rules precedence over dynamic page rules', async () => {
    mockedGetLoginStatus.mockResolvedValue({ status: 'not present' });
    mockedGetRouteConfig.mockResolvedValue({
      routes: {
        ...config.routes,
        '/cases/public-example': { loginRequired: false },
      },
    });
    expect(
      (await middleware(request('/cases/public-example'))).headers.get(
        'x-middleware-next',
      ),
    ).toBe('1');
  });

  it('still enforces terms on authenticated case pages', async () => {
    mockedGetLoginStatus.mockResolvedValue({ status: 'issued' });
    mockedFetchTermsAcceptedFromBff.mockResolvedValue({
      isLoggedIn: true,
      hasAcceptedLatestTerms: false,
    });
    const path = protectedPaths[0];
    const location = new URL(
      (await middleware(request(path))).headers.get('location')!,
    );
    expect(location.pathname).toBe('/TermsAcceptance');
    expect(location.searchParams.get('referer')).toBe(path);
  });

  it('enforces authorization on dynamic route rules', async () => {
    mockedGetLoginStatus.mockResolvedValue({ status: 'issued' });
    mockedGetRouteConfig.mockResolvedValue({
      routes: {
        ...config.routes,
        '/cases/[caseId]': { loginRequired: true, authz: ['/case-access'] },
      },
    });
    jest.mocked(fetchArboristResources).mockResolvedValue([]);
    const response = await middleware(request('/cases/example'));
    expect(new URL(response.headers.get('location')!).pathname).toBe('/403');
  });
});
