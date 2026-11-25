import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import {
  BILL_SENDER_PROVIDER,
  type BillSenderProvider,
  type BillSendResult,
  type BillSummary,
} from './bill-sender.interface';
import {
  buildBillMessage,
  isUsablePhoneNumber,
  maskPhoneNumber,
  normalizePhoneNumber,
} from './bill-templates';

export interface SendBillInput {
  branchId: string;
  orderId: string;
  /** Staff member who tapped send — recorded in the audit log. */
  userId: string;
  /** Customer phone as stored, or a staff-typed override. Null when unknown. */
  to: string | null | undefined;
  bill: BillSummary;
}

export interface SendBillResult extends BillSendResult {
  provider: string;
  /** Recipient phone, digits only. */
  to: string;
}

/**
 * Sends one bill on WhatsApp, only when staff ask for that one bill.
 *
 * Guards, in order: the phone must be a real number; a provider must actually
 * be configured (the default noop is not — it refuses rather than faking a
 * send); the provider must report success. Every send is written to the
 * audit log (`order.bill_whatsapp_sent`) with the provider and message id,
 * so an owner can see exactly which bills went out. The message text itself
 * is never logged — it contains the customer's bill.
 *
 * This service never sends on its own: nothing calls it from checkout, from
 * a scheduler or from a campaign. The only caller is the opt-in endpoint
 * POST /v1/orders/:id/send-bill-whatsapp.
 */
@Injectable()
export class WhatsAppBillService {
  private readonly logger = new Logger(WhatsAppBillService.name);

  constructor(
    @Inject(BILL_SENDER_PROVIDER)
    private readonly provider: BillSenderProvider,
    private readonly audit: AuditService,
  ) {}

  get providerName(): string {
    return this.provider.name;
  }

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  async sendBill(input: SendBillInput): Promise<SendBillResult> {
    const to = normalizePhoneNumber(input.to);
    if (!isUsablePhoneNumber(to))
      throw new BadRequestException(
        'No phone number on file for this bill — add the customer’s phone ' +
          'number to the order, or pass one with the request.',
      );
    if (!this.provider.isConfigured())
      throw new BadRequestException(
        `WhatsApp bills are not set up on this server (provider ` +
          `"${this.provider.name}" is not configured). Set ` +
          `WHATSAPP_BILL_PROVIDER and its credentials — see ` +
          `docs/WHATSAPP-BILL.md.`,
      );

    const message = buildBillMessage(input.bill);
    const result = await this.provider.sendBill({
      to,
      bill: input.bill,
      message,
    });
    if (!result.ok)
      throw new BadRequestException(
        'The WhatsApp provider did not accept this bill — nothing was sent.',
      );

    this.logger.log(
      `WhatsApp bill for order #${input.bill.orderNumber} sent to ` +
        `${maskPhoneNumber(to)} via ${this.provider.name}` +
        `${result.messageId ? ` (message ${result.messageId})` : ''}.`,
    );
    await this.audit.record({
      userId: input.userId,
      action: 'order.bill_whatsapp_sent',
      entity: 'Order',
      entityId: input.orderId,
      metadata: {
        branchId: input.branchId,
        provider: this.provider.name,
        messageId: result.messageId ?? null,
      },
    });
    return { ...result, provider: this.provider.name, to };
  }
}
