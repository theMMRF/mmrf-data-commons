const normalizeBasePath = (value?: string): string => {
  if (!value || value === '/') {
    return '';
  }

  return value.startsWith('/') ? value.replace(/\/$/, '') : `/${value.replace(/\/$/, '')}`;
};

/** Server/middleware base path (e.g. `/gen3` in deployed environments). */
export const getBasePath = (): string =>
  normalizeBasePath(process.env.BASE_PATH ?? process.env.NEXT_PUBLIC_BASE_PATH);

/** Client-side base path from Next runtime config when available. */
export const getClientBasePath = (): string => {
  if (typeof window !== 'undefined') {
    const runtimeBasePath = (
      window as Window & { __NEXT_DATA__?: { config?: { basePath?: string } } }
    ).__NEXT_DATA__?.config?.basePath;

    if (runtimeBasePath) {
      return normalizeBasePath(runtimeBasePath);
    }
  }

  return normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
};

export const withBasePath = (pathname: string): string => {
  const basePath = getBasePath();
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${basePath}${normalizedPath}`;
};

export const withClientBasePath = (pathname: string): string => {
  const basePath = getClientBasePath();
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${basePath}${normalizedPath}`;
};
