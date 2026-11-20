"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AggregatorOrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregatorOrdersService = exports.aggregatorEventSchema = void 0;
exports.signAggregatorBody = signAggregatorBody;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
const orders_service_1 = require("../modules/orders/orders.service");
const prisma_service_1 = require("../prisma/prisma.service");
const secret_box_1 = require("./secret-box");
const registry_1 = require("./providers/registry");
const MAX_SKEW_SECONDS = 5 * 60;
const text = (max) => zod_1.z.string().trim().max(max);
exports.aggregatorEventSchema = zod_1.z.discriminatedUnion('event', [
    zod_1.z.object({ event: zod_1.z.literal('ping') }),
    zod_1.z.object({
        event: zod_1.z.literal('order.cancelled'),
        orderId: text(120).min(1),
        reason: text(300).optional(),
    }),
    zod_1.z.object({
        event: zod_1.z.literal('order.created'),
        orderId: text(120).min(1),
        branchId: text(60).optional(),
        type: zod_1.z.enum(['DELIVERY', 'TAKEAWAY']).default('DELIVERY'),
        paymentMode: zod_1.z.enum(['PREPAID', 'COD']).optional(),
        customer: zod_1.z.object({
            name: text(120).min(1),
            phone: text(20).min(5),
            email: text(200).optional(),
            ref: text(120).optional(),
        }),
        delivery: zod_1.z
            .object({ address: text(300).min(1), pincode: text(10).optional() })
            .optional(),
        notes: text(500).optional(),
        items: zod_1.z
            .array(zod_1.z
            .object({
            menuItemId: text(60).optional(),
            name: text(200).optional(),
            quantity: zod_1.z.number().int().min(1).max(99),
            kitchenNote: text(200).optional(),
        })
            .refine((i) => i.menuItemId || i.name, {
            message: 'Each item needs menuItemId or name',
        }))
            .min(1)
            .max(100),
    }),
]);
function signAggregatorBody(secret, timestamp, rawBody) {
    return `sha256=${(0, node_crypto_1.createHmac)('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
}
let AggregatorOrdersService = AggregatorOrdersService_1 = class AggregatorOrdersService {
    prisma;
    orders;
    logger = new common_1.Logger(AggregatorOrdersService_1.name);
    constructor(prisma, orders) {
        this.prisma = prisma;
        this.orders = orders;
    }
    async log(connectionId, level, event, message) {
        await this.prisma.integrationLog.create({
            data: { connectionId, level, event, message: message.slice(0, 500) },
        });
    }
    async receive(restaurantId, providerKey, headers, rawBody) {
        const deny = () => new common_1.UnauthorizedException('Invalid webhook signature');
        const provider = (0, registry_1.getProvider)(providerKey);
        if (!provider || !provider.capabilities.receiveOrders)
            throw deny();
        const conn = await this.prisma.integrationConnection.findUnique({
            where: { restaurantId_provider: { restaurantId, provider: providerKey } },
        });
        if (!conn || !conn.enabled || !conn.credentialsEnc)
            throw deny();
        let secret;
        try {
            secret = JSON.parse((0, secret_box_1.decryptSecret)(conn.credentialsEnc, `${restaurantId}:${providerKey}`)).webhookSecret;
        }
        catch {
            secret = undefined;
        }
        if (!secret)
            throw deny();
        const header = (n) => {
            const v = headers[n];
            return Array.isArray(v) ? v[0] : v;
        };
        const ts = header('x-orderrestro-timestamp') ?? '';
        const sig = header('x-orderrestro-signature') ?? '';
        const age = Math.abs(Date.now() / 1000 - Number(ts));
        const expected = signAggregatorBody(secret, ts, rawBody);
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        const okSig = a.length === b.length && (0, node_crypto_1.timingSafeEqual)(a, b);
        if (!okSig || !Number.isFinite(age) || age > MAX_SKEW_SECONDS) {
            await this.log(conn.id, 'WARN', 'webhook_rejected', !okSig
                ? 'A delivery was refused: signature did not match the saved secret'
                : 'A delivery was refused: timestamp outside the 5 minute window');
            throw deny();
        }
        let parsed;
        try {
            parsed = exports.aggregatorEventSchema.parse(JSON.parse(rawBody));
        }
        catch (e) {
            const msg = e instanceof zod_1.z.ZodError
                ? e.issues
                    .slice(0, 3)
                    .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
                    .join('; ')
                : 'Body is not valid JSON';
            await this.log(conn.id, 'WARN', 'webhook_invalid', msg);
            throw new common_1.BadRequestException(`Invalid payload - ${msg}`);
        }
        const markGood = (event, message) => this.prisma.integrationConnection
            .update({
            where: { id: conn.id },
            data: {
                status: 'CONNECTED',
                lastSyncAt: new Date(),
                lastSuccessAt: new Date(),
                lastError: null,
            },
        })
            .then(() => this.log(conn.id, 'INFO', event, message));
        if (parsed.event === 'ping') {
            await markGood('webhook_ping', 'Signed test event received');
            return { ok: true };
        }
        const source = (0, registry_1.sourceOf)(provider);
        if (parsed.event === 'order.cancelled') {
            return this.cancel(conn.id, restaurantId, source, parsed, markGood);
        }
        try {
            const res = await this.createOrder(restaurantId, source, parsed);
            await markGood('order_received', `${provider.name} order ${parsed.orderId} -> #${res.orderNumber}${res.duplicate ? ' (repeat delivery, ignored)' : ''}`);
            return res;
        }
        catch (e) {
            const msg = e.message;
            await this.prisma.integrationConnection.update({
                where: { id: conn.id },
                data: { lastSyncAt: new Date(), lastError: msg.slice(0, 500) },
            });
            await this.log(conn.id, 'ERROR', 'order_failed', `Order ${parsed.orderId}: ${msg}`);
            throw e;
        }
    }
    async cancel(connectionId, restaurantId, source, ev, markGood) {
        const order = await this.prisma.order.findFirst({
            where: {
                externalSource: source,
                externalOrderId: ev.orderId,
                branch: { restaurantId },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.status === 'OPEN' && order.acceptance === 'PENDING') {
            const userId = await this.staffFor(order.branchId);
            await this.orders.rejectOrder(order.branchId, order.id, userId, ev.reason || 'Cancelled by the platform');
            await markGood('order_cancelled', `Order ${ev.orderId} cancelled`);
            return { ok: true, cancelled: true };
        }
        await this.log(connectionId, 'WARN', 'cancel_needs_attention', `Platform cancelled ${ev.orderId} but #${order.orderNumber} is already accepted - cancel it manually if needed`);
        return { ok: true, cancelled: false, needsAttention: true };
    }
    async staffFor(branchId) {
        const id = (await this.prisma.userBranch.findFirst({
            where: { branchId },
            orderBy: { userId: 'asc' },
        }))?.userId;
        if (!id)
            throw new common_1.NotFoundException('This location has no staff');
        return id;
    }
    async createOrder(restaurantId, source, ev) {
        const branches = await this.prisma.branch.findMany({
            where: { restaurantId },
            select: { id: true },
            orderBy: { createdAt: 'asc' },
        });
        let branchId;
        if (ev.branchId) {
            if (!branches.some((b) => b.id === ev.branchId)) {
                throw new common_1.UnprocessableEntityException('Unknown branchId');
            }
            branchId = ev.branchId;
        }
        else if (branches.length === 1) {
            branchId = branches[0].id;
        }
        else {
            throw new common_1.UnprocessableEntityException('branchId is required when the restaurant has several branches');
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
        const menu = await this.prisma.menuItem.findMany({
            where: { branchId },
            select: { id: true, name: true },
        });
        const byId = new Map(menu.map((m) => [m.id, m.id]));
        const byName = new Map(menu.map((m) => [m.name.trim().toLowerCase(), m.id]));
        const unmatched = [];
        const lines = ev.items.flatMap((i) => {
            const id = (i.menuItemId && byId.get(i.menuItemId)) ||
                (i.name && byName.get(i.name.trim().toLowerCase()));
            if (!id) {
                unmatched.push(i.name ?? i.menuItemId ?? '?');
                return [];
            }
            return [
                {
                    menuItemId: id,
                    quantity: i.quantity,
                    modifierIds: [],
                    kitchenNote: i.kitchenNote,
                },
            ];
        });
        if (unmatched.length) {
            throw new common_1.UnprocessableEntityException(`Items not found on the menu: ${[...new Set(unmatched)].join(', ')}`);
        }
        if (ev.type === 'DELIVERY' && !ev.delivery) {
            throw new common_1.UnprocessableEntityException('delivery.address is required for delivery orders');
        }
        const phone = ev.customer.phone;
        const found = await this.prisma.customer.findFirst({
            where: { branchId, phone },
        });
        const customer = found ??
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
        const pay = ev.paymentMode === 'PREPAID'
            ? ' - PAID online'
            : ev.paymentMode === 'COD'
                ? ' - COLLECT cash on delivery'
                : '';
        const notes = `[${label} #${ev.orderId}${pay}] ${ev.notes ?? ''}`.trim();
        for (let attempt = 1;; attempt++) {
            try {
                const created = await this.orders.createOrder(branchId, createdById, {
                    type: ev.type,
                    customerId: customer.id,
                    guestName: ev.customer.name,
                    notes,
                    delivery: ev.type === 'DELIVERY' && ev.delivery
                        ? {
                            address: ev.delivery.address,
                            pincode: ev.delivery.pincode,
                            phone,
                        }
                        : undefined,
                    items: lines,
                }, {
                    channel: 'ONLINE',
                    requireAcceptance: true,
                    externalSource: source,
                    externalOrderId: ev.orderId,
                    externalCustomerRef: ev.customer.ref,
                });
                return { ok: true, duplicate: false, ...this.ref(created) };
            }
            catch (err) {
                if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                    err.code === 'P2002') {
                    const dup = await this.prisma.order.findFirst({
                        where: {
                            branchId,
                            externalSource: source,
                            externalOrderId: ev.orderId,
                        },
                        select: { id: true, orderNumber: true },
                    });
                    if (dup)
                        return { ok: true, duplicate: true, ...this.ref(dup) };
                    if (attempt < 3)
                        continue;
                }
                throw err;
            }
        }
    }
    ref(o) {
        return { orderId: o.id, orderNumber: o.orderNumber };
    }
};
exports.AggregatorOrdersService = AggregatorOrdersService;
exports.AggregatorOrdersService = AggregatorOrdersService = AggregatorOrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orders_service_1.OrdersService])
], AggregatorOrdersService);
//# sourceMappingURL=aggregator-orders.service.js.map