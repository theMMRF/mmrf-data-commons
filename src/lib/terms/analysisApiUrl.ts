/**
 * Edge-safe Gen3 Analysis API base URL (no @gen3/core imports).
 *
 * Server-side callers (middleware, SSR, API routes) should reach the backend
 * directly via NEXT_PUBLIC_GEN3_API_TARGET when available, avoiding a loop
 * through Next.js middleware on localhost proxy paths.
 */
export const getGen3AnalysisApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_GEN3_ANALYSIS_API) {
    return process.env.NEXT_PUBLIC_GEN3_ANALYSIS_API.replace(/\/$/, '');
  }

  const apiTarget = process.env.NEXT_PUBLIC_GEN3_API_TARGET?.replace(/\/$/, '');
  if (apiTarget) {
    return `${apiTarget}/analysis/v0`;
  }

  const gen3Api = process.env.NEXT_PUBLIC_GEN3_API?.replace(/\/$/, '') ?? '';
  return `${gen3Api}/analysis/v0`;
};
