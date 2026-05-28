import {
  mapTermsAcceptanceResponse,
  mapTermsStatusResponse,
  type ApiTermsAcceptanceResponse,
  type ApiTermsStatusResponse,
  TermsAcceptanceResult,
  TermsStatus,
} from './types';

export class TermsClientError extends Error {
  status: number;

  currentTerms?: TermsStatus['currentTerms'];

  constructor(
    message: string,
    status: number,
    currentTerms?: TermsStatus['currentTerms'],
  ) {
    super(message);
    this.name = 'TermsClientError';
    this.status = status;
    this.currentTerms = currentTerms;
  }
}

const getClientTermsApiBase = (): string => {
  const configured = process.env.NEXT_PUBLIC_GEN3_ANALYSIS_API
    ?.trim()
    .replace(/\/$/, '');

  return configured || '/analysis/v0';
};

const getCookieValue = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [rawKey, ...rawValue] = cookie.split('=');
    if (rawKey?.trim() === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return undefined;
};

const ensureCsrfToken = async (): Promise<string | undefined> => {
  const existingToken = getCookieValue('csrftoken');
  if (existingToken) return existingToken;

  await fetch('/_status', {
    credentials: 'include',
  }).catch(() => undefined);

  return getCookieValue('csrftoken');
};

const parseTermsError = async (
  response: Response,
): Promise<{ error?: string; currentTerms?: TermsStatus['currentTerms'] }> => {
  try {
    const body = (await response.json()) as {
      currentTerms?: TermsStatus['currentTerms'];
      detail?: string | { msg?: string }[];
      error?: string;
    };

    if (typeof body.error === 'string') {
      return { currentTerms: body.currentTerms, error: body.error };
    }
    if (typeof body.detail === 'string') {
      return { currentTerms: body.currentTerms, error: body.detail };
    }
    if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      return { currentTerms: body.currentTerms, error: body.detail[0].msg };
    }

    return { currentTerms: body.currentTerms };
  } catch {
    return {};
  }
};

export const fetchTermsStatus = async (): Promise<TermsStatus> => {
  const response = await fetch(`${getClientTermsApiBase()}/terms/status`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await parseTermsError(response);
    throw new TermsClientError(
      body.error ?? 'Unable to check terms acceptance status',
      response.status,
    );
  }

  return mapTermsStatusResponse((await response.json()) as ApiTermsStatusResponse);
};

export const acceptActiveTerms = async (
  termsVersionId: number,
): Promise<TermsAcceptanceResult> => {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(`${getClientTermsApiBase()}/terms/acceptances`, {
    body: JSON.stringify({ terms_version_id: termsVersionId }),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    method: 'POST',
  });

  if (!response.ok) {
    const body = await parseTermsError(response);

    throw new TermsClientError(
      body.error ??
        (response.status === 409
          ? 'The terms were updated while you were reviewing them. Please review the latest version and accept again.'
          : 'Unable to record terms acceptance'),
      response.status,
      body.currentTerms,
    );
  }

  return mapTermsAcceptanceResponse(
    (await response.json()) as ApiTermsAcceptanceResponse,
  );
};
