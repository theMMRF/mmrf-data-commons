import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccessToken, getLoginStatus } from '@/lib/auth/getLoginStatus';
import { acceptTerms } from '@/lib/terms/termsService';
import { TermsApiError } from '@/lib/terms/types';
import { getRequestOriginFromApiRequest } from '@/lib/terms/requestOrigin';
import { resolveUserIdentity } from '@/lib/terms/userEmail';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestOrigin = getRequestOriginFromApiRequest(req);
  const loginStatus = await getLoginStatus(req.headers.cookie);

  if (loginStatus.status !== 'issued') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const accessToken = getAccessToken(req.headers.cookie);

  if (!accessToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const identity = await resolveUserIdentity(req.headers.cookie, requestOrigin);

  if (!identity.email) {
    return res.status(401).json({
      error:
        'Unable to determine the authenticated user email for terms acceptance',
    });
  }

  const termsVersionId =
    typeof req.body?.termsVersionId === 'number'
      ? req.body.termsVersionId
      : typeof req.body?.termsVersionId === 'string'
        ? Number.parseInt(req.body.termsVersionId, 10)
        : NaN;

  if (!Number.isFinite(termsVersionId)) {
    return res.status(400).json({ error: 'termsVersionId is required' });
  }

  try {
    const result = await acceptTerms(
      accessToken,
      termsVersionId,
      identity,
      requestOrigin,
    );

    return res.status(200).json({
      ...result,
      user: loginStatus.userContext,
    });
  } catch (error) {
    if (error instanceof TermsApiError) {
      return res.status(error.status).json({
        currentTerms: error.currentTerms,
        error: error.detail ?? error.message,
      });
    }

    console.error('terms accept API error:', error);
    return res.status(503).json({ error: 'Unable to record terms acceptance' });
  }
}
