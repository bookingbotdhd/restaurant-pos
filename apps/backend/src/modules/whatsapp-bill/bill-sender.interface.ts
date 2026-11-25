/**
 * WhatsApp bill — provider-agnostic sending.
 *
 * RestroOS has no WhatsApp account of its own, so a bill can only go out
 * through a messaging provider the restaurant brings (a WhatsApp Business
 * API / Twilio-type account — see docs/WHATSAPP-BILL.md). This interface is
 * the seam a real provider plugs into: implement it, register it in
 * whatsapp-bill.module.ts, and nothing else in the billing flow changes.
 *
 * Sending is always opt-in per bill (staff tap "Send bill on WhatsApp" on one
 * order). There is no bulk send and no automatic send on checkout — a bill
 * only ever goes to the customer of that one order.
 */

export interface BillLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Modifier names, e.g. ["Extra cheese"]. */
  modifiers: string[];
}

export interface BillPayment {
  method: string;
  amount: number;
}

/** Everything a bill message needs. Built from a priced bill — never from raw input. */
export interface BillSummary {
  orderNumber: string;
  restaurantName: string;
  branchName?: string | null;
  /** Currency code as stored on the restaurant, e.g. "INR". */
  currency: string;
  /** When the bill was raised, ISO string. */
  billedAt: string;
  customerName?: string | null;
  items: BillLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  payments: BillPayment[];
  /** True for an open order: the figures are the bill as previewed, not yet paid. */
  isProvisional: boolean;
}

export interface BillSendInput {
  /** Recipient phone, digits only (country code included), e.g. "919876543210". */
  to: string;
  bill: BillSummary;
  /** Rendered message text (see bill-templates.ts). */
  message: string;
}

export interface BillSendResult {
  ok: boolean;
  /** Provider's message id, when the provider returns one. */
  messageId?: string | null;
}

/**
 * One WhatsApp (or WhatsApp-capable) provider. A provider must never claim
 * success it did not get: if the message was not accepted by the provider,
 * throw — the caller reports the failure to staff instead of logging a
 * send that never happened.
 */
export interface BillSenderProvider {
  /** Short id used in logs, audit rows and API responses, e.g. "noop". */
  readonly name: string;
  /** False when the provider has no credentials configured. */
  isConfigured(): boolean;
  sendBill(input: BillSendInput): Promise<BillSendResult>;
}

/** NestJS injection token for the active BillSenderProvider. */
export const BILL_SENDER_PROVIDER = 'BILL_SENDER_PROVIDER';
