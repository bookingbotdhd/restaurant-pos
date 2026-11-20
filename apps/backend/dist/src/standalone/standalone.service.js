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
var StandaloneService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandaloneService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pricing_1 = require("../modules/orders/pricing");
const orders_service_1 = require("../modules/orders/orders.service");
function mayExceedDiscountCap(user) {
    return (user.roleName === 'OWNER' ||
        user.roleName === 'ADMINISTRATOR' ||
        user.permissions.includes('discounts.unlimited'));
}
let StandaloneService = StandaloneService_1 = class StandaloneService {
    prisma;
    orders;
    logger = new common_1.Logger(StandaloneService_1.name);
    constructor(prisma, orders) {
        this.prisma = prisma;
        this.orders = orders;
    }
    async snapshot(user, branchId) {
        const branch = await this.prisma.branch.findUniqueOrThrow({
            where: { id: branchId },
            include: { restaurant: true },
        });
        const [categories, items, floors, groupLinks] = await Promise.all([
            this.prisma.menuCategory.findMany({
                where: { branchId },
                orderBy: { sortOrder: 'asc' },
                select: { id: true, name: true, sortOrder: true },
            }),
            this.prisma.menuItem.findMany({
                where: { branchId, isActive: true },
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    categoryId: true,
                    name: true,
                    price: true,
                    taxRatePercent: true,
                    isVeg: true,
                    isCombo: true,
                },
            }),
            this.prisma.floor.findMany({
                where: { branchId },
                orderBy: { sortOrder: 'asc' },
                include: {
                    tables: { orderBy: { number: 'asc' }, select: { id: true, number: true, name: true, capacity: true } },
                },
            }),
            this.prisma.menuItemModifierGroup.findMany({
                where: { modifierGroup: { branchId } },
                select: { menuItemId: true, modifierGroup: { select: { isRequired: true, minSelect: true } } },
            }),
        ]);
        const needsOptions = new Set(groupLinks
            .filter((l) => l.modifierGroup.isRequired || l.modifierGroup.minSelect > 0)
            .map((l) => l.menuItemId));
        const r = branch.restaurant;
        return {
            generatedAt: new Date().toISOString(),
            user: { id: user.id, name: user.name, permissions: user.permissions },
            restaurant: {
                name: r.name,
                currency: r.currency,
                timezone: r.timezone,
                upiVpa: r.upiVpa,
                upiPayeeName: r.upiPayeeName ?? r.name,
                maxManualDiscountPercent: Number(r.maxManualDiscountPercent),
            },
            branch: {
                id: branch.id,
                name: branch.name,
                address: branch.address,
                phone: branch.phone,
                gstNumber: branch.gstNumber,
                taxRegime: branch.taxRegime,
                taxMode: branch.taxMode,
                taxLabel: branch.taxLabel,
                taxId: branch.taxId,
                printerPaperWidthMm: branch.printerPaperWidthMm,
                printerColumns: branch.printerColumns,
            },
            categories,
            items: items.map((i) => ({
                id: i.id,
                categoryId: i.categoryId,
                name: i.name,
                price: Number(i.price),
                taxRate: Number(i.taxRatePercent),
                isVeg: i.isVeg,
                sellOffline: !needsOptions.has(i.id) && !i.isCombo,
            })),
            floors: floors.map((f) => ({
                id: f.id,
                name: f.name,
                tables: f.tables.map((t) => ({
                    id: t.id,
                    label: t.name ?? `Table ${t.number}`,
                    capacity: t.capacity,
                })),
            })),
        };
    }
    async syncSales(user, branchId, body) {
        const results = [];
        for (const sale of body.sales) {
            try {
                results.push(await this.recordSale(user, branchId, sale, body.deviceName));
            }
            catch (err) {
                const reason = err instanceof Error ? err.message : 'Could not record this sale';
                this.logger.warn(`Offline sale ${sale.id} refused: ${reason}`);
                results.push({ id: sale.id, status: 'refused', reason });
            }
        }
        return { results };
    }
    async recordSale(user, branchId, sale, deviceName) {
        const existing = await this.prisma.order.findFirst({
            where: { branchId, clientRequestId: sale.id },
            select: { id: true, orderNumber: true, status: true },
        });
        if (existing && existing.status === 'PAID') {
            return { id: sale.id, status: 'duplicate', orderId: existing.id, orderNumber: existing.orderNumber };
        }
        if (existing) {
            throw new Error('An earlier attempt of this sale did not finish; it needs a look in Orders.');
        }
        const lines = new Map();
        for (const l of sale.items) {
            const prev = lines.get(l.menuItemId);
            if (prev && prev.unitPrice !== l.unitPrice) {
                throw new Error('The same dish was sold at two different prices in one sale.');
            }
            lines.set(l.menuItemId, {
                menuItemId: l.menuItemId,
                quantity: (prev?.quantity ?? 0) + l.quantity,
                unitPrice: l.unitPrice,
            });
        }
        const merged = [...lines.values()];
        const note = [
            `Offline sale ${sale.localNumber}${deviceName ? ` on ${deviceName}` : ''}`,
            sale.tableLabel ? `(${sale.tableLabel})` : '',
            sale.note ?? '',
        ]
            .filter(Boolean)
            .join(' ');
        const order = await this.orders.createOrder(branchId, user.id, {
            type: sale.type,
            notes: note,
            items: merged.map((m) => ({
                menuItemId: m.menuItemId,
                quantity: m.quantity,
                modifierIds: [],
            })),
        }, { clientRequestId: sale.id, historical: { createdAt: new Date(sale.soldAt) } });
        try {
            await this.applyOfflinePrices(branchId, order.id, merged);
            await this.orders.checkout(branchId, order.id, user.id, {
                payments: sale.payments,
                discountPercent: sale.discountPercent,
                discountFlat: sale.discountFlat,
                discountReason: sale.discountPercent || sale.discountFlat ? 'Offline sale discount' : undefined,
                requestId: sale.id,
            }, mayExceedDiscountCap(user));
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : 'Payment could not be recorded';
            await this.prisma.order.updateMany({
                where: { id: order.id, status: 'OPEN' },
                data: {
                    status: 'CANCELLED',
                    cancelledAt: new Date(),
                    cancelReason: `Offline sale could not be settled: ${reason}`.slice(0, 250),
                },
            });
            throw new Error(reason);
        }
        const done = await this.prisma.order.findUniqueOrThrow({
            where: { id: order.id },
            select: { id: true, orderNumber: true },
        });
        return { id: sale.id, status: 'created', orderId: done.id, orderNumber: done.orderNumber };
    }
    async applyOfflinePrices(branchId, orderId, lines) {
        const branch = await this.prisma.branch.findUniqueOrThrow({
            where: { id: branchId },
            select: { taxMode: true },
        });
        const items = await this.prisma.orderItem.findMany({ where: { orderId } });
        const priced = items.map((item) => {
            const sold = lines.find((l) => l.menuItemId === item.menuItemId);
            const raw = sold ? sold.unitPrice : Number(item.unitPriceSnapshot);
            const rate = Number(item.taxRateSnapshot);
            const effective = (0, pricing_1.toEffectiveInclusiveUnitPrice)(raw, rate, branch.taxMode);
            return {
                item,
                raw,
                line: (0, pricing_1.priceLine)({ quantity: item.quantity, unitPriceInclusive: effective, taxRatePercent: rate }),
            };
        });
        const totals = (0, pricing_1.computeOrderTotals)(priced.map((p) => p.line));
        await this.prisma.$transaction([
            ...priced.map((p) => this.prisma.orderItem.update({
                where: { id: p.item.id },
                data: { unitPriceSnapshot: (0, pricing_1.round2)(p.raw), lineTotal: p.line.lineTotal },
            })),
            this.prisma.order.update({
                where: { id: orderId },
                data: { subtotal: totals.subtotal, taxAmount: totals.taxAmount, totalAmount: totals.subtotal },
            }),
        ]);
    }
};
exports.StandaloneService = StandaloneService;
exports.StandaloneService = StandaloneService = StandaloneService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orders_service_1.OrdersService])
], StandaloneService);
//# sourceMappingURL=standalone.service.js.map