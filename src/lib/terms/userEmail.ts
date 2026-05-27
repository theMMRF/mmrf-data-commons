import { decodeJwt } from 'jose';
import { getAccessToken, getLoginStatus } from '@/lib/auth/getLoginStatus';

const getGen3ApiBase = (): string => {
  const apiTarget = process.env.NEXT_PUBLIC_GEN3_API_TARGET?.replace(/\/$/, '');
  if (apiTarget) {
    return apiTarget;
  }

  return process.env.NEXT_PUBLIC_GEN3_API?.replace(/\/$/, '') ?? '';
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
): Promise<Record<string, unknown> | null> => {
  const response = await fetch(`${getGen3ApiBase()}/user/user`, {
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
    const decodedEmail =
      (typeof decoded.email === 'string' && decoded.email) ||
      extractEmailFromUserRecord(
        decoded.context as Record<string, unknown> | undefined,
      ) ||
      extractEmailFromUserRecord(
        (decoded.context as { user?: Record<string, unknown> } | undefined)
          ?.user,
      );

    if (decodedEmail) {
      return {
        email: decodedEmail,
        name:
          fromContextName ||
          (typeof decoded.name === 'string' ? decoded.name : undefined),
      };
    }
  } catch {
    // Fall through to the user profile API.
  }

  const profile = await fetchUserProfile(accessToken);

  return {
    email: extractEmailFromUserRecord(profile),
    name: fromContextName || extractNameFromUserRecord(profile),
  };
};
