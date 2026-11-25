import { resolveAggregatorEnvConfig } from './aggregator-config';

describe('aggregator-config (env fallback for Zomato / Swiggy webhooks)', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });
  const get = (k: string) => process.env[k];

  it('is off by default: no secret configured means no webhook is accepted', () => {
    for (const p of ['zomato', 'swiggy', 'aggregator']) {
      const c = resolveAggregatorEnvConfig(p, get);
      expect(c.enabled).toBe(true);
      expect(c.webhookSecret).toBeNull();
      expect(c.secretTooShort).toBe(false);
    }
  });

  it('reads a usable per-provider secret from the environment', () => {
    process.env.AGGREGATOR_ZOMATO_WEBHOOK_SECRET =
      'a-long-enough-shared-secret';
    const c = resolveAggregatorEnvConfig('zomato', get);
    expect(c).toEqual({
      enabled: true,
      webhookSecret: 'a-long-enough-shared-secret',
      secretTooShort: false,
    });
    // Other providers are unaffected.
    expect(
      resolveAggregatorEnvConfig('swiggy', get).webhookSecret,
    ).toBeNull();
  });

  it('rejects a secret shorter than 16 characters instead of accepting it', () => {
    process.env.AGGREGATOR_SWIGGY_WEBHOOK_SECRET = 'too-short';
    const c = resolveAggregatorEnvConfig('swiggy', get);
    expect(c.webhookSecret).toBeNull();
    expect(c.secretTooShort).toBe(true);
  });

  it('honours the per-provider off switch', () => {
    process.env.AGGREGATOR_ZOMATO_WEBHOOK_SECRET =
      'a-long-enough-shared-secret';
    process.env.AGGREGATOR_ZOMATO_ENABLED = 'false';
    expect(resolveAggregatorEnvConfig('zomato', get).enabled).toBe(false);
  });

  it('honours the global kill-switch for every provider', () => {
    process.env.AGGREGATOR_WEBHOOKS_ENABLED = 'false';
    process.env.AGGREGATOR_SWIGGY_WEBHOOK_SECRET =
      'a-long-enough-shared-secret';
    const c = resolveAggregatorEnvConfig('swiggy', get);
    expect(c.enabled).toBe(false);
    expect(c.webhookSecret).toBe('a-long-enough-shared-secret');
  });

  it('refuses unknown providers', () => {
    const c = resolveAggregatorEnvConfig('doordash', get);
    expect(c.enabled).toBe(false);
    expect(c.webhookSecret).toBeNull();
  });
});
