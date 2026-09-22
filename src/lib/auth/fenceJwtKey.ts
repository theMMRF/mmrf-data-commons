import { fetchJWTKey } from '@gen3/frontend/server';

// Cache only public verification material, never tokens or login decisions.
// Middleware and API routes each have their own runtime-local cache.
const KEY_TTL_MS = 60_000;
const REFRESH_COOLDOWN_MS = 5_000;
let cachedKey: string | null = null;
let expiresAt = 0;
let refreshAfter = 0;
let pending: Promise<string | null> | undefined;

export async function getFenceJwtKey(refresh = false): Promise<string | null> {
  const now = Date.now();
  if (cachedKey && now < expiresAt && (!refresh || now < refreshAfter)) {
    return cachedKey;
  }

  if (!pending) {
    pending = fetchJWTKey(process.env.NODE_ENV === 'production')
      .then((key) => {
        cachedKey = key;
        expiresAt = key ? Date.now() + KEY_TTL_MS : 0;
        return key;
      })
      .finally(() => {
        // Bound refresh attempts from invalid signatures, including failed
        // refreshes. Expired keys still require a successful fresh lookup.
        refreshAfter = Date.now() + REFRESH_COOLDOWN_MS;
        pending = undefined;
      });
  }
  return pending;
}
