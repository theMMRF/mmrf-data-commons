import { GEN3_API } from '@gen3/core/server';
import { resolveAbsoluteGen3ApiBase } from './requestOrigin';

const INTERNAL_ANALYSIS_API = 'http://gen3-analysis-service/analysis/v0';

const normalizeBase = (value?: string): string | undefined => {
  const normalized = value?.trim().replace(/\/$/, '');
  if (!normalized?.startsWith('http')) {
    return undefined;
  }

  return normalized;
};

/**
 * Gen3 Analysis API base URL for Node.js server routes (API handlers, SSR).
 */
export const getGen3AnalysisApiUrl = (
  requestOrigin?: string,
): string | undefined => {
  const configuredAnalysisApi = (
    process.env.GEN3_ANALYSIS_API ??
    process.env.NEXT_PUBLIC_GEN3_ANALYSIS_API
  )?.replace(/\/$/, '');

  if (configuredAnalysisApi?.startsWith('http')) {
    return configuredAnalysisApi;
  }

  if (process.env.NODE_ENV === 'production') {
    return INTERNAL_ANALYSIS_API;
  }

  const gen3Api =
    normalizeBase(process.env.GEN3_API_TARGET) ??
    normalizeBase(process.env.GEN3_API) ??
    normalizeBase(typeof GEN3_API === 'string' ? GEN3_API : undefined) ??
    normalizeBase(process.env.NEXT_PUBLIC_GEN3_API_TARGET) ??
    normalizeBase(process.env.NEXT_PUBLIC_GEN3_API);

  if (gen3Api) {
    if (configuredAnalysisApi?.startsWith('/')) {
      return `${gen3Api}${configuredAnalysisApi}`;
    }

    return `${gen3Api}/analysis/v0`;
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
