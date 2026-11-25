// Pure helpers for the payment step. The server prices the bill and validates
// every payment; these only decide what to show and what to send, so the
// screen and the printed bill never disagree about change or balance.
import { round2 } from "./pricing-preview.ts";

export type PayMethod = "CASH" | "CARD" | "UPI" | "OTHER" | string;

export interface PaymentPlan {
  /** False when there is nothing sensible to record (zero, negative, NaN). */
  valid: boolean;
  /** Amount applied to the bill. */
  applied: number;
  /** Cash handed over, only when it exceeds what is applied. */
  tendered?: number;
  /** Change to give back. */
  change: number;
  /** Balance left on the bill after this payment. */
  balanceAfter: number;
  /** This payment does not settle the bill. */
  partial: boolean;
  /** A non-cash amount above the balance was cut back to it. */
  clamped: boolean;
}

/**
 * What one payment entry means. `entered` is what the cashier typed (null =
 * they left it blank, meaning "the whole balance"). Cash may exceed the
 * balance - the rest is change. Any other method is capped at the balance,
 * because a card or UPI payment cannot be over-tendered.
 */
export function planPayment(input: {
  remaining: number;
  entered: number | null;
  method: PayMethod;
}): PaymentPlan {
  const remaining = round2(Math.max(input.remaining, 0));
  const amount = round2(input.entered ?? remaining);
  if (!Number.isFinite(amount) || (amount <= 0 && remaining > 0)) {
    return { valid: false, applied: 0, change: 0, balanceAfter: remaining, partial: false, clamped: false };
  }
  const applied = round2(Math.min(amount, remaining));
  const over = round2(amount - remaining);
  const isCash = input.method === "CASH";
  const change = isCash && over > 0 ? over : 0;
  const balanceAfter = round2(remaining - applied);
  return {
    valid: true,
    applied,
    tendered: change > 0 ? amount : undefined,
    change,
    balanceAfter,
    partial: balanceAfter > 0,
    clamped: !isCash && over > 0,
  };
}

/** "10% (₹20.00)" - the discount as both percentage and amount. */
export function discountSummary(
  discountPercent: number,
  discountAmount: number,
  format: (n: number) => string,
): string {
  const pct = Number.isInteger(discountPercent) ? String(discountPercent) : discountPercent.toFixed(2);
  return `${pct}% (${format(discountAmount)})`;
}

/** Parse a money input; blank means "not entered" (null), junk is NaN. */
export function parseMoney(value: string): number | null {
  const t = value.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? round2(n) : Number.NaN;
}

// --- Split payment ---------------------------------------------------------
// Several payment lines against one balance (cash + card + UPI, ...). The
// server re-validates the total — this only decides what to show and send.

export interface SplitPaymentLineInput {
  method: PayMethod;
  /** What the cashier typed; null = blank, meaning "the rest of the balance". */
  entered: number | null;
}

export interface PlannedSplitLine {
  method: PayMethod;
  /** Amount applied to the bill (0 when the line adds nothing). */
  applied: number;
  /** Cash handed over, only when it exceeds what is applied. */
  tendered?: number;
  /** Change to give back on this line. */
  change: number;
}

export interface SplitPaymentPlan {
  /** False when a line is nonsense (zero, negative, NaN) or nothing is due. */
  valid: boolean;
  lines: PlannedSplitLine[];
  /** Lines that actually pay something, in order — what checkout sends. */
  payable: PlannedSplitLine[];
  /** Total applied to the bill. */
  totalApplied: number;
  /** Change to give back across the cash lines. */
  change: number;
  /** Balance left on the bill after these payments. */
  balanceAfter: number;
  /** These payments do not settle the bill (a part-payment). */
  partial: boolean;
  /** A non-cash line above the running balance was cut back to it. */
  clamped: boolean;
}

/**
 * Plan a split payment. Lines are settled in order against the running
 * balance: a blank amount means "whatever is still due at this line", so a
 * single blank line still means "the whole balance" (the old single-payment
 * flow). Cash may exceed the running balance — the rest is change. Any other
 * method is capped at the running balance, because a card or UPI payment
 * cannot be over-tendered. A line of 0 or less (typed, not blank) is invalid.
 */
export function planSplitPayments(input: {
  remaining: number;
  lines: SplitPaymentLineInput[];
}): SplitPaymentPlan {
  const remaining = round2(Math.max(input.remaining, 0));
  // Nothing owed (loyalty points / a gift card already covered the bill):
  // there is nothing to record, and completing the checkout is valid.
  if (remaining <= 0) {
    return {
      valid: true,
      lines: input.lines.map((l) => ({
        method: l.method,
        applied: 0,
        change: 0,
      })),
      payable: [],
      totalApplied: 0,
      change: 0,
      balanceAfter: 0,
      partial: false,
      clamped: false,
    };
  }
  const invalid =
    input.lines.length === 0 ||
    input.lines.some(
      (l) => l.entered !== null && (!Number.isFinite(l.entered) || l.entered <= 0),
    );
  if (invalid) {
    return {
      valid: false,
      lines: input.lines.map((l) => ({
        method: l.method,
        applied: 0,
        change: 0,
      })),
      payable: [],
      totalApplied: 0,
      change: 0,
      balanceAfter: remaining,
      partial: false,
      clamped: false,
    };
  }
  let running = remaining;
  let clamped = false;
  const lines: PlannedSplitLine[] = input.lines.map((l) => {
    const amount = round2(l.entered ?? running);
    const applied = round2(Math.min(amount, running));
    const over = round2(amount - running);
    const isCash = l.method === "CASH";
    const change = isCash && over > 0 ? over : 0;
    if (!isCash && over > 0) clamped = true;
    running = round2(running - applied);
    return {
      method: l.method,
      applied,
      tendered: change > 0 ? amount : undefined,
      change,
    };
  });
  const payable = lines.filter((l) => l.applied > 0);
  const totalApplied = round2(
    payable.reduce((sum, l) => sum + l.applied, 0),
  );
  const change = round2(
    payable.reduce((sum, l) => sum + l.change, 0),
  );
  const balanceAfter = round2(remaining - totalApplied);
  return {
    valid: payable.length > 0,
    lines,
    payable,
    totalApplied,
    change,
    balanceAfter,
    partial: balanceAfter > 0,
    clamped,
  };
}
