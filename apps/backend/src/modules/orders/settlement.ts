// Bill and settlement arithmetic, kept free of I/O so the exact figures a
// cashier sees, the printed bill and the checkout charge all come from one
// place and can be unit-tested. Prices here are tax-INCLUSIVE (see pricing.ts).
//
// Discount and tax: a discount is given on the tax-inclusive price, so it
// reduces the taxable value too. The tax breakup shown on the bill is scaled
// by (subtotal - discount) / subtotal, i.e. the discount is spread pro-rata
// over the lines. Loyalty points are a form of tender, not a price reduction,
// so redeeming them does not change the tax. Tips, delivery fees and the
// service charge are outside the taxable subtotal.
//
// Order of operations in computeBill (each step feeds the next):
//   1. subtotal = sum of tax-inclusive line totals.
//   2. discounts: manual % / flat + coupon / happy-hour (autoDiscount) +
//      BOGO free-item value. They stack additively and are capped together
//      at the subtotal, exactly as manual + auto already stacked.
//   3. tax breakup scaled pro-rata by (subtotal - discount) / subtotal.
//   4. service charge = serviceChargePercent % of the DISCOUNTED subtotal
//      (subtotal - discountAmount), i.e. the guest is not charged for what
//      was discounted away. It is additive, like a tip, and does not change
//      the tax breakup.
//   5. totalDue = subtotal - discounts - loyalty + service charge + tip
//      + delivery fee. Loyalty redemption still caps at the discounted
//      total (before service charge / tip / delivery), as before.
//
// Split payment: settlePayments below already takes any number of payment
// lines (cash / card / UPI / ...) against one balance. The sum must cover
// the balance exactly — a short payment is refused unless allowPartial was
// passed (recorded as a part-payment, the rest stays due), and an excess is
// refused unless a cash line can absorb it as change. See its own comment.

import { BadRequestException } from '@nestjs/common';
import { computeOrderTotals, round2, type PricedLine } from './pricing';

export interface BillInput {
  lines: PricedLine[];
  /** Manual percentage discount entered by the cashier. */
  discountPercent?: number;
  /** Manual flat discount entered by the cashier. */
  discountFlat?: number;
  /** Coupon / happy-hour discount resolved by the server. */
  autoDiscount?: number;
  /** Service charge percentage, applied to the discounted subtotal. */
  serviceChargePercent?: number;
  /** BOGO rule (buy `buyQty`, get `getQty` cheapest free); null/omitted = off. */
  bogoRule?: BogoRule | null;
  /** Currency value of the loyalty points the guest wants to redeem. */
  loyaltyDiscountRequested?: number;
  tip?: number;
  deliveryFee?: number;
}

/** Buy-one-get-one(-or-more) rule: buy `buyQty`, get `getQty` free. */
export interface BogoRule {
  /** Units the guest must pay for in each group (1 = buy-one-get-one). */
  buyQty: number;
  /** Cheapest units free in each group of buyQty + getQty. */
  getQty: number;
}

export interface Bill {
  subtotal: number;
  /** Manual + coupon/promotion + BOGO discount, never more than the subtotal. */
  discountAmount: number;
  /** discountAmount as a percentage of the subtotal (0 when there is none). */
  discountPercent: number;
  /** Value of the free item(s) under the BOGO offer (inside discountAmount). */
  bogoDiscountAmount: number;
  /** Tax breakup after the discount. */
  taxAmount: number;
  /** Service charge percent actually applied. */
  serviceChargePercent: number;
  /** Service charge amount, on top of the discounted subtotal. */
  serviceChargeAmount: number;
  loyaltyDiscountAmount: number;
  tipAmount: number;
  deliveryFee: number;
  /** What the guest owes: subtotal - discounts - loyalty + service charge + tip + delivery. */
  totalDue: number;
}

/**
 * Value of the free items under a BOGO rule. Every (buyQty + getQty) units
 * earn getQty free, and the free ones are always the cheapest units on the
 * bill — so on a 2x ₹100 + 1x ₹250 bill, buy-1-get-1 frees ₹100, not ₹250.
 * Lines without a unit price / quantity cannot be priced this way and are
 * skipped, so a caller that only has line totals gets no BOGO rather than a
 * wrong one. The result never exceeds the subtotal.
 */
