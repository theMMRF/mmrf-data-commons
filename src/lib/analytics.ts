interface AnalyticsEnvironment {
  nodeEnv?: string;
  syntheticSandbox: boolean;
  hostname: string;
  analyticsHostname?: string;
}

// Consent is checked separately. Only the configured production host may load GA;
// production-mode preview builds must not contribute to production analytics.
export const isAnalyticsAllowed = ({
  nodeEnv,
  syntheticSandbox,
  hostname,
  analyticsHostname,
}: AnalyticsEnvironment): boolean => {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  const allowedHost = analyticsHostname
    ?.trim()
    .toLowerCase()
    .replace(/\.$/, '');
  const local =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    /^127\./.test(host) ||
    ['0.0.0.0', '::1', '[::1]'].includes(host);

  return (
    nodeEnv === 'production' &&
    !syntheticSandbox &&
    !local &&
    Boolean(host && allowedHost && host === allowedHost)
  );
};
