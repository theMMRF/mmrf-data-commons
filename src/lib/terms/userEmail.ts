import { decodeJwt } from 'jose';
import { GEN3_API } from '@gen3/core/server';
import { getAccessToken, getLoginStatus } from '@/lib/auth/getLoginStatus';
import { buildAbsoluteGen3Url } from './requestOrigin';

const normalizeBase = (value?: string): string | undefined => {
  const normalized = value?.trim().replace(/\/$/, '');
  if (!normalized?.startsWith('http')) {
    return undefined;
  }

  return normalized;
};

const extractEmailFromUserRecord = (
  user?: Record<string, unknown> | null,
): string | undefined => {
  if (!user) {
    return undefined;
  }

  const candidates = [
    user.email,
    user.username,
    user.preferred_email,
    user.preferred_username,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
};

const extractNameFromUserRecord = (
  user?: Record<string, unknown> | null,
): string | undefined => {
  if (!user) {
    return undefined;
  }

  const candidates = [user.display_name, user.name, user.username];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
};

export interface ResolvedUserIdentity {
  email?: string;
  name?: string;
}

export const fetchUserProfile = async (
  accessToken: string,
  requestOrigin?: string,
): Promise<Record<string, unknown> | null> => {
  const gen3ApiBase = normalizeBase(typeof GEN3_API === 'string' ? GEN3_API : undefined);
  const profileUrl =
    buildAbsoluteGen3Url('/user/user', requestOrigin) ??
    (gen3ApiBase ? `${gen3ApiBase}/user/user` : undefined);

  if (!profileUrl) {
    return null;
  }

  const response = await fetch(profileUrl, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as Record<string, unknown>;
};

export const resolveUserIdentity = async (
  cookieHeader?: string,
  requestOrigin?: string,
): Promise<ResolvedUserIdentity> => {
  const loginStatus = await getLoginStatus(cookieHeader);
  const fromContextEmail = extractEmailFromUserRecord(loginStatus.userContext);
  const fromContextName = extractNameFromUserRecord(loginStatus.userContext);

  if (fromContextEmail) {
    return {
      email: fromContextEmail,
      name: fromContextName,
    };
  }

  const accessToken = getAccessToken(cookieHeader);

  if (!accessToken) {
    return {};
  }

  try {
    const decoded = decodeJwt(accessToken) as Record<string, unknown>;
    const contextUser = (
      decoded.context as { user?: Record<string, unknown> } | undefined
    )?.user;

    const decodedEmail =
      (typeof decoded.email === 'string' && decoded.email) ||
      (typeof decoded.preferred_username === 'string' &&
        decoded.preferred_username) ||
      extractEmailFromUserRecord(contextUser);

    if (decodedEmail) {
      return {
        email: decodedEmail,
        name:
          fromContextName ||
          (typeof decoded.name === 'string' ? decoded.name : undefined) ||
          extractNameFromUserRecord(contextUser),
      };
    }
  } catch {
    // Fall through to the user profile API.
  }

  const profile = await fetchUserProfile(accessToken, requestOrigin);

  return {
    email: extractEmailFromUserRecord(profile),
    name: fromContextName || extractNameFromUserRecord(profile),
  };
};
