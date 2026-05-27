import { resolveAbsoluteGen3ApiBase } from './requestOrigin';

/**
 * Edge-safe Gen3 Analysis API base URL (no @gen3/core imports).
 */
export const getGen3AnalysisApiUrl = (requestOrigin?: string): string | undefined => {
  const configuredAnalysisApi = process.env.NEXT_PUBLIC_GEN3_ANALYSIS_API?.replace(
    /\/$/,
    '',
  );

  if (configuredAnalysisApi?.startsWith('http')) {
    return configuredAnalysisApi;
  }

  const apiBase = resolveAbsoluteGen3ApiBase(requestOrigin);
  if (!apiBase) {
    return undefined;
  }

  if (configuredAnalysisApi?.startsWith('/')) {
    return `${apiBase}${configuredAnalysisApi}`;
  }

  return `${apiBase}/analysis/v0`;
};
