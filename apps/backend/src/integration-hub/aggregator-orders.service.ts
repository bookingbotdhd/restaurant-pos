import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { OrdersService } from '../modules/orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from './secret-box';
import { resolveAggregatorEnvConfig } from './aggregator-config';
import { getProvider, sourceOf } from './providers/registry';
import type { IntegrationProvider } from './providers/provider';

/** Deliveries older (or newer) than this are refused, which bounds replays. */
const MAX_SKEW_SECONDS = 5 * 60;

const text = (max: number) => z.string().trim().max(max);

// The canonical payload. An aggregator (or a small mapping script in front of a
// platform's merchant webhook) sends this; nothing monetary is read from it -
// prices, tax and fees are recomputed from the live menu.
export const aggregatorEventSchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('ping') }),
  z.object({
    event: z.literal('order.cancelled'),
    orderId: text(120).min(1),
    // Only honoured on the generic `aggregator` endpoint (see
    // resolveOrderSource); the zomato/swiggy endpoints file under their own
    // name so the source cannot be spoofed.
    platform: z.enum(['zomato', 'swiggy']).optional(),
    reason: text(300).optional(),
  }),
  z.object({
    event: z.literal('order.created'),
    orderId: text(120).min(1),
    platform: z.enum(['zomato', 'swiggy']).optional(),
    branchId: text(60).optional(),
    type: z.enum(['DELIVERY', 'TAKEAWAY']).default('DELIVERY'),
    paymentMode: z.enum(['PREPAID', 'COD']).optional(),
    customer: z.object({
      name: text(120).min(1),
      phone: text(20).min(5),
      email: text(200).optional(),
      ref: text(120).optional(),
    }),
    delivery: z
      .object({ address: text(300).min(1), pincode: text(10).optional() })
      .optional(),
    notes: text(500).optional(),
    items: z
      .array(
        z
          .object({
            menuItemId: text(60).optional(),
            name: text(200).optional(),
            quantity: z.number().int().min(1).max(99),
            kitchenNote: text(200).optional(),
          })
          .refine((i) => i.menuItemId || i.name, {
            message: 'Each item needs menuItemId or name',
          }),
      )
      .min(1)
      .max(100),
  }),
]);
export type AggregatorEvent = z.infer<typeof aggregatorEventSchema>;

export function signAggregatorBody(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
}

/**
 * Which platform an order is filed under (`externalSource`). The Zomato and
 * Swiggy endpoints always file under their own name, so a caller cannot
 * spoof the source. The single generic `aggregator` endpoint (one webhook
 * for UrbanPiper / Petpooja / Dotpe forwarding several platforms) files
 * under `aggregator` unless the event names its platform — without that,
 * a Zomato order and a Swiggy order arriving through the same aggregator
 * would be indistinguishable in the order list.
 */
export function resolveOrderSource(
  provider: IntegrationProvider,
  platform?: 'zomato' | 'swiggy',
): string {
  if (provider.key === 'aggregator' && platform) return platform;
  return sourceOf(provider);
}

@Injectable()
export class AggregatorOrdersService {
  private readonly logger = new Logger(AggregatorOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly config: ConfigService,
  ) {}

  private async log(
    connectionId: string | null,
    level: 'INFO' | 'WARN' | 'ERROR',
    event: string,
    message: string,
  ) {
    // Env-configured webhooks have no IntegrationConnection row, so there is
    // nowhere to write a log line; the delivery itself is still answered.
    if (!connectionId) return;
    await this.prisma.integrationLog.create({
      data: { connectionId, level, event, message: message.slice(0, 500) },
    });
  }

