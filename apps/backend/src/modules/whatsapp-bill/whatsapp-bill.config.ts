import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * WhatsApp bill settings — environment variables only, never the database
 * and never committed values (see apps/backend/.env.example):
 *
 *   WHATSAPP_BILL_PROVIDER        Which provider sends bills. Default "noop"
 *                                 (sends nothing). Implemented: "meta-cloud"
 *                                 (Meta WhatsApp Business Cloud API).
 *                                 Reserved for a future provider: "twilio".
 *   WHATSAPP_BILL_TEMPLATE_NAME   Approved utility template name. Required
 *                                 by the Meta provider — WhatsApp only lets
 *                                 a business start a conversation with an
 *                                 approved template.
 *   WHATSAPP_BILL_TEMPLATE_LANGUAGE  Template language code, default "en".
 *   WHATSAPP_PHONE_NUMBER_ID      Meta phone-number ID that sends the bill.
 *   WHATSAPP_API_TOKEN            Meta access token (a permanent token for
 *                                 the WhatsApp Business app).
 *   WHATSAPP_API_VERSION          Pinned Graph API version, e.g. "v21.0".
 *                                 Check Meta's docs for the current version
 *                                 when setting the account up.
 *   WHATSAPP_APP_SECRET           Meta app secret — verifies the
 *                                 X-Hub-Signature-256 header on the status
 *                                 webhook. Without it the webhook refuses
 *                                 every callback.
 *   WHATSAPP_VERIFY_TOKEN         Token Meta must present when verifying
 *                                 the webhook URL (hub.verify_token).
 *
 * Twilio credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
 * TWILIO_WHATSAPP_FROM) are still reserved names for a future provider —
 * setting them alone does nothing.
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

  get templateLanguage(): string {
    return (
      this.config.get<string>('WHATSAPP_BILL_TEMPLATE_LANGUAGE')?.trim() ||
      'en'
    );
  }

  get phoneNumberId(): string | undefined {
    return (
      this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim() || undefined
    );
  }

  get apiToken(): string | undefined {
    return (
      this.config.get<string>('WHATSAPP_API_TOKEN')?.trim() || undefined
    );
  }

  /**
   * Pinned Graph API version. Default "v21.0" — confirm the current
   * version in Meta's docs when the account is set up and override with
   * WHATSAPP_API_VERSION if it has moved on; Meta drops old versions.
   */
  get apiVersion(): string {
    return (
      this.config.get<string>('WHATSAPP_API_VERSION')?.trim() || 'v21.0'
    );
  }

  get appSecret(): string | undefined {
    return (
      this.config.get<string>('WHATSAPP_APP_SECRET')?.trim() || undefined
    );
  }

  get verifyToken(): string | undefined {
    return (
      this.config.get<string>('WHATSAPP_VERIFY_TOKEN')?.trim() || undefined
    );
  }
}
