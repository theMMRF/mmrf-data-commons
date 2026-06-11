import type { NextRequest } from 'next/server';
import { getLoginStatus } from '@/lib/auth/getLoginStatus';

interface MiddlewareTermsCheckResult {
  hasAcceptedLatestTerms: boolean;
  isLoggedIn: boolean;
}

const getHeaderValue = (
  req: NextRequest,
  headerName: string,
  fallback?: string,
): string | undefined => req.headers.get(headerName) ?? fallback;

const getLocalBffOrigin = (): string => {
  const configuredOrigin = process.env.TERMS_BFF_ORIGIN?.replace(/\/$/, '');

  if (configuredOrigin?.startsWith('http')) {
    return configuredOrigin;
  }

  return `http://127.0.0.1:${process.env.PORT || '3000'}`;
};

const getTermsStatusUrls = (req: NextRequest): URL[] => {
  const pathname = `${req.nextUrl.basePath}/api/terms/status`;
  const localUrl = new URL(pathname, getLocalBffOrigin());
  const requestUrl = req.nextUrl.clone();
  requestUrl.pathname = pathname;
  requestUrl.search = '';

  if (localUrl.toString() === requestUrl.toString()) {
    return [localUrl];
  }

  return [localUrl, requestUrl];
};

/**
 * Edge-safe terms gate: delegates to the Next.js BFF route instead of calling
 * gen3-analysis directly from middleware.
 */
export const fetchTermsAcceptedFromBff = async (
  req: NextRequest,
): Promise<MiddlewareTermsCheckResult> => {
  const cookieHeader = req.headers.get('Cookie') || '';
  const loginStatus = await getLoginStatus(cookieHeader);

  if (loginStatus.status !== 'issued') {
    return {
      hasAcceptedLatestTerms: true,
      isLoggedIn: false,
    };
  }

  const forwardedHost = getHeaderValue(
    req,
    'x-forwarded-host',
    getHeaderValue(req, 'host', req.nextUrl.host),
  );
  const forwardedProto = getHeaderValue(
    req,
    'x-forwarded-proto',
    req.nextUrl.protocol.replace(':', ''),
  );
  let lastError: unknown;

  for (const statusUrl of getTermsStatusUrls(req)) {
    try {
      const response = await fetch(statusUrl, {
        cache: 'no-store',
        headers: {
          cookie: cookieHeader,
          ...(forwardedHost ? { 'x-forwarded-host': forwardedHost } : {}),
          ...(forwardedProto ? { 'x-forwarded-proto': forwardedProto } : {}),
        },
      });

      if (response.status === 401) {
        return {
          hasAcceptedLatestTerms: true,
          isLoggedIn: false,
        };
      }

      if (!response.ok) {
        lastError = `${response.status} ${await response.text()}`;
        continue;
      }

      const data = (await response.json()) as {
        hasAcceptedLatestTerms?: boolean;
      };

      return {
        hasAcceptedLatestTerms: Boolean(data.hasAcceptedLatestTerms),
        isLoggedIn: true,
      };
    } catch (error) {
      lastError = error;
    }
  }

  console.error('terms middleware BFF check failed:', lastError);
  return {
    hasAcceptedLatestTerms: false,
    isLoggedIn: true,
  };
};
