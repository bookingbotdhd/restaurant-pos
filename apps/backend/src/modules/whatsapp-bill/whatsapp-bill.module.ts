import { Logger, Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import {
  BILL_SENDER_PROVIDER,
  type BillSenderProvider,
} from './bill-sender.interface';
import { MetaWhatsAppCloudApiProvider } from './meta-whatsapp-cloud-api.provider';
import { NoopBillSenderProvider } from './noop-bill-sender.provider';
import { WhatsAppBillConfig } from './whatsapp-bill.config';
import { WhatsAppBillService } from './whatsapp-bill.service';
import { WhatsAppBillWebhookController } from './whatsapp-bill-webhook.controller';
import { WhatsAppBillWebhookService } from './whatsapp-bill-webhook.service';

/**
 * WhatsApp bill module. The active provider is chosen by the
 * WHATSAPP_BILL_PROVIDER environment variable (see whatsapp-bill.config.ts).
 *
 * "noop" (default) sends nothing and the service refuses with a clear
 * error. "meta-cloud" sends via the Meta WhatsApp Business Cloud API and
 * needs WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_TOKEN and an approved
 * WHATSAPP_BILL_TEMPLATE_NAME; until those are set its isConfigured() is
 * false and the service refuses exactly like noop — nothing is sent or
 * pretended sent. Delivery receipts arrive on the public webhook
 * (POST /v1/whatsapp-bill/webhook, HMAC-verified with WHATSAPP_APP_SECRET)
 * and advance the WhatsAppBillSend row for that bill.
 *
 * An unknown provider name falls back to noop with a warning rather than
 * crashing the server at startup: a typo in an env var must never take the
 * till down.
 */
@Module({
  imports: [AuditModule],
  controllers: [WhatsAppBillWebhookController],
  providers: [
    WhatsAppBillConfig,
    NoopBillSenderProvider,
    MetaWhatsAppCloudApiProvider,
    WhatsAppBillWebhookService,
    {
      provide: BILL_SENDER_PROVIDER,
      useFactory: (
        config: WhatsAppBillConfig,
        noop: NoopBillSenderProvider,
        meta: MetaWhatsAppCloudApiProvider,
      ): BillSenderProvider => {
        if (config.providerName === 'noop') return noop;
        if (config.providerName === 'meta-cloud') return meta;
        new Logger(WhatsAppBillModule.name).warn(
          `Unknown WHATSAPP_BILL_PROVIDER "${config.providerName}" — ` +
            `falling back to the noop provider (bills will not be sent). ` +
            `See docs/WHATSAPP-BILL.md.`,
        );
        return noop;
      },
      inject: [
        WhatsAppBillConfig,
        NoopBillSenderProvider,
        MetaWhatsAppCloudApiProvider,
      ],
    },
    WhatsAppBillService,
  ],
  exports: [WhatsAppBillService],
})
export class WhatsAppBillModule {}
