import type { NextApiRequest, NextApiResponse } from 'next';
import { getLoginStatus } from '@/lib/auth/getLoginStatus';
import {
  createTermsAcceptanceCookie,
  getTermsStatusFromCookie,
} from '@/lib/terms/placeholderTermsService';
import { activeTermsConfig } from '@/lib/terms/config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const loginStatus = await getLoginStatus(req.headers.cookie);

  if (loginStatus.status !== 'issued') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const requestedVersion =
    typeof req.body?.termsVersion === 'string' ? req.body.termsVersion : null;

  if (requestedVersion !== activeTermsConfig.version) {
    return res.status(400).json({
      error: 'Terms version does not match the active terms version',
      activeVersion: activeTermsConfig.version,
    });
  }

  res.setHeader('Set-Cookie', createTermsAcceptanceCookie());

  return res.status(200).json({
    ...getTermsStatusFromCookie(
      `${req.headers.cookie ?? ''}; mmrf-terms-accepted-version=${activeTermsConfig.version}`,
    ),
    acceptedAt: new Date().toISOString(),
    user: loginStatus.userContext,
  });
}
