import type { BillSummary } from './bill-sender.interface';

/** Digits only — the form WhatsApp providers and wa.me links expect. */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  return (phone ?? '').replace(/[^\d]/g, '');
}

/** A phone is usable when it looks like a real number (7–15 digits, E.164 range). */
export function isUsablePhoneNumber(phone: string | null | undefined): boolean {
  const digits = normalizePhoneNumber(phone);
  return digits.length >= 7 && digits.length <= 15;
}

/** Last 4 digits only — full numbers never go into logs. */
export function maskPhoneNumber(phone: string): string {
  const digits = normalizePhoneNumber(phone);
  return digits.length > 4 ? `••••${digits.slice(-4)}` : '••••';
}

function money(currency: string, amount: number): string {
  return `${currency} ${Number(amount).toFixed(2)}`;
}

/**
 * Plain-text bill message. WhatsApp renders *asterisks* as bold; no other
 * formatting is used, so the same text also works as an SMS fallback and in
 * a provider's template body. Zero-value lines (discount, tip, paid) are
 * left out so the bill stays short.
 *
 * Keep this free of anything the customer did not ask for: it is a bill, not
 * marketing — no offers, no links, no "rate us" ask.
 */
export function buildBillMessage(bill: BillSummary): string {
  const lines: string[] = [];
  lines.push(`*${bill.restaurantName}*`);
  if (bill.branchName) lines.push(bill.branchName);
  lines.push(`Bill #${bill.orderNumber} — ${bill.billedAt.slice(0, 10)}`);
  if (bill.customerName) lines.push(`Hi ${bill.customerName}, thank you!`);
  lines.push('');
  for (const item of bill.items) {
    const modifiers =
      item.modifiers.length > 0 ? ` (${item.modifiers.join(', ')})` : '';
    lines.push(
      `${item.quantity} x ${item.name}${modifiers} — ${money(bill.currency, item.lineTotal)}`,
    );
  }
  lines.push('');
  lines.push(`Subtotal: ${money(bill.currency, bill.subtotal)}`);
  if (bill.discountAmount > 0)
    lines.push(`Discount: -${money(bill.currency, bill.discountAmount)}`);
  if (bill.taxAmount > 0)
    lines.push(`Tax: ${money(bill.currency, bill.taxAmount)}`);
  if (bill.tipAmount > 0)
    lines.push(`Tip: ${money(bill.currency, bill.tipAmount)}`);
  lines.push(`*Total: ${money(bill.currency, bill.totalAmount)}*`);
  if (bill.amountPaid > 0)
    lines.push(`Paid: ${money(bill.currency, bill.amountPaid)}`);
  if (bill.balanceDue > 0)
    lines.push(`Balance due: ${money(bill.currency, bill.balanceDue)}`);
  if (bill.isProvisional)
    lines.push('', 'This bill is not paid yet — please pay at the counter.');
  lines.push('', `Thank you for visiting ${bill.restaurantName}!`);
  return lines.join('\n');
}

/**
 * Builds a BillSummary from the priced bill the orders flow already
 * produces (OrdersService.getBillForPrint): the order plus the server-priced
 * overrides, so a sent bill always matches the printed bill. The `source`
 * shape is structural on purpose — this module must not import the orders
 * module (that would be a circular dependency).
 */
export function buildBillSummary(source: {
  orderNumber: string;
  createdAt: Date | string;
  restaurantName: string;
  branchName?: string | null;
  currency: string;
  customerName?: string | null;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    modifiers: string[];
  }[];
  payments: { method: string; amount: number }[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  isProvisional: boolean;
}): BillSummary {
  return {
    orderNumber: source.orderNumber,
    restaurantName: source.restaurantName,
    branchName: source.branchName ?? null,
    currency: source.currency,
    billedAt:
      source.createdAt instanceof Date
        ? source.createdAt.toISOString()
        : source.createdAt,
    customerName: source.customerName ?? null,
    items: source.items,
    subtotal: source.subtotal,
    discountAmount: source.discountAmount,
    taxAmount: source.taxAmount,
    tipAmount: source.tipAmount,
    totalAmount: source.totalAmount,
    amountPaid: source.amountPaid,
    balanceDue: source.balanceDue,
    payments: source.payments,
    isProvisional: source.isProvisional,
  };
}
