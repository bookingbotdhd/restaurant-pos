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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsService = exports.PERSONAL_DATA_SCOPE = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
const online_price_1 = require("../common/online-price");
const prisma_service_1 = require("../prisma/prisma.service");
const delivery_service_1 = require("../modules/delivery/delivery.service");
const orders_service_1 = require("../modules/orders/orders.service");
const referrals_service_1 = require("../modules/referrals/referrals.service");
const reservations_service_1 = require("../modules/reservations/reservations.service");
exports.PERSONAL_DATA_SCOPE = 'orders:read_customer';
const OWN_ORDER_INCLUDE = {
    items: { include: { modifiers: true }, orderBy: { id: 'asc' } },
    customer: { select: { name: true, phone: true, email: true } },
    kots: { select: { status: true } },
    payments: { select: { amount: true } },
};
let IntegrationsService = class IntegrationsService {
    prisma;
    orders;
    delivery;
    reservations;
    referrals;
    constructor(prisma, orders, delivery, reservations, referrals) {
        this.prisma = prisma;
        this.orders = orders;
        this.delivery = delivery;
        this.reservations = reservations;
        this.referrals = referrals;
    }
    async assertBranch(ctx, branchId) {
        if (ctx.branchId && ctx.branchId !== branchId) {
            throw new common_1.ForbiddenException('This API key is scoped to a different location');
        }
        const branch = await this.prisma.branch.findFirst({
            where: { id: branchId, restaurantId: ctx.restaurantId, isActive: true },
        });
        if (!branch) {
            throw new common_1.NotFoundException('Location not found');
        }
        return branch;
    }
    async listLocations(ctx) {
        return this.prisma.branch.findMany({
            where: {
                restaurantId: ctx.restaurantId,
                isActive: true,
                ...(ctx.branchId ? { id: ctx.branchId } : {}),
            },
            select: { id: true, name: true, address: true, phone: true },
            orderBy: { name: 'asc' },
        });
    }
    async getMenu(ctx, branchId) {
        const branch = await this.assertBranch(ctx, branchId);
        const categories = await this.prisma.menuCategory.findMany({
            where: { branchId: branch.id, isActive: true, showOnWebsite: true },
            orderBy: { sortOrder: 'asc' },
            include: {
                items: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        imageUrl: true,
                        price: true,
                        taxRatePercent: true,
                        isVeg: true,
                        isVegan: true,
                        spiceLevel: true,
                        allergens: true,
                        availableFrom: true,
                        availableTo: true,
                        modifierGroups: {
                            orderBy: { sortOrder: 'asc' },
                            select: {
                                modifierGroup: {
                                    select: {
                                        id: true,
                                        name: true,
                                        minSelect: true,
                                        maxSelect: true,
                                        isRequired: true,
                                        modifiers: {
                                            orderBy: { sortOrder: 'asc' },
                                            select: {
                                                id: true,
                                                name: true,
                                                priceAdjustment: true,
                                                isDefault: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        const adjust = (0, online_price_1.onlinePriceAdjustOf)(await this.prisma.restaurant.findUniqueOrThrow({
            where: { id: ctx.restaurantId },
            select: { onlinePriceAdjustKind: true, onlinePriceAdjustValue: true },
        }));
        return {
            locationId: branch.id,
            locationName: branch.name,
            categories: categories.map((category) => ({
                ...category,
                items: category.items.map(({ modifierGroups, ...item }) => ({
                    ...item,
                    price: adjust && item.price != null
                        ? (0, online_price_1.adjustOnlinePrice)(Number(item.price), adjust)
                        : item.price,
                    modifierGroups: modifierGroups.map((g) => g.modifierGroup),
                })),
            })),
        };
    }
    async createOrder(ctx, branchId, dto, idempotencyKey) {
        await this.assertBranch(ctx, branchId);
        const clientRequestId = idempotencyKey
            ? `int:${ctx.id}:${idempotencyKey}`
            : undefined;
        const clientRequestHash = (0, node_crypto_1.createHash)('sha256')
            .update(JSON.stringify(dto))
            .digest('hex');
        const replayOf = (order) => {
            if (order.clientRequestHash !== clientRequestHash) {
                throw new common_1.UnprocessableEntityException('This Idempotency-Key was already used with a different request');
            }
            return this.present(ctx, order);
        };
        if (clientRequestId) {
            const replay = await this.findOwnOrder(ctx, branchId, {
                clientRequestId,
            });
            if (replay)
                return replayOf(replay);
        }
        const customer = await this.customerFor(branchId, dto.customerName, dto.customerPhone, dto.customerEmail);
        const createdById = (await this.prisma.userBranch.findFirst({
            where: { branchId },
            orderBy: { userId: 'asc' },
        }))?.userId;
        if (!createdById) {
            throw new common_1.NotFoundException('This location has no staff to receive the order');
        }
        const settings = await this.prisma.restaurant.findUniqueOrThrow({
            where: { id: ctx.restaurantId },
            select: {
                onlineMinOrderAmount: true,
                onlinePriceAdjustKind: true,
                onlinePriceAdjustValue: true,
            },
        });
        const minOrderAmount = Number(settings.onlineMinOrderAmount);
        const priceAdjust = (0, online_price_1.onlinePriceAdjustOf)(settings);
        for (let attempt = 1;; attempt++) {
            try {
                const created = await this.orders.createOrder(branchId, createdById, {
                    type: dto.type,
                    customerId: customer.id,
                    guestName: dto.customerName,
                    notes: dto.notes,
                    delivery: dto.delivery && {
                        address: dto.delivery.address,
                        pincode: dto.delivery.pincode,
                        phone: dto.delivery.phone ?? dto.customerPhone,
                        lat: dto.delivery.lat,
                        lng: dto.delivery.lng,
                        place: dto.delivery.place,
                    },
                    scheduledFor: dto.scheduledFor,
                    items: dto.items.map((item) => ({
                        menuItemId: item.menuItemId,
                        quantity: item.quantity,
                        modifierIds: item.modifierIds,
                        kitchenNote: item.kitchenNote,
                    })),
                }, {
                    channel: 'ONLINE',
                    requireAcceptance: true,
                    clientRequestId,
                    clientRequestHash,
                    integrationKeyId: ctx.id,
                    minOrderAmount: minOrderAmount > 0 ? minOrderAmount : undefined,
                    priceAdjust,
                });
                const rewards = dto.referralCode || dto.redeemPoints
                    ? await this.applyRewards(ctx, branchId, created.id, customer.id, dto)
                    : undefined;
                const order = await this.findOwnOrder(ctx, branchId, {
                    id: created.id,
                });
                return {
                    ...this.present(ctx, order),
                    ...(rewards ? { rewards } : {}),
                };
            }
            catch (err) {
                if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                    err.code === 'P2002') {
                    if (clientRequestId) {
                        const dup = await this.findOwnOrder(ctx, branchId, {
                            clientRequestId,
                        });
                        if (dup)
                            return replayOf(dup);
                    }
                    if (attempt < 3)
                        continue;
                }
                throw err;
            }
        }
    }
    async customerFor(branchId, name, phone, email) {
        const existing = await this.prisma.customer.findFirst({
            where: { branchId, phone },
        });
        return existing
            ? this.prisma.customer.update({
                where: { id: existing.id },
                data: {
                    name: name || existing.name,
                    ...(email && !existing.email ? { email } : {}),
                },
            })
            : this.prisma.customer.create({
                data: { branchId, name, phone, email },
            });
    }
    async applyRewards(ctx, branchId, orderId, customerId, dto) {
        const out = {};
        if (dto.referralCode) {
            try {
                const r = await this.referrals.attach(ctx.restaurantId, customerId, dto.referralCode, dto.sharedItemId);
                out.referral = r.applied
                    ? { applied: true }
                    : { applied: false, reason: r.reason };
            }
            catch {
                out.referral = {
                    applied: false,
                    reason: 'Referral could not be recorded',
                };
            }
        }
        if (dto.redeemPoints) {
            const [cust, rest, order] = await Promise.all([
                this.prisma.customer.findUniqueOrThrow({
                    where: { id: customerId },
                    select: { loyaltyPoints: true },
                }),
                this.prisma.restaurant.findUniqueOrThrow({
                    where: { id: ctx.restaurantId },
                    select: { loyaltyPointValue: true },
                }),
                this.prisma.order.findUniqueOrThrow({
                    where: { id: orderId },
                    select: { subtotal: true },
                }),
            ]);
            const value = Number(rest.loyaltyPointValue);
            if (value > 0) {
                const cap = Math.floor(Number(order.subtotal) / value);
                const points = Math.max(0, Math.min(dto.redeemPoints, cust.loyaltyPoints, cap));
                if (points > 0) {
                    await this.prisma.order.update({
                        where: { id: orderId },
                        data: { requestedRedeemPoints: points },
                    });
                    out.redeem = {
                        points,
                        discount: Math.round(points * value * 100) / 100,
                    };
                }
            }
        }
        return out;
    }
    async rewards(ctx, branchId, dto) {
        await this.assertBranch(ctx, branchId);
        const customer = await this.customerFor(branchId, dto.customerName ?? '', dto.customerPhone);
        return this.referrals.summary(ctx.restaurantId, customer.id);
    }
    async deliveryQuote(ctx, branchId, pincode) {
        await this.assertBranch(ctx, branchId);
        return this.delivery.quote(branchId, pincode);
    }
    async getOrder(ctx, branchId, orderId, includeCustomer = false) {
        if (includeCustomer && !ctx.scopes.includes(exports.PERSONAL_DATA_SCOPE)) {
            throw new common_1.ForbiddenException(`Reading customer details needs the ${exports.PERSONAL_DATA_SCOPE} scope`);
        }
        await this.assertBranch(ctx, branchId);
        const order = await this.findOwnOrder(ctx, branchId, { id: orderId });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return this.present(ctx, order, includeCustomer);
    }
    findOwnOrder(ctx, branchId, where) {
        return this.prisma.order.findFirst({
            where: { ...where, branchId, integrationKeyId: ctx.id },
            include: OWN_ORDER_INCLUDE,
        });
    }
    present(ctx, order, includeCustomer = false) {
        const num = (v) => (v ? Number(v) : 0);
        const subtotal = num(order.subtotal);
        const discount = num(order.discountAmount) + num(order.loyaltyDiscountAmount);
        const deliveryFee = num(order.deliveryFee);
        const wantsCustomer = includeCustomer && ctx.scopes.includes(exports.PERSONAL_DATA_SCOPE);
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            type: order.type,
            status: order.status,
            acceptance: order.acceptance,
            kitchenStatus: order.kots.length ? order.kots.map((k) => k.status) : [],
            createdAt: order.createdAt,
            scheduledFor: order.scheduledFor,
            notes: order.notes,
            items: order.items.map((item) => ({
                name: item.nameSnapshot,
                quantity: item.quantity,
                unitPrice: Number(item.unitPriceSnapshot),
                lineTotal: Number(item.lineTotal),
                kitchenNote: item.kitchenNote,
                modifiers: item.modifiers.map((m) => ({
                    name: m.nameSnapshot,
                    priceAdjustment: Number(m.priceAdjSnapshot),
                })),
            })),
            totals: {
                subtotal,
                tax: num(order.taxAmount),
                discount,
                deliveryFee,
                total: Math.round((subtotal - discount + deliveryFee) * 100) / 100,
                paid: order.payments.reduce((sum, p) => sum + Number(p.amount), 0),
            },
            fulfillment: order.type === 'DELIVERY'
                ? {
                    deliveryStatus: order.deliveryStatus,
                    etaAt: order.deliveryEtaAt,
                    deliveredAt: order.deliveredAt,
                }
                : null,
            ...(wantsCustomer
                ? {
                    customer: {
                        name: order.guestName ?? order.customer?.name ?? null,
                        phone: order.customer?.phone ?? null,
                        email: order.customer?.email ?? null,
                    },
                    delivery: order.type === 'DELIVERY'
                        ? {
                            address: order.deliveryAddress,
                            pincode: order.deliveryPincode,
                            phone: order.deliveryPhone,
                            lat: order.deliveryLat,
                            lng: order.deliveryLng,
                            place: order.deliveryPlace,
                        }
                        : null,
                }
                : {}),
        };
    }
    async createReservation(ctx, branchId, dto) {
        await this.assertBranch(ctx, branchId);
        return this.reservations.create(branchId, dto, { fromWebsite: true });
    }
    async getReservation(ctx, branchId, reservationId) {
        await this.assertBranch(ctx, branchId);
        const reservation = await this.prisma.reservation.findFirst({
            where: { id: reservationId, branchId },
        });
        if (!reservation)
            throw new common_1.NotFoundException('Reservation not found');
        return reservation;
    }
};
exports.IntegrationsService = IntegrationsService;
exports.IntegrationsService = IntegrationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orders_service_1.OrdersService,
        delivery_service_1.DeliveryService,
        reservations_service_1.ReservationsService,
        referrals_service_1.ReferralsService])
], IntegrationsService);
//# sourceMappingURL=integrations.service.js.map