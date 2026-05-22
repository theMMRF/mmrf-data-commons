import { parse, serialize } from 'cookie';
import { activeTermsConfig } from './config';

export const TERMS_ACCEPTANCE_COOKIE_NAME = 'mmrf-terms-accepted-version';

export interface TermsStatus {
  accepted: boolean;
  acceptedVersion?: string;
  activeVersion: string;
}

export const getTermsStatusFromCookie = (cookieHeader?: string): TermsStatus => {
  const cookies = cookieHeader ? parse(cookieHeader) : {};
  const acceptedVersion = cookies[TERMS_ACCEPTANCE_COOKIE_NAME];

  return {
    accepted: acceptedVersion === activeTermsConfig.version,
    acceptedVersion,
    activeVersion: activeTermsConfig.version,
  };
};

export const createTermsAcceptanceCookie = (): string =>
  serialize(TERMS_ACCEPTANCE_COOKIE_NAME, activeTermsConfig.version, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
