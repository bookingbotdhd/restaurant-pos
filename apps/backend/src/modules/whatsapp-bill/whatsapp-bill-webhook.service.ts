import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WhatsAppBillSendStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppBillConfig } from './whatsapp-bill.config';

/**
 * Meta's X-Hub-Signature-256 header: `sha256=<hex hmac-sha256 of the exact
 * bytes received, keyed by the app secret>`. Compared in constant time.
 * Exported pure so tests can pin it — the same discipline as the
 * integration-hub HMAC verification (see docs/INTEGRATIONS.md).
 */
export function verifyMetaSignature(
  appSecret: string,
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');
  const given = signatureHeader.slice('sha256='.length);
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Meta delivery statuses, in the order a bill moves through them. */
const STATUS_RANK: Record<WhatsAppBillSendStatus, number> = {
  QUEUED: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4,
};

const META_TO_RECORD: Record<string, WhatsAppBillSendStatus> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
};

/**
 * Forward-only status transition. A receipt that arrives late or twice must
 * never move a bill backwards (DELIVERED → SENT), and FAILED is terminal
 * except that a failure arriving after READ is ignored — the customer
 * already read it. Returns the status to store, or null to leave the row
 * alone. Pure, so tests can pin the table.
 */
export function nextBillSendStatus(
  current: WhatsAppBillSendStatus,
  incoming: WhatsAppBillSendStatus,
): WhatsAppBillSendStatus | null {
  if (current === 'FAILED' || current === 'READ') return null;
  if (incoming === 'FAILED') return 'FAILED';
  return STATUS_RANK[incoming] > STATUS_RANK[current] ? incoming : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function metaErrorText(status: Record<string, unknown>): string | null {
  const errors = status.errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const first = errors[0];
  if (!isRecord(first)) return null;
  const parts = [first.code, first.title, first.message]
    .filter((p) => typeof p === 'string' || typeof p === 'number')
    .map(String);
  return parts.length > 0 ? parts.join(' — ').slice(0, 500) : null;
}

function metaTimestamp(status: Record<string, unknown>): Date | null {
  const ts = status.timestamp;
  const n = typeof ts === 'string' ? Number(ts) : typeof ts === 'number' ? ts : NaN;
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : null;
}

/**
 * Receives Meta's delivery/read receipts for bills we sent and advances
 * the matching WhatsAppBillSend row.
 *
 * Trust comes from the HMAC signature alone — this endpoint is deliberately
 * unauthenticated (Meta has no session), the same pattern as the
 * integration-hub webhook. Without WHATSAPP_APP_SECRET configured every
 * callback is refused: an unsigned status update is never applied.
 *
 * Unknown message ids are logged and acknowledged (HTTP 200): the receipt
 * belongs to a message this server did not send (or a row deleted since),
 * and Meta retries non-2xx deliveries, so failing would just re-deliver
 * the same unusable receipt. Inbound customer messages (value.messages)
 * are ignored — this webhook only tracks bill delivery, it is not a chat
 * inbox.
 */
@Injectable()
export class WhatsAppBillWebhookService {
  private readonly logger = new Logger(WhatsAppBillWebhookService.name);

  constructor(
    private readonly config: WhatsAppBillConfig,
    private readonly prisma: PrismaService,
  ) {}

  async receive(rawBody: Buffer, signatureHeader: string | undefined) {
    const appSecret = this.config.appSecret;
    if (!appSecret)
      throw new UnauthorizedException(
        'WhatsApp webhook is not configured: set WHATSAPP_APP_SECRET ' +
          '(see docs/WHATSAPP-BILL.md).',
      );
    if (!verifyMetaSignature(appSecret, rawBody, signatureHeader))
      throw new UnauthorizedException('Invalid Meta webhook signature.');

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Webhook body is not valid JSON.');
    }
    if (!isRecord(payload) || !Array.isArray(payload.entry)) {
      this.logger.warn('Meta WhatsApp webhook: no entry array — ignored.');
      return;
    }
    for (const entry of payload.entry) {
      if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
      for (const change of entry.changes) {
        if (!isRecord(change)) continue;
        const value = change.value;
        if (!isRecord(value) || !Array.isArray(value.statuses)) continue;
        for (const status of value.statuses) {
          if (isRecord(status)) await this.applyStatus(status);
        }
      }
    }
  }

  private async applyStatus(status: Record<string, unknown>) {
    const messageId = status.id;
    const rawStatus = status.status;
    if (typeof messageId !== 'string' || typeof rawStatus !== 'string') return;
    const incoming = META_TO_RECORD[rawStatus];
    if (!incoming) {
      this.logger.debug(`Meta WhatsApp status "${rawStatus}" — ignored.`);
      return;
    }
    const send = await this.prisma.whatsAppBillSend.findUnique({
      where: { providerMessageId: messageId },
    });
    if (!send) {
      this.logger.warn(
        `Meta WhatsApp status "${rawStatus}" for unknown message ` +
          `${messageId} — ignored.`,
      );
      return;
    }
    const next = nextBillSendStatus(send.status, incoming);
    if (!next) return;
    const at = metaTimestamp(status);
    await this.prisma.whatsAppBillSend.update({
      where: { id: send.id },
      data: {
        status: next,
        ...(next === 'SENT' && at ? { sentAt: at } : {}),
        ...(next === 'DELIVERED' && at ? { deliveredAt: at } : {}),
        ...(next === 'READ' && at ? { readAt: at } : {}),
        ...(next === 'FAILED'
          ? {
              failedAt: at ?? new Date(),
              error: metaErrorText(status) ?? 'Delivery failed (Meta).',
            }
          : {}),
      },
    });
  }
}
