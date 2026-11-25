import { z } from "zod";

// Licence / activation (Settings → Licence). The key format itself lives
// in apps/backend/src/modules/licence/licence-key.ts: `RS-XXXX-XXXX-XXXX-
// CCCC`, 16 characters from an alphabet with no 0/O, 1/I or L, the last
// group a checksum of the first three — so typos are caught server-side.
// This schema validates the *shape* only (the checksum needs node:crypto,
// which the browser bundle of this package must not pull in); the backend
// re-checks the checksum in LicenceService.activate() and reports a
// mistyped key as a typo hint.
export const licenceKeySchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase().replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(
        /^RS[A-HJKMNP-TV-Z2-9]{16}$/,
        "Enter a licence key like RS-XXXX-XXXX-XXXX-XXXX",
      ),
  );

export const issueLicenceSchema = z.object({
  // Label for the key, e.g. "STANDARD" or "ANNUAL". Shown in the UI; it
  // carries no behaviour — what a plan entitles the restaurant to is a
  // host decision, not something this module enforces.
  plan: z.string().trim().min(1).max(40).optional(),
  // Who the key is for (restaurant / buyer name) — a host-side note,
  // recorded before the key is ever activated.
  issuedTo: z.string().trim().max(120).optional(),
  note: z.string().trim().max(280).optional(),
  // Optional: the key stops being activatable at this time (ISO 8601, in
  // the future). An already-active licence is not cut off by expiry here
  // — expiry only blocks (re-)activation.
  expiresAt: z
    .string()
    .datetime()
    .refine((v) => new Date(v).getTime() > Date.now(), "expiresAt must be in the future")
    .optional(),
});
export type IssueLicenceDto = z.infer<typeof issueLicenceSchema>;

export const activateLicenceSchema = z.object({
  key: licenceKeySchema,
  // Free-form identifier of the deployment being activated (hostname,
  // server label). The codebase has no server instance id of its own, so
  // the activator supplies one; it is recorded for the host to tell
  // deployments apart and is not verified.
  instanceId: z.string().trim().min(1).max(120).optional(),
});
export type ActivateLicenceDto = z.infer<typeof activateLicenceSchema>;

export type LicenceStatus = "ISSUED" | "ACTIVE" | "REVOKED" | "EXPIRED";

// Masked summary of a licence — what every read returns. The raw key is
// never returned after issue; only its last four characters identify it.
export interface LicenceSummary {
  id: string;
  lastFour: string;
  plan: string;
  status: LicenceStatus;
  issuedTo: string | null;
  note: string | null;
  issuedAt: string;
  expiresAt: string | null;
  activatedAt: string | null;
  instanceId: string | null;
  revokedAt: string | null;
  restaurant: { id: string; name: string } | null;
}

// Issue response: the summary plus the raw key, returned exactly once.
export interface LicenceIssued extends LicenceSummary {
  key: string;
}
