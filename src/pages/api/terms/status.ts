import type { NextApiRequest, NextApiResponse } from 'next';
import { getLoginStatus } from '@/lib/auth/getLoginStatus';
import { getTermsStatusFromCookie } from '@/lib/terms/placeholderTermsService';

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

  return res.status(200).json({
    ...getTermsStatusFromCookie(req.headers.cookie),
    user: loginStatus.userContext,
  });
}
