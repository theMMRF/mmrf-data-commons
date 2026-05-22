import { activeTermsConfig } from './config';
import type { TermsStatus } from './placeholderTermsService';

export const fetchTermsStatus = async (): Promise<TermsStatus> => {
  const response = await fetch('/api/terms/status');

  if (!response.ok) {
    throw new Error('Unable to check terms acceptance status');
  }

  return response.json() as Promise<TermsStatus>;
};

export const acceptActiveTerms = async (): Promise<TermsStatus> => {
  const response = await fetch('/api/terms/accept', {
    body: JSON.stringify({ termsVersion: activeTermsConfig.version }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Unable to record terms acceptance');
  }

  return response.json() as Promise<TermsStatus>;
};
