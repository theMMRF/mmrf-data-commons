import { getGen3AnalysisApiUrl } from './analysisApiUrl';
import { getAccessToken, getLoginStatus } from '@/lib/auth/getLoginStatus';
import {
  mapTermsAcceptanceResponse,
  mapTermsStatusResponse,
  mapTermsVersion,
  TermsAcceptanceResult,
  TermsApiError,
  TermsGateResult,
  TermsStatus,
  TermsVersion,
  type ApiTermsStatusResponse,
  type ApiTermsVersionResponse,
} from './types';
import { resolveUserIdentity, type ResolvedUserIdentity } from './userEmail';

const requireTermsApiBase = (requestOrigin?: string): string => {
  const base = getGen3AnalysisApiUrl(requestOrigin);

  if (!base) {
    throw new TermsApiError(
      'Unable to resolve terms API URL',
      503,
      'Unable to resolve terms API URL',
    );
  }

  return base;
};

const buildAuthHeaders = (
  accessToken: string,
  identity?: ResolvedUserIdentity,
): Record<string, string> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  if (identity?.email) {
    headers['X-User-Email'] = identity.email;
  }

  if (identity?.name) {
    headers['X-User-Name'] = identity.name;
  }

  return headers;
};

const parseErrorDetail = async (response: Response): Promise<string | undefined> => {
  try {
    const body = (await response.json()) as { detail?: string | { msg?: string }[] };
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      return body.detail[0].msg;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export const fetchTermsStatus = async (
  accessToken: string,
  identity?: ResolvedUserIdentity,
  requestOrigin?: string,
): Promise<TermsStatus> => {
  const response = await fetch(`${requireTermsApiBase(requestOrigin)}/terms/status`, {
    cache: 'no-store',
    headers: buildAuthHeaders(accessToken, identity),
  });

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new TermsApiError(
      detail ?? 'Unable to check terms acceptance status',
      response.status,
      detail,
    );
  }

  const data = (await response.json()) as ApiTermsStatusResponse;
  return mapTermsStatusResponse(data);
};

export const fetchCurrentTerms = async (
  requestOrigin?: string,
): Promise<TermsVersion> => {
  const response = await fetch(`${requireTermsApiBase(requestOrigin)}/terms/current`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new TermsApiError(
      detail ?? 'Unable to load current terms',
      response.status,
      detail,
    );
  }

  const data = (await response.json()) as ApiTermsVersionResponse;
  return mapTermsVersion(data);
};

/**
 * Records acceptance in gen3-analysis `terms_acceptances` (email, user_id, name,
 * terms_version_id, accepted_at). Audit example:
 *   select ta.email, ta.name, tv.version, ta.accepted_at
 *   from terms_acceptances ta join terms_versions tv on tv.id = ta.terms_version_id;
 */
export const acceptTerms = async (
  accessToken: string,
  termsVersionId: number,
  identity?: ResolvedUserIdentity,
  requestOrigin?: string,
): Promise<TermsAcceptanceResult> => {
  const response = await fetch(`${requireTermsApiBase(requestOrigin)}/terms/acceptances`, {
    body: JSON.stringify({ terms_version_id: termsVersionId }),
    cache: 'no-store',
    headers: {
      ...buildAuthHeaders(accessToken, identity),
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (response.status === 409) {
    const detail = await parseErrorDetail(response);
    let currentTerms: TermsVersion | undefined;

    try {
      currentTerms = await fetchCurrentTerms(requestOrigin);
    } catch {
      currentTerms = undefined;
    }

    throw new TermsApiError(
      detail ?? 'Submitted terms version is no longer current',
      response.status,
      detail,
      currentTerms,
    );
  }

  if (!response.ok) {
    const detail = await parseErrorDetail(response);
    throw new TermsApiError(
      detail ?? 'Unable to record terms acceptance',
      response.status,
      detail,
    );
  }

  const data = await response.json();
  return mapTermsAcceptanceResponse(data);
};

export const getTermsGateResult = async (
  cookieHeader?: string,
  requestOrigin?: string,
): Promise<TermsGateResult> => {
  const loginStatus = await getLoginStatus(cookieHeader);

  if (loginStatus.status !== 'issued') {
    return {
      isLoggedIn: false,
      hasAcceptedLatestTerms: true,
    };
  }

  const accessToken = getAccessToken(cookieHeader);

  if (!accessToken) {
    return {
      isLoggedIn: true,
      hasAcceptedLatestTerms: false,
      error: 'Missing access token',
    };
  }

  const identity = await resolveUserIdentity(cookieHeader, requestOrigin);

  try {
    const status = await fetchTermsStatus(accessToken, identity, requestOrigin);

    return {
      currentTerms: status.currentTerms,
      hasAcceptedLatestTerms: status.hasAcceptedLatestTerms,
      isLoggedIn: true,
    };
  } catch (error) {
    let currentTerms: TermsVersion | undefined;

    try {
      currentTerms = await fetchCurrentTerms(requestOrigin);
    } catch {
      currentTerms = undefined;
    }

    const message =
      error instanceof TermsApiError
        ? error.detail ?? error.message
        : error instanceof Error
          ? error.message
          : 'Unable to verify terms acceptance';

    return {
      currentTerms,
      error: message,
      hasAcceptedLatestTerms: false,
      isLoggedIn: true,
    };
  }
};