export function computeBogoDiscount(
  lines: PricedLine[],
  rule: BogoRule | null | undefined,
): number {
  if (!rule) return 0;
  const buyQty = Math.floor(rule.buyQty);
  const getQty = Math.floor(rule.getQty);
  if (!(buyQty >= 1) || !(getQty >= 1)) return 0;
  const unitPrices: number[] = [];
  for (const line of lines) {
    const qty = Math.floor(line.quantity ?? 0);
    const unit = line.unitPriceInclusive;
    if (!(qty > 0) || !(unit !== undefined && unit > 0)) continue;
    for (let i = 0; i < qty; i++) unitPrices.push(round2(unit));
  }
  const groupSize = buyQty + getQty;
  const freeCount =
    Math.floor(unitPrices.length / groupSize) * getQty;
  if (freeCount <= 0) return 0;
  unitPrices.sort((a, b) => a - b);
  const subtotal = round2(
    lines.reduce((sum, l) => sum + l.lineTotal, 0),
  );
  return round2(
    Math.min(
      unitPrices.slice(0, freeCount).reduce((sum, p) => sum + p, 0),
      subtotal,
    ),
  );
}

export function computeBill(input: BillInput): Bill {
  const bogoDiscountAmount = computeBogoDiscount(input.lines, input.bogoRule);
  const totals = computeOrderTotals(
    input.lines,
    input.discountPercent ?? 0,
    (input.discountFlat ?? 0) +
      (input.autoDiscount ?? 0) +
      bogoDiscountAmount,
  );
  const serviceChargePercent = Math.min(
    Math.max(input.serviceChargePercent ?? 0, 0),
    100,
  );
  // On the discounted subtotal (step 4 above): no charge on discounted value.
  const serviceChargeAmount = round2(
    ((totals.subtotal - totals.discountAmount) * serviceChargePercent) / 100,
  );
  const loyaltyDiscountAmount = round2(
    Math.min(
      Math.max(input.loyaltyDiscountRequested ?? 0, 0),
      totals.totalAmount,
    ),
  );
  const tipAmount = round2(input.tip ?? 0);
  const deliveryFee = round2(input.deliveryFee ?? 0);
  const taxAmount =
    totals.subtotal > 0
      ? round2(
          (totals.taxAmount * (totals.subtotal - totals.discountAmount)) /
            totals.subtotal,
        )
      : 0;
  return {
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    discountPercent: discountPercentOf(totals.subtotal, totals.discountAmount),
    bogoDiscountAmount,
    taxAmount,
    serviceChargePercent,
    serviceChargeAmount,
    loyaltyDiscountAmount,
    tipAmount,
    deliveryFee,
    totalDue: round2(
      totals.totalAmount -
        loyaltyDiscountAmount +
        serviceChargeAmount +
        tipAmount +
        deliveryFee,
    ),
  };
}

/** The percentage equivalent of a currency discount, to 2 decimals. */
export function discountPercentOf(
  subtotal: number,
  discountAmount: number,
): number {
  if (subtotal <= 0 || discountAmount <= 0) return 0;
  return round2((discountAmount / subtotal) * 100);
}

/** How the manual discount was entered, for the audit trail and the bill. */
export function manualDiscountEntry(
  percent: number,
  flat: number,
): { type: 'PERCENT' | 'FIXED'; value: number } | null {
  if (percent > 0) return { type: 'PERCENT', value: round2(percent) };
  if (flat > 0) return { type: 'FIXED', value: round2(flat) };
  return null;
}

export interface PaymentLineInput {
  method: string;
  /** Applied to the bill. */
  amount: number;
  /** Cash handed over, if more than `amount`. */
  tendered?: number;
  reference?: string;
}

export interface SettledPayment {
  method: string;
  amount: number;
  tendered: number | null;
  changeGiven: number | null;
  reference?: string;
}

export interface Settlement {
  payments: SettledPayment[];
  /** Applied by these payments, including any gift card. */
  paidNow: number;
  /** Still owed after these payments. */
  balanceAfter: number;
  /** Change to hand back across the cash lines. */
  changeDue: number;
  fullyPaid: boolean;
}

