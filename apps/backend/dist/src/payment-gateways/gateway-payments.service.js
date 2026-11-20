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
var GatewayPaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayPaymentsService = exports.WebhookRejected = void 0;
const common_1 = require("@nestjs/common");
const pricing_1 = require("../modules/orders/pricing");
const prisma_service_1 = require("../prisma/prisma.service");
const orders_service_1 = require("../modules/orders/orders.service");
const adapter_1 = require("./adapters/adapter");
const registry_1 = require("./adapters/registry");
const money_1 = require("./money");
const payment_gateways_service_1 = require("./payment-gateways.service");
const REUSE_WINDOW_MS = 30 * 60_000;
const MIN_REFRESH_GAP_MS = 2_000;
class WebhookRejected extends Error {
}
exports.WebhookRejected = WebhookRejected;
let GatewayPaymentsService = GatewayPaymentsService_1 = class GatewayPaymentsService {
    prisma;
    gateways;
    orders;
    logger = new common_1.Logger(GatewayPaymentsService_1.name);
    lastFetch = new Map();
    constructor(prisma, gateways, orders) {
        this.prisma = prisma;
        this.gateways = gateways;
        this.orders = orders;
    }
    baseUrl(requestOrigin) {
        const allowed = (process.env.CORS_ORIGIN ?? 'http://localhost:1995')
            .split(',')
            .map((s) => s.trim().replace(/\/$/, ''))
            .filter(Boolean);
        const fixed = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
        const o = requestOrigin?.replace(/\/$/, '');
        if (o && allowed.includes(o))
            return o;
        return fixed || allowed[0];
    }
    async create(restaurantId, branchId, orderId, userId, input) {
        const branch = await this.prisma.branch.findFirst({
            where: { id: branchId, restaurantId },
            select: { id: true },
        });
        if (!branch)
            throw new common_1.NotFoundException('Branch not found');
        const active = await this.gateways.active(restaurantId);
        if (!active) {
            throw new common_1.BadRequestException('No online payment gateway is switched on. Set one up in Settings → Payment gateways.');
        }
        const { connection, adapter } = active;
        const mode = connection.mode;
        const keys = mode === 'TEST' ? connection.testKeys : connection.liveKeys;
        if (!adapter.fields
            .filter((f) => f.required)
            .every((f) => keys.includes(f.key))) {
            throw new common_1.BadRequestException(`The ${mode === 'TEST' ? 'Test' : 'Live'} credentials are incomplete`);
        }
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, branchId },
            select: { id: true, status: true, acceptance: true, orderNumber: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.status !== 'OPEN') {
            throw new common_1.BadRequestException('Order is not open for payment');
        }
        if (order.acceptance === 'PENDING') {
            throw new common_1.ConflictException('Accept this order before taking payment');
        }
        const bill = await this.orders.previewBill(branchId, orderId, {});
        const balance = Number(bill.balanceDue);
        if (!(balance > 0))
            throw new common_1.BadRequestException('Nothing is due on this order');
        const restaurant = await this.prisma.restaurant.findUniqueOrThrow({
            where: { id: restaurantId },
            select: { currency: true, name: true },
        });
        const currency = restaurant.currency.toUpperCase();
        const amountMinor = (0, money_1.toMinor)(balance, currency);
        if (amountMinor <= 0)
            throw new common_1.BadRequestException('Nothing is due on this order');
        if (adapter.requiresCustomerPhone && !input.customerPhone) {
            throw new common_1.BadRequestException(`${adapter.name} needs the customer's phone number`);
        }
        const reusable = await this.prisma.gatewayPayment.findFirst({
            where: {
                orderId,
                provider: connection.provider,
                mode,
                status: 'CREATED',
                amountMinor,
                currency,
                checkoutUrl: { not: null },
                createdAt: { gt: new Date(Date.now() - REUSE_WINDOW_MS) },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (reusable)
            return this.present(reusable);
        const row = await this.prisma.gatewayPayment.create({
            data: {
                restaurantId,
                branchId,
                orderId,
                provider: connection.provider,
                mode,
                amountMinor,
                currency,
                createdById: userId,
            },
        });
        const base = this.baseUrl(input.origin);
        try {
            const ctx = this.gateways.context(restaurantId, connection, mode);
            const r = await adapter.createPayment(ctx, {
                amountMinor,
                currency,
                reference: row.id,
                description: `${restaurant.name} - order ${order.orderNumber}`,
                returnUrl: `${base}/pay/return?gp=${row.id}`,
                notifyUrl: `${base}/api/v1/payment-gateways/webhook/${restaurantId}/${connection.provider}/${mode}`,
                customer: { name: input.customerName, phone: input.customerPhone },
            });
            const saved = await this.prisma.gatewayPayment.update({
                where: { id: row.id },
                data: { providerRef: r.providerRef, checkoutUrl: r.checkoutUrl },
            });
            return this.present(saved);
        }
        catch (e) {
            const msg = e instanceof adapter_1.GatewayError
                ? e.message
                : 'Could not create the payment link';
            await this.prisma.gatewayPayment.update({
                where: { id: row.id },
                data: { status: 'FAILED', note: msg.slice(0, 300) },
            });
            this.logger.warn(`Payment link failed (${connection.provider}/${mode}): ${msg}`);
            throw new common_1.BadRequestException(msg);
        }
    }
    async refresh(id, scope) {
        let p = await this.prisma.gatewayPayment.findFirst({
            where: {
                id,
                ...(scope ? { restaurantId: scope.restaurantId } : {}),
                ...(scope?.branchId ? { branchId: scope.branchId } : {}),
            },
        });
        if (!p)
            throw new common_1.NotFoundException('Payment not found');
        if (!p.providerRef ||
            (p.status !== 'CREATED' && p.status !== 'NEEDS_REVIEW')) {
            return this.present(p);
        }
        const last = this.lastFetch.get(p.id) ?? 0;
        if (Date.now() - last < MIN_REFRESH_GAP_MS)
            return this.present(p);
        this.lastFetch.set(p.id, Date.now());
        if (this.lastFetch.size > 5000)
            this.lastFetch.clear();
        const conn = await this.prisma.paymentGatewayConnection.findUnique({
            where: {
                restaurantId_provider: {
                    restaurantId: p.restaurantId,
                    provider: p.provider,
                },
            },
        });
        const entry = await this.prisma.paymentGatewayCatalogEntry.findFirst({
            where: {
                key: p.provider,
                OR: [{ restaurantId: p.restaurantId }, { restaurantId: null }],
            },
            orderBy: { restaurantId: 'desc' },
        });
        const adapter = (0, registry_1.getAdapter)(entry?.adapter);
        if (!conn || !adapter)
            return this.present(p);
        let remote;
        try {
            remote = await adapter.fetchStatus(this.gateways.context(p.restaurantId, conn, p.mode), p.providerRef);
        }
        catch (e) {
            this.logger.warn(`Status lookup failed for ${p.id}: ${e.message}`);
            return this.present(p);
        }
        if (remote.state === 'EXPIRED') {
            p = await this.prisma.gatewayPayment.update({
                where: { id: p.id },
                data: { status: 'EXPIRED' },
            });
            return this.present(p);
        }
        if (remote.state !== 'PAID')
            return this.present(p);
        const mismatch = remote.currency !== p.currency ||
            remote.paidMinor !== p.amountMinor ||
            (remote.reference != null && remote.reference !== p.id);
        if (mismatch) {
            p = await this.prisma.gatewayPayment.update({
                where: { id: p.id },
                data: {
                    status: 'NEEDS_REVIEW',
                    providerPaymentId: remote.providerPaymentId ?? p.providerPaymentId,
                    note: 'The provider reports an amount, currency or reference different from what was requested. Check it in the provider dashboard.',
                },
            });
            return this.present(p);
        }
        return this.present(await this.apply(p, remote.providerPaymentId ?? null));
    }
    async apply(p, providerPaymentId) {
        if (p.mode === 'TEST') {
            return this.prisma.gatewayPayment.update({
                where: { id: p.id },
                data: {
                    status: 'SUCCEEDED',
                    providerPaymentId,
                    note: 'Test payment: no real money moved and the order was left unpaid.',
                },
            });
        }
        const claimed = await this.prisma.gatewayPayment.updateMany({
            where: {
                id: p.id,
                appliedAt: null,
                status: { in: ['CREATED', 'NEEDS_REVIEW'] },
            },
            data: { appliedAt: new Date(), providerPaymentId },
        });
        if (claimed.count === 0) {
            return this.prisma.gatewayPayment.findUniqueOrThrow({
                where: { id: p.id },
            });
        }
        try {
            await this.orders.checkout(p.branchId, p.orderId, p.createdById, {
                payments: [
                    {
                        method: 'OTHER',
                        amount: (0, money_1.fromMinor)(p.amountMinor, p.currency),
                        reference: `${p.provider}:${providerPaymentId ?? p.providerRef}`.slice(0, 120),
                    },
                ],
                allowPartial: true,
                requestId: p.id,
            });
            return await this.prisma.gatewayPayment.update({
                where: { id: p.id },
                data: { status: 'SUCCEEDED', note: null },
            });
        }
        catch (e) {
            this.logger.error(`Could not settle order ${p.orderId} for ${p.id}: ${e.message}`);
            return this.prisma.gatewayPayment.update({
                where: { id: p.id },
                data: {
                    status: 'NEEDS_REVIEW',
                    appliedAt: null,
                    note: `Payment received but the order could not be settled: ${e.message}`.slice(0, 300),
                },
            });
        }
    }
    async webhook(restaurantId, provider, mode, headers, rawBody) {
        const conn = await this.prisma.paymentGatewayConnection.findUnique({
            where: { restaurantId_provider: { restaurantId, provider } },
        });
        const entry = await this.prisma.paymentGatewayCatalogEntry.findFirst({
            where: { key: provider, OR: [{ restaurantId }, { restaurantId: null }] },
            orderBy: { restaurantId: 'desc' },
        });
        const adapter = (0, registry_1.getAdapter)(entry?.adapter);
        if (!conn || !adapter)
            throw new WebhookRejected();
        let verified;
        try {
            verified = adapter.verifyWebhook(this.gateways.context(restaurantId, conn, mode), headers, rawBody);
        }
        catch {
            throw new WebhookRejected();
        }
        const seen = await this.prisma.gatewayWebhookEvent.findUnique({
            where: {
                provider_mode_eventId: { provider, mode, eventId: verified.eventId },
            },
        });
        if (seen)
            return { duplicate: true };
        if (verified.providerRef) {
            const p = await this.prisma.gatewayPayment.findFirst({
                where: {
                    restaurantId,
                    provider,
                    mode,
                    providerRef: verified.providerRef,
                },
            });
            if (p) {
                this.lastFetch.delete(p.id);
                await this.refresh(p.id);
            }
        }
        await this.prisma.gatewayWebhookEvent
            .create({ data: { provider, mode, eventId: verified.eventId } })
            .catch(() => undefined);
        return { duplicate: false };
    }
    async refund(restaurantId, branchId, gatewayPaymentId, userId, input) {
        const p = await this.prisma.gatewayPayment.findFirst({
            where: { id: gatewayPaymentId, restaurantId, branchId },
        });
        if (!p)
            throw new common_1.NotFoundException('Payment not found');
        if (p.mode === 'TEST') {
            throw new common_1.BadRequestException('A test payment moved no money, so there is nothing to refund');
        }
        if (p.status !== 'SUCCEEDED' || !p.appliedAt || !p.providerPaymentId) {
            throw new common_1.BadRequestException('Only a confirmed, settled online payment can be refunded this way');
        }
        const conn = await this.prisma.paymentGatewayConnection.findUnique({
            where: { restaurantId_provider: { restaurantId, provider: p.provider } },
        });
        const entry = await this.prisma.paymentGatewayCatalogEntry.findFirst({
            where: {
                key: p.provider,
                OR: [{ restaurantId }, { restaurantId: null }],
            },
            orderBy: { restaurantId: 'desc' },
        });
        const adapter = (0, registry_1.getAdapter)(entry?.adapter);
        if (!conn || !adapter?.refund) {
            throw new common_1.BadRequestException(`${adapter?.name ?? 'This gateway'} refunds cannot be sent from OrderRestro. Refund it in the provider dashboard and record it as an Other refund.`);
        }
        const amountMinor = (0, money_1.toMinor)(input.amount, p.currency);
        if (amountMinor <= 0)
            throw new common_1.BadRequestException('Enter an amount to refund');
        const order = await this.prisma.order.findFirst({
            where: { id: p.orderId, branchId },
            select: { totalAmount: true, status: true },
        });
        if (!order || order.status !== 'PAID') {
            throw new common_1.BadRequestException('Only a paid order can be refunded');
        }
        const prior = await this.prisma.refund.aggregate({
            where: { orderId: p.orderId },
            _sum: { amount: true },
        });
        const localLeft = (0, pricing_1.round2)(Number(order.totalAmount) - Number(prior._sum.amount ?? 0));
        if (input.amount > localLeft) {
            throw new common_1.BadRequestException(`Only ${localLeft} remains refundable on this order`);
        }
        const row = await this.prisma.$transaction(async (tx) => {
            await tx.gatewayPayment.update({
                where: { id: p.id },
                data: { updatedAt: new Date() },
            });
            const held = await tx.gatewayRefund.aggregate({
                where: {
                    gatewayPaymentId: p.id,
                    status: { in: ['PENDING', 'SUCCEEDED', 'NEEDS_REVIEW'] },
                },
                _sum: { amountMinor: true },
            });
            const left = p.amountMinor - (held._sum.amountMinor ?? 0);
            if (amountMinor > left) {
                throw new common_1.BadRequestException(`Only ${(0, money_1.fromMinor)(left, p.currency)} ${p.currency} of this payment can still be refunded`);
            }
            return tx.gatewayRefund.create({
                data: {
                    restaurantId,
                    gatewayPaymentId: p.id,
                    orderId: p.orderId,
                    provider: p.provider,
                    amountMinor,
                    currency: p.currency,
                    reason: input.reason,
                    createdById: userId,
                },
            });
        });
        let providerRefundId;
        try {
            const r = await adapter.refund(this.gateways.context(restaurantId, conn, p.mode), {
                providerPaymentId: p.providerPaymentId,
                amountMinor,
                currency: p.currency,
                reference: row.id,
            });
            providerRefundId = r.providerRefundId;
        }
        catch (e) {
            const definite = e instanceof adapter_1.GatewayError && e.status !== undefined;
            const msg = e instanceof adapter_1.GatewayError ? e.message : 'Refund failed';
            await this.prisma.gatewayRefund.update({
                where: { id: row.id },
                data: definite
                    ? { status: 'FAILED', note: msg.slice(0, 300) }
                    : {
                        status: 'NEEDS_REVIEW',
                        note: 'The provider did not answer, so it is unknown whether the refund went through. Check the provider dashboard before trying again.',
                    },
            });
            throw new common_1.BadRequestException(definite
                ? msg
                : 'The provider did not answer. Check the provider dashboard before trying again; no refund was recorded here.');
        }
        try {
            const local = await this.orders.refund(branchId, p.orderId, userId, {
                amount: input.amount,
                method: 'OTHER',
                reason: input.reason
                    ? `${input.reason} (via ${adapter.name})`
                    : `Refunded via ${adapter.name}`,
                returnedItems: input.returnedItems,
            });
            await this.prisma.gatewayRefund.update({
                where: { id: row.id },
                data: {
                    status: 'SUCCEEDED',
                    providerRefundId,
                    refundId: local.id,
                    note: null,
                },
            });
            return {
                ok: true,
                providerRefundId,
                amount: input.amount,
                currency: p.currency,
            };
        }
        catch (e) {
            this.logger.error(`Refund ${row.id} sent to ${p.provider} but not recorded: ${e.message}`);
            await this.prisma.gatewayRefund.update({
                where: { id: row.id },
                data: {
                    status: 'NEEDS_REVIEW',
                    providerRefundId,
                    note: `Refunded at ${adapter.name} but could not be recorded in OrderRestro: ${e.message}`.slice(0, 300),
                },
            });
            throw new common_1.ConflictException(`The refund was sent to ${adapter.name} but could not be recorded here. It is flagged for review under Settings → Payments.`);
        }
    }
    async refundsNeedingReview(restaurantId) {
        const rows = await this.prisma.gatewayRefund.findMany({
            where: { restaurantId, status: 'NEEDS_REVIEW' },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return rows.map((r) => ({
            id: r.id,
            orderId: r.orderId,
            provider: r.provider,
            amountMinor: r.amountMinor,
            currency: r.currency,
            note: r.note,
            providerRefundId: r.providerRefundId,
            createdAt: r.createdAt,
        }));
    }
    async refundsForOrder(restaurantId, orderId) {
        const rows = await this.prisma.gatewayRefund.findMany({
            where: { restaurantId, orderId },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((r) => ({
            id: r.id,
            gatewayPaymentId: r.gatewayPaymentId,
            amountMinor: r.amountMinor,
            currency: r.currency,
            status: r.status,
            note: r.note,
            createdAt: r.createdAt,
        }));
    }
    async forOrder(restaurantId, branchId, orderId) {
        const rows = await this.prisma.gatewayPayment.findMany({
            where: { restaurantId, branchId, orderId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        const refunds = await this.prisma.gatewayRefund.groupBy({
            by: ['gatewayPaymentId'],
            where: {
                restaurantId,
                orderId,
                status: { in: ['PENDING', 'SUCCEEDED', 'NEEDS_REVIEW'] },
            },
            _sum: { amountMinor: true },
        });
        const held = new Map(refunds.map((g) => [g.gatewayPaymentId, g._sum.amountMinor ?? 0]));
        return rows.map((r) => ({
            ...this.present(r),
            refundableMinor: r.status === 'SUCCEEDED' && r.mode === 'LIVE' && r.appliedAt
                ? r.amountMinor - (held.get(r.id) ?? 0)
                : 0,
        }));
    }
    async activeSummary(restaurantId) {
        const a = await this.gateways.active(restaurantId);
        if (!a)
            return null;
        const keys = a.connection.mode === 'TEST'
            ? a.connection.testKeys
            : a.connection.liveKeys;
        const ready = a.adapter.fields
            .filter((f) => f.required)
            .every((f) => keys.includes(f.key));
        if (!ready)
            return null;
        return {
            provider: a.connection.provider,
            name: a.adapter.name,
            mode: a.connection.mode,
            requiresCustomerPhone: !!a.adapter.requiresCustomerPhone,
        };
    }
    async recent(restaurantId) {
        const rows = await this.prisma.gatewayPayment.findMany({
            where: { restaurantId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return rows.map((r) => this.present(r));
    }
    async publicStatus(id) {
        const p = await this.refresh(id).catch(() => null);
        if (!p)
            throw new common_1.NotFoundException('Payment not found');
        return { status: p.status, test: p.mode === 'TEST' };
    }
    present(p) {
        return {
            id: p.id,
            orderId: p.orderId,
            provider: p.provider,
            mode: p.mode,
            status: p.status,
            amountMinor: p.amountMinor,
            currency: p.currency,
            checkoutUrl: p.checkoutUrl,
            note: p.note,
            createdAt: p.createdAt,
        };
    }
};
exports.GatewayPaymentsService = GatewayPaymentsService;
exports.GatewayPaymentsService = GatewayPaymentsService = GatewayPaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payment_gateways_service_1.PaymentGatewaysService,
        orders_service_1.OrdersService])
], GatewayPaymentsService);
//# sourceMappingURL=gateway-payments.service.js.map