  /** Verifies the signature, then handles one event. Every refusal is a plain 401. */
  async receive(
    restaurantId: string,
    providerKey: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ) {
    const deny = () => new UnauthorizedException('Invalid webhook signature');
    const provider = getProvider(providerKey);
    if (!provider || !provider.capabilities.receiveOrders) throw deny();
    const conn = await this.prisma.integrationConnection.findUnique({
      where: { restaurantId_provider: { restaurantId, provider: providerKey } },
    });

    // Where the signing secret comes from, in order:
    // 1. The restaurant's saved connection (Settings -> Integrations). If a
    //    connection exists, it is the only source: a disabled connection is
    //    never re-enabled by the environment.
    // 2. The AGGREGATOR_<PROVIDER>_WEBHOOK_SECRET environment variable, for
    //    single-restaurant self-hosted installs that configure the webhook
    //    in deployment config instead of the UI (see aggregator-config.ts).
    //    No variable set means no fallback, so "refused while nothing is
    //    set up" stays true.
    let secret: string | undefined;
    const connectionId: string | null = conn?.id ?? null;
    if (conn) {
      if (!conn.enabled || !conn.credentialsEnc) throw deny();
      try {
        secret = (
          JSON.parse(
            decryptSecret(
              conn.credentialsEnc,
              `${restaurantId}:${providerKey}`,
            ),
          ) as Record<string, string>
        ).webhookSecret;
      } catch {
        secret = undefined;
      }
    } else {
      const env = resolveAggregatorEnvConfig(providerKey, (k) =>
        this.config.get<string>(k),
      );
      if (env.secretTooShort) {
        this.logger.warn(
          `AGGREGATOR_${providerKey.toUpperCase()}_WEBHOOK_SECRET is shorter than 16 characters and will not be used`,
        );
      }
      if (env.enabled && env.webhookSecret) secret = env.webhookSecret;
    }
    if (!secret) throw deny();

    const header = (n: string) => {
      const v = headers[n];
      return Array.isArray(v) ? v[0] : v;
    };
    const ts = header('x-restroos-timestamp') ?? '';
    const sig = header('x-restroos-signature') ?? '';
    const age = Math.abs(Date.now() / 1000 - Number(ts));
    const expected = signAggregatorBody(secret, ts, rawBody);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    const okSig = a.length === b.length && timingSafeEqual(a, b);
    if (!okSig || !Number.isFinite(age) || age > MAX_SKEW_SECONDS) {
      await this.log(
        connectionId,
        'WARN',
        'webhook_rejected',
        !okSig
          ? 'A delivery was refused: signature did not match the saved secret'
          : 'A delivery was refused: timestamp outside the 5 minute window',
      );
      throw deny();
    }

    let parsed: AggregatorEvent;
    try {
      parsed = aggregatorEventSchema.parse(JSON.parse(rawBody));
    } catch (e) {
      const msg =
        e instanceof z.ZodError
          ? e.issues
              .slice(0, 3)
              .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
              .join('; ')
          : 'Body is not valid JSON';
      await this.log(connectionId, 'WARN', 'webhook_invalid', msg);
      throw new BadRequestException(`Invalid payload - ${msg}`);
    }

    const markGood = (event: string, message: string) => {
      // Env-configured webhooks have no connection row to mark Connected;
      // the 200 response is the confirmation there.
      if (!connectionId) return Promise.resolve();
      return this.prisma.integrationConnection
        .update({
          where: { id: connectionId },
          data: {
            status: 'CONNECTED',
            lastSyncAt: new Date(),
            lastSuccessAt: new Date(),
            lastError: null,
          },
        })
        .then(() => this.log(connectionId, 'INFO', event, message));
    };

    if (parsed.event === 'ping') {
      await markGood('webhook_ping', 'Signed test event received');
      return { ok: true };
    }
    const source = resolveOrderSource(provider, parsed.platform);
    if (parsed.event === 'order.cancelled') {
      return this.cancel(connectionId, restaurantId, source, parsed, markGood);
    }
    try {
      const res = await this.createOrder(restaurantId, source, parsed);
      await markGood(
        'order_received',
        `${provider.name} order ${parsed.orderId} -> #${res.orderNumber}${res.duplicate ? ' (repeat delivery, ignored)' : ''}`,
      );
      return res;
    } catch (e) {
      const msg = (e as Error).message;
      if (connectionId) {
        await this.prisma.integrationConnection.update({
          where: { id: connectionId },
          data: { lastSyncAt: new Date(), lastError: msg.slice(0, 500) },
        });
      }
      await this.log(
        connectionId,
        'ERROR',
        'order_failed',
        `Order ${parsed.orderId}: ${msg}`,
      );
      throw e;
    }
  }