/**
 * Validates and normalises a set of payments against what is still owed.
 *
 * `amount` on a stored payment is what was applied to the bill, so revenue and
 * the till stay right. Handing over more cash than due is recorded as
 * `tendered` with the difference as `changeGiven`. For older clients that
 * simply send an `amount` above the balance, the excess is treated as change
 * on the cash lines (last first); an excess no cash line can absorb is an
 * error, never a silent overpayment.
 */
export function settlePayments(args: {
  balance: number;
  payments: PaymentLineInput[];
  /** Already applied from a gift card in this same settlement. */
  giftCardApplied?: number;
  allowPartial?: boolean;
}): Settlement {
  const balance = round2(args.balance);
  const giftCardApplied = round2(args.giftCardApplied ?? 0);

  const lines: SettledPayment[] = args.payments.map((p) => {
    const amount = round2(p.amount);
    if (!(amount > 0)) {
      throw new BadRequestException('Each payment must be more than zero');
    }
    if (p.tendered !== undefined) {
      if (p.method !== 'CASH') {
        throw new BadRequestException(
          'Only a cash payment can have an amount received',
        );
      }
      const tendered = round2(p.tendered);
      if (tendered < amount) {
        throw new BadRequestException(
          'The amount received cannot be less than the payment',
        );
      }
      return {
        method: p.method,
        amount,
        tendered,
        changeGiven: round2(tendered - amount),
        reference: p.reference,
      };
    }
    return {
      method: p.method,
      amount,
      tendered: null,
      changeGiven: null,
      reference: p.reference,
    };
  });

  let excess = round2(
    lines.reduce((sum, l) => sum + l.amount, 0) + giftCardApplied - balance,
  );
  if (excess > 0) {
    for (let i = lines.length - 1; i >= 0 && excess > 0; i--) {
      const line = lines[i];
      if (line.method !== 'CASH') continue;
      const take = Math.min(excess, line.amount);
      const handedOver = line.tendered ?? line.amount;
      line.amount = round2(line.amount - take);
      line.tendered = handedOver;
      line.changeGiven = round2(handedOver - line.amount);
      excess = round2(excess - take);
    }
    if (excess > 0) {
      throw new BadRequestException(
        `Payments exceed the amount due (${balance}) - only cash can be over-tendered`,
      );
    }
  }

  const kept = lines.filter((l) => l.amount > 0);
  const paidNow = round2(
    kept.reduce((sum, l) => sum + l.amount, 0) + giftCardApplied,
  );
  const balanceAfter = round2(balance - paidNow);
  const fullyPaid = balanceAfter <= 0;

  if (!fullyPaid && !args.allowPartial) {
    throw new BadRequestException(
      `Payments (${paidNow}) do not cover the total due (${balance})`,
    );
  }
  if (!fullyPaid && paidNow <= 0) {
    throw new BadRequestException('Enter a payment to record');
  }

  return {
    payments: kept,
    paidNow,
    balanceAfter: Math.max(balanceAfter, 0),
    changeDue: round2(kept.reduce((sum, l) => sum + (l.changeGiven ?? 0), 0)),
    fullyPaid,
  };
}

/**
 * Discount guardrails for a manual (cashier-entered) discount.
 *
 * The cap is a share of the bill subtotal, so a flat amount is compared by its
 * percentage equivalent. Coupons and happy hour are rule-driven, not typed in,
 * and are not subject to the cap. Throws when the discount is over the cap for
 * someone without the override, or when a reason is required but missing.
 */
export function assertManualDiscountAllowed(args: {
  subtotal: number;
  discountPercent?: number;
  discountFlat?: number;
  /** Restaurant cap in percent; 100 means no cap. */
  maxPercent: number;
  requireReason: boolean;
  reason?: string;
  /** discounts.unlimited, or an owner/administrator. */
  mayExceedCap: boolean;
}): void {
  const entry = manualDiscountEntry(
    args.discountPercent ?? 0,
    args.discountFlat ?? 0,
  );
  if (!entry) return;
  const percent =
    entry.type === 'PERCENT'
      ? entry.value
      : discountPercentOf(args.subtotal, entry.value);
  if (!args.mayExceedCap && percent > args.maxPercent) {
    throw new BadRequestException(
      `Discounts above ${args.maxPercent}% need a manager - this one is ${percent}%`,
    );
  }
  if (args.requireReason && !args.reason?.trim()) {
    throw new BadRequestException('Enter a reason for the discount');
  }
}
