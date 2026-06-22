import { NextRequest, NextResponse } from 'next/server';
import { getRouteConfig } from './lib/auth/arboristConfig';
import {
  getAccessToken,
  getLoginStatus,
  type LoginStatus,
} from './lib/auth/getLoginStatus';
import { fetchArboristResources } from './lib/auth/fetchAuthz';
import { RouteConfig } from '@gen3/frontend/server';
import { isExemptFromTermsCheck } from './lib/terms/exemptPaths';
import { fetchTermsAcceptedFromBff } from './lib/terms/middlewareTermsCheck';
import { getSafeReferer } from './lib/terms/referer';

const WILDCARD_ROUTE_KEY = '*';
const ROOT_PATH = '/';

function getRouteRuleForPath(pathname: string, routeConfig: RouteConfig) {
  return routeConfig?.[pathname] ?? routeConfig?.[WILDCARD_ROUTE_KEY];
}

function isLoggedIn(loginStatus: LoginStatus) {
  return loginStatus.status === 'issued';
}

function getPathWithSearch(req: NextRequest) {
  return `${req.nextUrl.pathname}${req.nextUrl.search}`;
}

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/Login', req.url);
  loginUrl.searchParams.set('referer', getPathWithSearch(req));
  return NextResponse.redirect(loginUrl);
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const cookieHeader = req.headers.get('Cookie') || '';
  let loginStatus: LoginStatus | null = null;

  const getRequestLoginStatus = async () => {
    loginStatus ??= await getLoginStatus(cookieHeader);
    return loginStatus;
  };

  if (!isExemptFromTermsCheck(pathname)) {
    const loginStatus = await getRequestLoginStatus();

    if (loginStatus.status === 'issued') {
      const termsGate = await fetchTermsAcceptedFromBff(req);

      if (termsGate.isLoggedIn && !termsGate.hasAcceptedLatestTerms) {
        const termsUrl = new URL('/TermsAcceptance', req.url);
        termsUrl.searchParams.set(
          'referer',
          getSafeReferer(`${pathname}${req.nextUrl.search}`),
        );
        return NextResponse.redirect(termsUrl);
      }
    }
  }

  const currentLoginStatus = await getRequestLoginStatus();
  const loggedIn = isLoggedIn(currentLoginStatus);

  if (pathname === ROOT_PATH && !loggedIn) {
    return redirectToLogin(req);
  }

  const { routes: routeConfig } = await getRouteConfig();
  let rule = getRouteRuleForPath(pathname, routeConfig);

  if (!rule) {
    rule = getRouteRuleForPath('*', routeConfig);
  }

  if (!rule) {
    return NextResponse.next();
  }

  const loginRequired = rule.loginRequired ?? true;
  const needsAuthz = Array.isArray(rule?.authz) && rule?.authz.length > 0;

  if (loginRequired && !loggedIn) {
    return redirectToLogin(req);
  }

  if (!needsAuthz) {
    return NextResponse.next();
  }

  if (!loggedIn) {
    return redirectToLogin(req);
  }

  const tokenFromCookie = getAccessToken(cookieHeader) ?? null;

  const resources = await fetchArboristResources(
    tokenFromCookie,
    process.env.NODE_ENV === 'production',
  );

  const allowed = rule?.authz!.some((needed) => resources.includes(needed));
  if (!allowed) {
    return NextResponse.redirect(new URL('/403', req.url));
  }

  return NextResponse.next();
}
