import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { WhatsAppBillConfig } from './whatsapp-bill.config';
import { WhatsAppBillWebhookService } from './whatsapp-bill-webhook.service';

// Deliberately unauthenticated: the caller is Meta's webhook, which has no
// session. Trust comes from the HMAC signature over the exact bytes
// received (WHATSAPP_APP_SECRET) — the same pattern as the integration-hub
// webhook — and from the verify token on the GET handshake. The raw body
// is available because main.ts creates the app with `rawBody: true`.
@ApiTags('whatsapp-bill')
@Controller('v1/whatsapp-bill/webhook')
export class WhatsAppBillWebhookController {
  constructor(
    private readonly svc: WhatsAppBillWebhookService,
    private readonly config: WhatsAppBillConfig,
  ) {}

  // Meta's verification handshake when the webhook URL is registered:
  // GET ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=… — answer
  // with the challenge verbatim when the token matches ours.
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const verifyToken = this.config.verifyToken;
    if (
      mode === 'subscribe' &&
      verifyToken &&
      token === verifyToken &&
      challenge
    )
      return challenge;
    throw new ForbiddenException('WhatsApp webhook verification failed.');
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @HttpCode(200)
  @Post()
  async receive(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    if (!req.rawBody) throw new BadRequestException('Empty body');
    await this.svc.receive(req.rawBody, signature);
    return { received: true };
  }
}
