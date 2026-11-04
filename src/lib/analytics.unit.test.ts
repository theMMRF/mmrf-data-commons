import { isAnalyticsAllowed } from './analytics';

const production = {
  nodeEnv: 'production',
  syntheticSandbox: false,
  hostname: 'virtuallab.themmrf.org',
  analyticsHostname: 'virtuallab.themmrf.org',
};

describe('analytics environment policy', () => {
  it('allows the configured production host (consent remains required)', () => {
    expect(isAnalyticsAllowed(production)).toBe(true);
  });

  it.each(['development', 'test', undefined])(
    'rejects %s builds',
    (nodeEnv) => {
      expect(isAnalyticsAllowed({ ...production, nodeEnv })).toBe(false);
    },
  );

  it('rejects synthetic builds even on the production hostname', () => {
    expect(isAnalyticsAllowed({ ...production, syntheticSandbox: true })).toBe(
      false,
    );
  });

  it.each([
    'localhost',
    'test.localhost',
    '127.0.0.1',
    '127.0.0.2',
    '0.0.0.0',
    '::1',
    '[::1]',
  ])('rejects loopback host %s even if configured', (hostname) => {
    expect(
      isAnalyticsAllowed({
        ...production,
        hostname,
        analyticsHostname: hostname,
      }),
    ).toBe(false);
  });

  it.each([
    'dev.example.invalid',
    '192.0.2.1',
    'virtuallab.themmrf.org.example.invalid',
    '',
  ])('rejects an unapproved host %s', (hostname) => {
    expect(isAnalyticsAllowed({ ...production, hostname })).toBe(false);
  });

  it('fails closed when the production hostname is absent', () => {
    expect(
      isAnalyticsAllowed({ ...production, analyticsHostname: undefined }),
    ).toBe(false);
  });

  it('normalizes DNS case and the final root dot', () => {
    expect(
      isAnalyticsAllowed({
        ...production,
        hostname: 'VirtualLab.theMMRF.org.',
      }),
    ).toBe(true);
  });
});
