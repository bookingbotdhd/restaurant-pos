import { Injectable, Logger } from '@nestjs/common';
import type {
  BillSenderProvider,
  BillSendInput,
  BillSendResult,
} from './bill-sender.interface';
import { maskPhoneNumber } from './bill-templates';
import { WhatsAppBillConfig } from './whatsapp-bill.config';

/**
 * Meta WhatsApp Business Cloud API provider ("meta-cloud").
 *
 * Sends the bill as an approved utility template message:
 * POST https://graph.facebook.com/{version}/{phone-number-id}/messages
 * with a Bearer access token. The bill text from bill-templates.ts goes in
 * as the template body's single {{1}} parameter, so the template the owner
 * creates in Meta's dashboard is just a utility template whose body is
 * "{{1}}" (see docs/WHATSAPP-BILL.md) — the code never invents template
 * text, and the sent bill always matches the printed bill.
 *
 * No new dependencies: the global fetch, bounded to 15 s with redirects
 * refused (a redirect would resend the Bearer token elsewhere), the same
 * shape as the payment-gateway outbound helper. The token and the message
 * text never reach logs — only the masked phone and Meta's message id.
 *
 * Nothing here talks to Meta at import or startup time. isConfigured() is
 * false until WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_TOKEN and
 * WHATSAPP_BILL_TEMPLATE_NAME are all set, so the service keeps refusing
 * with a clear "not set up" 400 until the owner wires the account up.
 */
export interface MetaTemplateMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components: {
      type: 'body';
      parameters: { type: 'text'; text: string }[];
    }[];
  };
}

/** Pure payload builder, exported so tests can pin the exact shape. */
export function buildMetaTemplatePayload(
  input: BillSendInput,
  templateName: string,
  languageCode: string,
): MetaTemplateMessagePayload {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: input.to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: input.message }],
        },
      ],
    },
  };
}

interface MetaErrorBody {
  error?: {
    message?: unknown;
    code?: unknown;
    error_subcode?: unknown;
  };
}

interface MetaSendResponse {
  messages?: { id?: unknown }[];
}

/** Meta's error text, truncated — never echoes request headers or body. */
function metaErrorMessage(json: unknown): string | null {
  const j = (json ?? {}) as MetaErrorBody;
  const m = j.error?.message;
  return typeof m === 'string' ? m.slice(0, 200) : null;
}

@Injectable()
export class MetaWhatsAppCloudApiProvider implements BillSenderProvider {
  readonly name = 'meta-cloud';
  private readonly logger = new Logger(MetaWhatsAppCloudApiProvider.name);

  constructor(private readonly config: WhatsAppBillConfig) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.phoneNumberId &&
        this.config.apiToken &&
        this.config.templateName,
    );
  }

  async sendBill(input: BillSendInput): Promise<BillSendResult> {
    const phoneNumberId = this.config.phoneNumberId;
    const token = this.config.apiToken;
    const templateName = this.config.templateName;
    if (!phoneNumberId || !token || !templateName)
      throw new Error(
        'Meta WhatsApp Cloud API is not configured: set ' +
          'WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_TOKEN and ' +
          'WHATSAPP_BILL_TEMPLATE_NAME (see docs/WHATSAPP-BILL.md).',
      );

    const url =
      `https://graph.facebook.com/${this.config.apiVersion}/` +
      `${phoneNumberId}/messages`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          buildMetaTemplatePayload(
            input,
            templateName,
            this.config.templateLanguage,
          ),
        ),
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error('Meta WhatsApp Cloud API could not be reached');
    }
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok)
      throw new Error(
        metaErrorMessage(json) ??
          `Meta WhatsApp Cloud API answered HTTP ${res.status}`,
      );
    const messageId = (json as MetaSendResponse)?.messages?.[0]?.id;
    if (typeof messageId !== 'string' || !messageId)
      throw new Error(
        'Meta WhatsApp Cloud API accepted the bill but returned no ' +
          'message id — treating it as not sent.',
      );
    this.logger.log(
      `WhatsApp bill for order #${input.bill.orderNumber} accepted by ` +
        `Meta for ${maskPhoneNumber(input.to)} (message ${messageId}).`,
    );
    return { ok: true, messageId, templateName };
  }
}
