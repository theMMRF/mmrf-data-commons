/**
 * Paths that must not be gated by terms acceptance.
 * Includes auth/terms BFF routes, Gen3 backend proxy paths used for
 * session health checks (see next.config.js rewrites), and static assets.
 */
const TERMS_EXEMPT_PATH_PREFIXES = [
  '/Login',
  '/TermsAcceptance',
  '/403',
  '/404',
  '/api/auth',
  '/api/terms',
  '/analysis/v0/terms',
  '/_status',
  '/user',
  '/authz',
  '/lw-workspace',
  '/icons',
  '/images',
] as const;

const STATIC_ASSET_PATH_PREFIXES = ['/icons/', '/images/'] as const;

const STATIC_ASSET_EXTENSIONS = [
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.css',
  '.js',
] as const;

export const isStaticAssetPath = (pathname: string): boolean => {
  if (pathname === '/mockServiceWorker.js') {
    return true;
  }

  if (
    STATIC_ASSET_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return true;
  }

  return STATIC_ASSET_EXTENSIONS.some((extension) =>
    pathname.endsWith(extension),
  );
};

export const isExemptFromTermsCheck = (pathname: string): boolean => {
  if (isStaticAssetPath(pathname)) {
    return true;
  }

  return TERMS_EXEMPT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};

export { TERMS_EXEMPT_PATH_PREFIXES };
