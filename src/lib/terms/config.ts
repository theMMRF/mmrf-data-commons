import termsConfig from '../../../config/gen3/terms.json';

export interface TermsConfig {
  version: string;
  effectiveDate: string;
  title: string;
  summary: string;
  acceptanceText: string;
  termsUrl: string;
}

export const activeTermsConfig = termsConfig as TermsConfig;
