# Licence / activation

How a restaurant on the hosted RestroOS service is activated with a host-issued key.

## What this is — and what it is not

RestroOS stays **AGPL-3.0** (see `LICENSE`). This module only records that
a particular restaurant was activated with a host-issued key. It does
**not** change the app's licence, and it does not make anything
closed-source. No commercial licence is needed: RestroOS is sold as a
hosted service for multiple restaurants — source code and database stay
with the host, restaurants use the hosted product, one activation per
restaurant.

Activation is also **not an enforcement gate (yet)**: nothing in the app
stops working without an active licence. This module provides the
issue/activate/deactivate/revoke bookkeeping and the Settings UI; making
features depend on an active licence is a later product decision.

## Flow

1. **Host issues a key** — Settings → Licence → "Issue licence keys"
   (or `POST /v1/licence/issue`). The full key is shown **once**; copy it
   to the buyer (email, invoice, whatever channel you already use). It
   cannot be recovered afterwards — only its hash is stored.
2. **Restaurant activates** — the buyer pastes the key in Settings →
   Licence (`POST /v1/licence/activate`). One licence is active per
   restaurant at a time.
3. **Moving servers** — the restaurant deactivates first (`POST
   /v1/licence/deactivate`); the key returns to ISSUED and can be
   activated again elsewhere.
4. **Lost / abused key** — the host revokes it (`POST
   /v1/licence/:id/revoke`). Revocation is terminal and also unbinds an
   active licence.

All four mutations are written to the audit log (`licence.issued`,
`licence.activated`, `licence.deactivated`, `licence.revoked`) — never
with key material, only the key's last four characters and plan.

## Key format

```
RS-XXXX-XXXX-XXXX-CCCC
```

- `RS` prefix, then 12 random payload characters and a 4-character
  checksum, grouped in fours for typing.
- Alphabet: `ABCDEFGHJKMNPQRSTVWXYZ23456789` — no `0`/`O`, `1`/`I` or `L`,
  so a key read off a screen or invoice can't be confused.
- Checksum: the first four base-30 digits of `SHA-256(payload) mod 30^4`.
  A single mistyped character changes the hash completely, so a typo is
  rejected with a "check for typos" hint instead of activating the wrong
  key (a typo passes by chance 1 in 810,000). The checksum catches typos
  only — it is not a security feature. Secrecy is what makes a key
  unguessable (30^12 combinations).
- Keys are accepted with or without separators, in any case
  (`rs-xxxx-...` works).

Implementation: `apps/backend/src/modules/licence/licence-key.ts` (pure
functions — generation, normalization, checksum validation, hashing —
unit-tested in `licence-key.spec.ts`). The shared Zod schema
(`packages/types/src/licence.ts`, `licenceKeySchema`) validates the shape
only; the checksum is re-checked server-side because it needs
`node:crypto`.

## Storage

Prisma model `Licence` (`apps/backend/prisma/schema.prisma`, table
`licences`):

| Field | Meaning |
| --- | --- |
| `keyHash` (unique) | SHA-256 of the normalized key — the only form stored |
| `lastFour` | Last four characters (the checksum group) — the only part ever shown back |
| `plan` | Label, e.g. `STANDARD` — display only, no behaviour attached |
| `status` | `ISSUED` → `ACTIVE` → `ISSUED` (deactivate) / `REVOKED` / `EXPIRED` |
| `issuedTo`, `note` | Host-side notes recorded at issue time |
| `issuedAt`, `issuedById`, `expiresAt` | Issue metadata; expiry blocks (re-)activation only |
| `restaurantId`, `activatedAt`, `activatedById` | Activation binding — set only while `ACTIVE` |
| `instanceId` | Free-form label of the activated deployment (hostname, server label), supplied at activation — the codebase has no server instance id of its own |
| `revokedAt` | When the host revoked the key |

## Endpoints

All under `/api/v1/licence`, all requiring a signed-in user with the
`settings.manage` permission:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/v1/licence` | List issued keys (masked summaries), newest first |
| `GET` | `/v1/licence/status` | This restaurant's active licence, or `{ active: null }` |
| `POST` | `/v1/licence/issue` | Issue a key; response includes the raw key **once** (`{ ..., key }`) |
| `POST` | `/v1/licence/activate` | `{ key, instanceId? }` — activates for the caller's restaurant |
| `POST` | `/v1/licence/deactivate` | Releases the caller's active licence back to `ISSUED` |
| `POST` | `/v1/licence/:id/revoke` | Terminal revoke (issued or active) |

Activation refuses: a malformed or bad-checksum key, an unknown key, a
revoked key, an expired key (marked `EXPIRED` on the spot), a key that is
already active, and a second active licence for a restaurant that already
has one.

## UI

Settings → Licence (`apps/web/app/(dashboard)/settings/licence/page.tsx`,
hooks in `apps/web/hooks/use-licence.ts`): status card with the activate
form (key + optional instance label) or the active licence with a
Deactivate button, plus the host's issue form and issued-keys table
with Revoke. The tab is gated to `settings.manage`.

## Known limitations

- Issuing is gated to `settings.manage`, i.e. a restaurant admin. That
  is a stopgap: issuing is a host-side action for the hosted product, so
  a multi-tenant setup should restrict `POST /v1/licence/issue` (and the
  issued-keys list) to host staff instead of restaurant admins.
- Expiry only blocks (re-)activation; it does not cut off an
  already-active licence, and no feature is gated on having an active
  licence at all.
- `plan` is a label only — what a plan entitles a restaurant to is a
  host decision, not something this module enforces.
- `instanceId` is caller-supplied and unverified; it is a label for the
  host to tell deployments apart, not a device fingerprint.
