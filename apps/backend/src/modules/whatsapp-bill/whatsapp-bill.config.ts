import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * WhatsApp bill settings — environment variables only, never the database
 * and never committed values (see apps/backend/.env.example):
 *
 *   WHATSAPP_BILL_PROVIDER        Which provider sends bills. Default "noop"
 *                                 (sends nothing). Reserved names for future
 *                                 providers: "meta-cloud", "twilio".
 *   WHATSAPP_BILL_TEMPLATE_NAME   Approved template name, when the provider
 *                                 needs one (Meta requires an approved
 *                                 utility template for business-initiated
 *                                 messages). Unused by the noop provider.
 *
 * Provider credentials live in their own variables (WHATSAPP_API_TOKEN /
 * WHATSAPP_PHONE_NUMBER_ID for Meta Cloud, TWILIO_ACCOUNT_SID /
 * TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM for Twilio). Those names are
 * reserved for the future provider implementations — setting them alone
 * does nothing until that provider is implemented and registered.
 */
@Injectable()
export class WhatsAppBillConfig {
  constructor(private readonly config: ConfigService) {}

  get providerName(): string {
    return (
      this.config.get<string>('WHATSAPP_BILL_PROVIDER')?.trim().toLowerCase() ||
      'noop'
    );
  }

  get templateName(): string | undefined {
    return (
      this.config.get<string>('WHATSAPP_BILL_TEMPLATE_NAME')?.trim() ||
      undefined
    );
  }
}
