import {
  TermsAcceptanceResult,
  TermsStatus,
} from './types';
import { withClientBasePath } from '@/lib/basePath';

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

const fetchCsrfToken = async (): Promise<string | undefined> => {
  try {
    const response = await fetch(withClientBasePath('/_status'), {
      credentials: 'include',
    });

    if (!response.ok) return undefined;

    const body = (await response.json()) as { csrf?: string };
    return body.csrf;
  } catch {
    return undefined;
  }
};

export const fetchTermsStatus = async (): Promise<TermsStatus> => {
  const response = await fetch(withClientBasePath('/api/terms/status'), {
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await parseTermsError(response);
    throw new TermsClientError(
      body.error ?? 'Unable to check terms acceptance status',
      response.status,
    );
  }

  return response.json() as Promise<TermsStatus>;
};

export const acceptActiveTerms = async (
  termsVersionId: number,
): Promise<TermsAcceptanceResult> => {
  const csrfToken = await fetchCsrfToken();
  const response = await fetch(withClientBasePath('/api/terms/accept'), {
    body: JSON.stringify({ termsVersionId }),
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

  return response.json() as Promise<TermsAcceptanceResult>;
};
