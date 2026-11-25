import { Injectable, Logger } from '@nestjs/common';
import type {
  BillSenderProvider,
  BillSendInput,
  BillSendResult,
} from './bill-sender.interface';
import { maskPhoneNumber } from './bill-templates';

/**
 * DEFAULT PROVIDER — sends nothing.
 *
 * This is the provider RestroOS ships with, on purpose: there is no
 * WhatsApp account bundled with the app, and silently pretending a bill was
 * sent would be worse than refusing. `isConfigured()` is false, so the
 * service refuses with a clear "not set up" error before this is ever
 * called; if it is called anyway it logs a warning and throws — it never
 * returns a fake success.
 *
 * To go live, implement BillSenderProvider for a real provider (Meta
 * WhatsApp Business Cloud API, Twilio, …) and register it in
 * whatsapp-bill.module.ts. See docs/WHATSAPP-BILL.md.
 */
@Injectable()
export class NoopBillSenderProvider implements BillSenderProvider {
  readonly name = 'noop';
  private readonly logger = new Logger(NoopBillSenderProvider.name);

  isConfigured(): boolean {
    return false;
  }

  async sendBill(input: BillSendInput): Promise<BillSendResult> {
    this.logger.warn(
      `WhatsApp bill for order #${input.bill.orderNumber} to ${maskPhoneNumber(input.to)} was NOT sent: ` +
        `no WhatsApp provider is configured (WHATSAPP_BILL_PROVIDER=noop). ` +
        `See docs/WHATSAPP-BILL.md.`,
    );
    throw new Error(
      'WhatsApp bill sending is not configured: set WHATSAPP_BILL_PROVIDER ' +
        'to a real provider (see docs/WHATSAPP-BILL.md).',
    );
  }
}
