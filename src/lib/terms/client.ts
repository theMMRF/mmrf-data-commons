import { withClientBasePath } from '@/lib/basePath';
import type {
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

export const fetchTermsStatus = async (): Promise<TermsStatus> => {
  const response = await fetch(withClientBasePath('/api/terms/status'), {
    credentials: 'include',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
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
  const response = await fetch(withClientBasePath('/api/terms/accept'), {
    body: JSON.stringify({ termsVersionId }),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      currentTerms?: TermsStatus['currentTerms'];
    };

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