  private async cancel(
    connectionId: string | null,
    restaurantId: string,
    source: string,
    ev: Extract<AggregatorEvent, { event: 'order.cancelled' }>,
    markGood: (event: string, message: string) => Promise<unknown>,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        externalSource: source,
        externalOrderId: ev.orderId,
        branch: { restaurantId },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'OPEN' && order.acceptance === 'PENDING') {
      const userId = await this.staffFor(order.branchId);
      await this.orders.rejectOrder(
        order.branchId,
        order.id,
        userId,
        ev.reason || 'Cancelled by the platform',
      );
      await markGood('order_cancelled', `Order ${ev.orderId} cancelled`);
      return { ok: true, cancelled: true };
    }
    // Already accepted or in the kitchen: a person must decide, not a webhook.
    await this.log(
      connectionId,
      'WARN',
      'cancel_needs_attention',
      `Platform cancelled ${ev.orderId} but #${order.orderNumber} is already accepted - cancel it manually if needed`,
    );
    return { ok: true, cancelled: false, needsAttention: true };
  }

  private async staffFor(branchId: string): Promise<string> {
    const id = (
      await this.prisma.userBranch.findFirst({
        where: { branchId },
        orderBy: { userId: 'asc' },
      })
    )?.userId;
    if (!id) throw new NotFoundException('This location has no staff');
    return id;
  }

  private async createOrder(
    restaurantId: string,
    source: string,
    ev: Extract<AggregatorEvent, { event: 'order.created' }>,
  ) {
    const branches = await this.prisma.branch.findMany({
      where: { restaurantId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    let branchId: string;
    if (ev.branchId) {
      if (!branches.some((b) => b.id === ev.branchId)) {
        throw new UnprocessableEntityException('Unknown branchId');
      }
      branchId = ev.branchId;
    } else if (branches.length === 1) {
      branchId = branches[0].id;
    } else {
      throw new UnprocessableEntityException(
        'branchId is required when the restaurant has several branches',
      );
    }

    const existing = await this.prisma.order.findFirst({
      where: {
        branchId,
        externalSource: source,
        externalOrderId: ev.orderId,
      },
      select: { id: true, orderNumber: true },
    });
    if (existing) {
      return { ok: true, duplicate: true, ...this.ref(existing) };
    }

    // Match every line to the live menu; one miss refuses the whole order so
    // the platform sees a failure instead of the kitchen silently losing a dish.
    const menu = await this.prisma.menuItem.findMany({
      where: { branchId },
      select: { id: true, name: true },
    });
    const byId = new Map(menu.map((m) => [m.id, m.id]));
    const byName = new Map(
      menu.map((m) => [m.name.trim().toLowerCase(), m.id]),
    );
    const unmatched: string[] = [];
    const lines = ev.items.flatMap((i) => {
      const id =
        (i.menuItemId && byId.get(i.menuItemId)) ||
        (i.name && byName.get(i.name.trim().toLowerCase()));
      if (!id) {
        unmatched.push(i.name ?? i.menuItemId ?? '?');
        return [];
      }
      return [
        {
          menuItemId: id,
          quantity: i.quantity,
          modifierIds: [] as string[],
          kitchenNote: i.kitchenNote,
        },
      ];
    });
    if (unmatched.length) {
      throw new UnprocessableEntityException(
        `Items not found on the menu: ${[...new Set(unmatched)].join(', ')}`,
      );
    }
    if (ev.type === 'DELIVERY' && !ev.delivery) {
      throw new UnprocessableEntityException(
        'delivery.address is required for delivery orders',
      );
    }

    const phone = ev.customer.phone;
    const found = await this.prisma.customer.findFirst({
      where: { branchId, phone },
    });
    const customer =
      found ??
      (await this.prisma.customer.create({
        data: {
          branchId,
          name: ev.customer.name,
          phone,
          email: ev.customer.email,
        },
      }));
    const createdById = await this.staffFor(branchId);
    const label = source.charAt(0).toUpperCase() + source.slice(1);
    const pay =
      ev.paymentMode === 'PREPAID'
        ? ' - PAID online'
        : ev.paymentMode === 'COD'
          ? ' - COLLECT cash on delivery'
          : '';
    const notes = `[${label} #${ev.orderId}${pay}] ${ev.notes ?? ''}`.trim();

    for (let attempt = 1; ; attempt++) {
      try {
        const created = await this.orders.createOrder(
          branchId,
          createdById,
          {
            type: ev.type,
            customerId: customer.id,
            guestName: ev.customer.name,
            notes,
            delivery:
              ev.type === 'DELIVERY' && ev.delivery
                ? {
                    address: ev.delivery.address,
                    pincode: ev.delivery.pincode,
                    phone,
                  }
                : undefined,
            items: lines,
          } as Parameters<OrdersService['createOrder']>[2],
          {
            channel: 'ONLINE',
            requireAcceptance: true,
            externalSource: source,
            externalOrderId: ev.orderId,
            externalCustomerRef: ev.customer.ref,
          },
        );
        return { ok: true, duplicate: false, ...this.ref(created) };
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          // The same platform order raced in twice, or two orders raced for a number.
          const dup = await this.prisma.order.findFirst({
            where: {
              branchId,
              externalSource: source,
              externalOrderId: ev.orderId,
            },
            select: { id: true, orderNumber: true },
          });
          if (dup) return { ok: true, duplicate: true, ...this.ref(dup) };
          if (attempt < 3) continue;
        }
        throw err;
      }
    }
  }

  private ref(o: { id: string; orderNumber: number | string }) {
    return { orderId: o.id, orderNumber: o.orderNumber };
  }
}
