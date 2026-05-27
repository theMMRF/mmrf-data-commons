import type { NextRequest } from 'next/server';
import { getLoginStatus } from '@/lib/auth/getLoginStatus';

interface MiddlewareTermsCheckResult {
  hasAcceptedLatestTerms: boolean;
  isLoggedIn: boolean;
}

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

  try {
    const statusUrl = req.nextUrl.clone();
    statusUrl.pathname = `${req.nextUrl.basePath}/api/terms/status`;
    statusUrl.search = '';

    const response = await fetch(statusUrl, {
      cache: 'no-store',
      headers: {
        cookie: cookieHeader,
      },
    });

    if (response.status === 401) {
      return {
        hasAcceptedLatestTerms: true,
        isLoggedIn: false,
      };
    }

    if (!response.ok) {
      console.error(
        'terms middleware BFF check failed:',
        response.status,
        await response.text(),
      );
      return {
        hasAcceptedLatestTerms: false,
        isLoggedIn: true,
      };
    }

    const data = (await response.json()) as {
      hasAcceptedLatestTerms?: boolean;
    };

    return {
      hasAcceptedLatestTerms: Boolean(data.hasAcceptedLatestTerms),
      isLoggedIn: true,
    };
  } catch (error) {
    console.error('terms middleware BFF check failed:', error);
    return {
      hasAcceptedLatestTerms: false,
      isLoggedIn: true,
    };
  }
};
