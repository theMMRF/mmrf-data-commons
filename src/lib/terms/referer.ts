export const getSafeReferer = (referer: unknown): string => {
  if (typeof referer !== 'string') return '/';
  if (!referer.startsWith('/') || referer.startsWith('//')) return '/';
  if (referer.startsWith('/Login') || referer.startsWith('/TermsAcceptance')) {
    return '/';
  }

  return referer;
};
