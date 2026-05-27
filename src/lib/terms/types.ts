export type TermsContentFormat = 'html' | 'markdown' | 'plain_text';

export interface TermsVersion {
  id: number;
  version: string;
  effectiveAt: string;
  termsUrl: string | null;
  termsContent: string;
  contentFormat: TermsContentFormat;
}

export interface TermsStatus {
  hasAcceptedLatestTerms: boolean;
  currentTerms: TermsVersion;
}

export interface TermsAcceptanceResult {
  hasAcceptedLatestTerms: boolean;
  termsVersionId: number;
  accepted: boolean;
}

export interface TermsGateResult {
  isLoggedIn: boolean;
  hasAcceptedLatestTerms: boolean;
  currentTerms?: TermsVersion;
  error?: string;
}

export interface TermsUiConfig {
  title: string;
  intro: string;
  acceptanceText: string;
  submitButtonText: string;
  externalLinkText: string;
}

interface ApiTermsVersionResponse {
  id: number;
  version: string;
  effective_at: string;
  terms_url?: string | null;
  terms_content: string;
  content_format: string;
}

interface ApiTermsStatusResponse {
  has_accepted_latest_terms: boolean;
  current_terms: ApiTermsVersionResponse;
}

interface ApiTermsAcceptanceResponse {
  has_accepted_latest_terms: boolean;
  terms_version_id: number;
  accepted: boolean;
}

export class TermsApiError extends Error {
  status: number;

  detail?: string;

  currentTerms?: TermsVersion;

  constructor(
    message: string,
    status: number,
    detail?: string,
    currentTerms?: TermsVersion,
  ) {
    super(message);
    this.name = 'TermsApiError';
    this.status = status;
    this.detail = detail;
    this.currentTerms = currentTerms;
  }
}

export const mapTermsVersion = (
  data: ApiTermsVersionResponse,
): TermsVersion => ({
  id: data.id,
  version: data.version,
  effectiveAt: data.effective_at,
  termsUrl: data.terms_url ?? null,
  termsContent: data.terms_content,
  contentFormat: data.content_format as TermsContentFormat,
});

export const mapTermsStatusResponse = (
  data: ApiTermsStatusResponse,
): TermsStatus => ({
  hasAcceptedLatestTerms: data.has_accepted_latest_terms,
  currentTerms: mapTermsVersion(data.current_terms),
});

export const mapTermsAcceptanceResponse = (
  data: ApiTermsAcceptanceResponse,
): TermsAcceptanceResult => ({
  hasAcceptedLatestTerms: data.has_accepted_latest_terms,
  termsVersionId: data.terms_version_id,
  accepted: data.accepted,
});

export type {
  ApiTermsStatusResponse,
  ApiTermsAcceptanceResponse,
  ApiTermsVersionResponse,
};
