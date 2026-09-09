import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'node:http';
import https from 'node:https';

export const config = { api: { bodyParser: false, responseLimit: false } };

// Local credentials-login cookies belong to localhost, not the remote Fence
// domain. Forward their token as a bearer header to the protected dev service.
// Production uses the normal same-origin reverse proxy instead.
export default function proxy(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    res.status(404).end();
    return;
  }
  const base = process.env.NEXT_PUBLIC_GEN3_API_TARGET;
  if (!base) {
    res.status(503).json({ error: 'Set NEXT_PUBLIC_GEN3_API_TARGET for local API access' });
    return;
  }
  const path = req.query.path;
  if (!Array.isArray(path) || path.some((part) => part === '..' || part === '.')) {
    res.status(400).end();
    return;
  }
  const target = new URL(base);
  if (target.protocol !== 'https:') {
    res.status(503).json({ error: 'The dev API target must use HTTPS' });
    return;
  }
  target.pathname = `/protein-paint/${path.map(encodeURIComponent).join('/')}`;
  const incoming = new URL(req.url || '/', 'http://localhost');
  target.search = incoming.search;
  target.searchParams.delete('path');
  const authorization = req.headers.authorization ??
    ((req.cookies.access_token || req.cookies.credentials_token)
      ? `Bearer ${req.cookies.access_token || req.cookies.credentials_token}` : undefined);
  if (!authorization) {
    res.status(401).json({ error: 'Sign in with dev credentials first' });
    return;
  }
  const headers: http.OutgoingHttpHeaders = {
    ...req.headers, host: target.host, authorization,
  };
  delete headers.cookie;
  delete headers['proxy-authorization'];
  const upstream = https.request(target, { method: req.method, headers }, (response) => {
    res.writeHead(response.statusCode || 502, {
      ...response.headers, 'cache-control': 'private, no-store',
    });
    response.pipe(res);
  });
  upstream.setTimeout(180000, () => upstream.destroy());
  upstream.on('error', () => {
    if (!res.headersSent) res.status(502).json({ error: 'ProteinPaint unavailable' });
    else res.destroy();
  });
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
  req.pipe(upstream);
}
