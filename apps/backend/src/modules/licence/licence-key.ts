// Licence-key format, generation and validation.
//
// A licence key is 16 characters from a 30-character alphabet (no 0/O,
// 1/I/L, so a key read off a screen or an invoice can't be confused), shown
// grouped as:
//
//   RS-XXXX-XXXX-XXXX-CCCC
//   ^   ^^^^^^^^^^^^  ^^^^
//   |   12 random payload characters
//                       4-character checksum of the payload
//
// The checksum is the first 4 base-30 digits of (SHA-256(payload) mod
// 30^4). A single mistyped character changes the hash completely, so a
// typo fails validation instead of silently activating the wrong key —
// the chance of a typo accidentally passing is 1 in 30^4 (1 in 810,000).
// It is NOT a security feature: the checksum only catches typos. The key's
// secrecy is what makes it unguessable (30^12 combinations), and only the
// SHA-256 hash of a key is ever stored (see LicenceService).
//
// Pure functions only — no NestJS, no Prisma — so they can be unit-tested
// in isolation (licence-key.spec.ts) and reused anywhere a key needs
// checking. The shared Zod schema in @restroos/types (licenceKeySchema)
// validates the *shape* only; the checksum check lives here because it
// needs node:crypto, which the browser bundle of the types package must
// not pull in.

import { createHash, randomInt } from 'node:crypto';

/** Characters a key may contain. Deliberately excludes 0/O, 1/I and L. */
export const LICENCE_KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

export const LICENCE_KEY_PREFIX = 'RS';

/** Random payload characters per key (12) + checksum characters (4). */
export const LICENCE_KEY_PAYLOAD_LENGTH = 12;
export const LICENCE_KEY_CHECKSUM_LENGTH = 4;

/** `RS` + 16 key characters, separators stripped. */
export const LICENCE_KEY_NORMALIZED_LENGTH =
  LICENCE_KEY_PREFIX.length +
  LICENCE_KEY_PAYLOAD_LENGTH +
  LICENCE_KEY_CHECKSUM_LENGTH;

/**
 * Normalizes user input for comparison/storage: upper-case, hyphens and
 * whitespace stripped, so `rs-aaaa-bbbb-cccc-dddd`, `RSAAAA...` and the
 * grouped display form all resolve to the same key.
 */
export function normalizeLicenceKey(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

/** Groups a normalized key for display: `RS-XXXX-XXXX-XXXX-CCCC`. */
export function formatLicenceKey(normalized: string): string {
  const body = normalized.slice(LICENCE_KEY_PREFIX.length);
  const groups = body.match(/.{1,4}/g) ?? [];
  return `${LICENCE_KEY_PREFIX}-${groups.join('-')}`;
}

function checksumForPayload(payload: string): string {
  // First 4 bytes of the hash are far more entropy than 30^4 needs;
  // reducing mod 30^4 keeps the mapping uniform enough for a typo check.
  const digest = createHash('sha256').update(payload).digest();
  let value = digest.readUInt32BE(0) % 30 ** LICENCE_KEY_CHECKSUM_LENGTH;
  let checksum = '';
  for (let i = 0; i < LICENCE_KEY_CHECKSUM_LENGTH; i++) {
    checksum = LICENCE_KEY_ALPHABET[value % LICENCE_KEY_ALPHABET.length] + checksum;
    value = Math.floor(value / LICENCE_KEY_ALPHABET.length);
  }
  return checksum;
}

/** Generates a fresh key, returned in grouped display form. */
export function generateLicenceKey(): string {
  let payload = '';
  for (let i = 0; i < LICENCE_KEY_PAYLOAD_LENGTH; i++) {
    payload += LICENCE_KEY_ALPHABET[randomInt(LICENCE_KEY_ALPHABET.length)];
  }
  return formatLicenceKey(
    `${LICENCE_KEY_PREFIX}${payload}${checksumForPayload(payload)}`,
  );
}

/**
 * Full validation: normalized shape (prefix, length, alphabet) AND the
 * checksum. Returns `null` when the key is valid, otherwise a human-
 * readable reason — the activation endpoint surfaces the checksum case
 * as a typo hint ("check the key and try again").
 */
export function validateLicenceKey(input: string): string | null {
  const normalized = normalizeLicenceKey(input);
  const shape = new RegExp(
    `^${LICENCE_KEY_PREFIX}[${LICENCE_KEY_ALPHABET}]{${LICENCE_KEY_PAYLOAD_LENGTH + LICENCE_KEY_CHECKSUM_LENGTH}}$`,
  );
  if (!shape.test(normalized)) {
    return 'Enter a licence key like RS-XXXX-XXXX-XXXX-XXXX';
  }
  const payload = normalized.slice(
    LICENCE_KEY_PREFIX.length,
    LICENCE_KEY_PREFIX.length + LICENCE_KEY_PAYLOAD_LENGTH,
  );
  const checksum = normalized.slice(
    LICENCE_KEY_PREFIX.length + LICENCE_KEY_PAYLOAD_LENGTH,
  );
  if (checksum !== checksumForPayload(payload)) {
    return 'That key does not look right — check it for typos and try again';
  }
  return null;
}

/** SHA-256 of the normalized key — the only form ever stored (see schema). */
export function hashLicenceKey(normalized: string): string {
  return createHash('sha256').update(normalized).digest('hex');
}
