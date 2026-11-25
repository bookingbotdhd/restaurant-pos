import { Logger, Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import {
  BILL_SENDER_PROVIDER,
  type BillSenderProvider,
} from './bill-sender.interface';
import { NoopBillSenderProvider } from './noop-bill-sender.provider';
import { WhatsAppBillConfig } from './whatsapp-bill.config';
import { WhatsAppBillService } from './whatsapp-bill.service';

/**
 * WhatsApp bill module. The active provider is chosen by the
 * WHATSAPP_BILL_PROVIDER environment variable (see whatsapp-bill.config.ts).
 *
 * Today only "noop" exists: it sends nothing and the service refuses with a
 * clear error. To plug in a real provider, implement BillSenderProvider
 * (e.g. Meta WhatsApp Business Cloud API, Twilio), add it as a provider
 * here, and return it from the factory for its WHATSAPP_BILL_PROVIDER name
 * — the service, endpoint and UI need no changes.
 *
 * An unknown provider name falls back to noop with a warning rather than
 * crashing the server at startup: a typo in an env var must never take the
 * till down.
 */
@Module({
  imports: [AuditModule],
  providers: [
    WhatsAppBillConfig,
    NoopBillSenderProvider,
    {
      provide: BILL_SENDER_PROVIDER,
      useFactory: (
        config: WhatsAppBillConfig,
        noop: NoopBillSenderProvider,
      ): BillSenderProvider => {
        if (config.providerName === 'noop') return noop;
        new Logger(WhatsAppBillModule.name).warn(
          `Unknown WHATSAPP_BILL_PROVIDER "${config.providerName}" — ` +
            `falling back to the noop provider (bills will not be sent). ` +
            `See docs/WHATSAPP-BILL.md.`,
        );
        return noop;
      },
      inject: [WhatsAppBillConfig, NoopBillSenderProvider],
    },
    WhatsAppBillService,
  ],
  exports: [WhatsAppBillService],
})
export class WhatsAppBillModule {}
