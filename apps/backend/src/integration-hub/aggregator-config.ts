// Environment-variable config for the inbound aggregator webhooks
// (Zomato / Swiggy / generic aggregator — see docs/ZOMATO-SWIGGY-ONBOARDING.md).
//
// This is the deployment-level fallback for the per-restaurant config stored
// in Settings -> Integrations. A restaurant that saves a webhook secret in the
// UI always wins: the env secret is only consulted when that restaurant has
// NO saved connection for the provider, and a connection that exists but is
// disabled is never re-enabled by the environment. That keeps "disable" a
// real off-switch and keeps the e2e expectation "refused while nothing is
// set up" true on a machine with no AGGREGATOR_* variables set.
//
// Variables (never commit real values — see apps/backend/.env.example):
//   AGGREGATOR_WEBHOOKS_ENABLED=false   global kill-switch, default true
//   AGGREGATOR_ZOMATO_ENABLED=false     per-provider on/off, default true
//   AGGREGATOR_SWIGGY_ENABLED=false
//   AGGREGATOR_AGGREGATOR_ENABLED=false
//   AGGREGATOR_ZOMATO_WEBHOOK_SECRET=<16+ chars, same value as in the aggregator>
//   AGGREGATOR_SWIGGY_WEBHOOK_SECRET=<16+ chars>
//   AGGREGATOR_AGGREGATOR_WEBHOOK_SECRET=<16+ chars>
//
// The env mode has no IntegrationConnection row, so there is nothing for the
// UI to show as Connected and nowhere to write an activity log: a correctly
// signed `ping` returning `{ "ok": true }` is the test that it works.

export const AGGREGATOR_PROVIDER_KEYS = [
  'zomato',
  'swiggy',
  'aggregator',
] as const;
export type AggregatorProviderKey = (typeof AGGREGATOR_PROVIDER_KEYS)[number];

/** Same floor as the hub's UI validation (IntegrationHubService.connect). */
export const MIN_WEBHOOK_SECRET_LENGTH = 16;

export interface AggregatorEnvConfig {
  enabled: boolean;
  /** Null when unset (or too short — see `secretTooShort`). */
  webhookSecret: string | null;
  /** True when a secret was set but rejected for being too short. */
  secretTooShort: boolean;
}

export type EnvGetter = (key: string) => string | undefined;

function parseEnabled(value: string | undefined, fallback = true): boolean {
  if (value === undefined) return fallback;
  const v = value.trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(v)) return false;
  if (['true', '1', 'yes', 'on'].includes(v)) return true;
  return fallback; // unrecognised value: do not silently disable anything
}

export function resolveAggregatorEnvConfig(
  providerKey: string,
  get: EnvGetter,
): AggregatorEnvConfig {
  if (
    !(AGGREGATOR_PROVIDER_KEYS as readonly string[]).includes(providerKey)
  ) {
    return { enabled: false, webhookSecret: null, secretTooShort: false };
  }
  const key = providerKey.toUpperCase();
  const enabled =
    parseEnabled(get('AGGREGATOR_WEBHOOKS_ENABLED')) &&
    parseEnabled(get(`AGGREGATOR_${key}_ENABLED`));
  const raw = get(`AGGREGATOR_${key}_WEBHOOK_SECRET`)?.trim();
  if (!raw) return { enabled, webhookSecret: null, secretTooShort: false };
  if (raw.length < MIN_WEBHOOK_SECRET_LENGTH) {
    return { enabled, webhookSecret: null, secretTooShort: true };
  }
  return { enabled, webhookSecret: raw, secretTooShort: false };
}
