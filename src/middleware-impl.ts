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
import { getSafeReferer } from './lib/terms/referer';
import { getTermsGateResult } from './lib/terms/termsService';

const WILDCARD_ROUTE_KEY = '*';

function getRouteRuleForPath(pathname: string, routeConfig: RouteConfig) {
  return routeConfig?.[pathname] ?? routeConfig?.[WILDCARD_ROUTE_KEY];
}

function isLoggedIn(loginStatus: LoginStatus) {
  return loginStatus.status === 'issued';
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (!isExemptFromTermsCheck(pathname)) {
    const cookieHeader = req.headers.get('Cookie') || '';
    const loginStatus = await getLoginStatus(cookieHeader);

    if (loginStatus.status === 'issued') {
      const termsGate = await getTermsGateResult(cookieHeader);

      if (!termsGate.hasAcceptedLatestTerms) {
        const termsUrl = new URL('/TermsAcceptance', req.url);
        termsUrl.searchParams.set(
          'referer',
          getSafeReferer(`${pathname}${req.nextUrl.search}`),
        );
        return NextResponse.redirect(termsUrl);
      }
    }
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

  const loginStatus = await getLoginStatus(req.headers.get('Cookie') || '');
  const loggedIn = await isLoggedIn(loginStatus);

  if (loginRequired && !loggedIn) {
    const loginUrl = new URL('/Login', req.url);
    loginUrl.searchParams.set('referer', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!needsAuthz) {
    return NextResponse.next();
  }

  if (!loggedIn) {
    const loginUrl = new URL('/Login', req.url);
    loginUrl.searchParams.set('referer', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const tokenFromCookie =
    getAccessToken(req.headers.get('Cookie') || '') ?? null;

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
