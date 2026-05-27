const normalizeBase = (value?: string): string | undefined => {
  const normalized = value?.trim().replace(/\/$/, '');
  if (!normalized) {
    return undefined;
  }

  return normalized.startsWith('http') ? normalized : undefined;
};

/**
 * Resolves an absolute Gen3 API origin for server-side fetch calls.
 * Edge middleware cannot fetch relative URLs, so callers must provide
 * requestOrigin when env vars are unset (common in deployed environments).
 */
export const resolveAbsoluteGen3ApiBase = (
  requestOrigin?: string,
): string | undefined =>
  normalizeBase(process.env.NEXT_PUBLIC_GEN3_API_TARGET) ??
  normalizeBase(process.env.NEXT_PUBLIC_GEN3_API) ??
  normalizeBase(process.env.NEXT_PUBLIC_GEN3_ANALYSIS_API)?.replace(
    /\/analysis\/v0$/,
    '',
  ) ??
  normalizeBase(requestOrigin);

export const buildAbsoluteGen3Url = (
  path: string,
  requestOrigin?: string,
): string | undefined => {
  const base = resolveAbsoluteGen3ApiBase(requestOrigin);
  if (!base) {
    return undefined;
  }

  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

export const getRequestOriginFromApiRequest = (req: {
  headers: NodeJS.Dict<string | string[] | undefined>;
}): string | undefined => {
  const hostHeader = req.headers['x-forwarded-host'] ?? req.headers.host;
  if (!hostHeader) {
    return undefined;
  }

  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const protoHeader = req.headers['x-forwarded-proto'] ?? 'https';
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;

  return normalizeBase(`${proto}://${host.split(',')[0].trim()}`);
};
