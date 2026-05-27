import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccessToken, getLoginStatus } from '@/lib/auth/getLoginStatus';
import { fetchTermsStatus } from '@/lib/terms/termsService';
import { TermsApiError } from '@/lib/terms/types';
import { resolveUserIdentity } from '@/lib/terms/userEmail';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const loginStatus = await getLoginStatus(req.headers.cookie);

  if (loginStatus.status !== 'issued') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const accessToken = getAccessToken(req.headers.cookie);

  if (!accessToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const identity = await resolveUserIdentity(req.headers.cookie);

  if (!identity.email) {
    return res.status(401).json({
      error:
        'Unable to determine the authenticated user email for terms acceptance',
    });
  }

  try {
    const status = await fetchTermsStatus(accessToken, identity);

    return res.status(200).json({
      ...status,
      user: loginStatus.userContext,
    });
  } catch (error) {
    if (error instanceof TermsApiError) {
      return res.status(error.status).json({
        error: error.detail ?? error.message,
      });
    }

    console.error('terms status API error:', error);
    return res.status(503).json({ error: 'Unable to check terms acceptance status' });
  }
}
