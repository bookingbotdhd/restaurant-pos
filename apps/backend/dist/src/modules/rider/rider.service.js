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
exports.RiderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const delivery_service_1 = require("../delivery/delivery.service");
const ACTIVE = ['ASSIGNED', 'PICKED_UP'];
const CARD_INCLUDE = {
    items: { select: { nameSnapshot: true, quantity: true } },
    customer: { select: { name: true, phone: true } },
    payments: { select: { amount: true } },
    kots: { select: { status: true } },
    branch: { select: { name: true, address: true, phone: true } },
};
const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};
function present(o) {
    const total = Number(o.totalAmount);
    const paid = o.payments.reduce((s, p) => s + Number(p.amount), 0);
    const kitchen = o.kots.map((k) => k.status);
    return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.deliveryStatus,
        assignedAt: o.assignedAt,
        pickedUpAt: o.pickedUpAt,
        deliveredAt: o.deliveredAt,
        failedReason: o.deliveryFailedReason,
        etaAt: o.deliveryEtaAt,
        pickup: {
            name: o.branch.name,
            address: o.branch.address,
            phone: o.branch.phone,
        },
        customer: {
            name: o.guestName ?? o.customer?.name ?? null,
            phone: o.deliveryPhone ?? o.customer?.phone ?? null,
        },
        address: o.deliveryAddress,
        pincode: o.deliveryPincode,
        location: {
            lat: o.deliveryLat,
            lng: o.deliveryLng,
            place: o.deliveryPlace,
            mapsUrl: o.deliveryLat != null && o.deliveryLng != null
                ? `https://www.google.com/maps/dir/?api=1&destination=${o.deliveryLat},${o.deliveryLng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([o.deliveryPlace, o.deliveryAddress, o.deliveryPincode]
                    .filter(Boolean)
                    .join(', '))}`,
        },
        notes: o.notes,
        items: o.items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity })),
        amountToCollect: Math.max(Math.round((total - paid) * 100) / 100, 0),
        orderTotal: total,
        foodReady: kitchen.length > 0 &&
            kitchen.every((k) => ['READY', 'SERVED'].includes(k)),
    };
}
let RiderService = class RiderService {
    prisma;
    delivery;
    constructor(prisma, delivery) {
        this.prisma = prisma;
        this.delivery = delivery;
    }
    async branchOf(userId) {
        const ub = await this.prisma.userBranch.findFirst({
            where: { userId },
            include: { branch: { select: { id: true, name: true, address: true } } },
            orderBy: { branchId: 'asc' },
        });
        if (!ub)
            throw new common_1.NotFoundException('No location is linked to this account');
        return ub.branch;
    }
    async me(userId) {
        const [user, branch] = await Promise.all([
            this.prisma.user.findUniqueOrThrow({
                where: { id: userId },
                select: { name: true, phone: true, riderOnline: true },
            }),
            this.branchOf(userId),
        ]);
        const [active, delivered, failed] = await Promise.all([
            this.prisma.order.count({
                where: { driverId: userId, deliveryStatus: { in: [...ACTIVE] } },
            }),
            this.prisma.order.count({
                where: {
                    driverId: userId,
                    deliveryStatus: 'DELIVERED',
                    deliveredAt: { gte: startOfToday() },
                },
            }),
            this.prisma.order.count({
                where: {
                    driverId: userId,
                    deliveryStatus: 'FAILED',
                    updatedAt: { gte: startOfToday() },
                },
            }),
        ]);
        return {
            name: user.name,
            phone: user.phone,
            online: user.riderOnline,
            location: branch,
            today: { active, delivered, failed },
        };
    }
    async setDuty(userId, online) {
        if (!online) {
            const active = await this.prisma.order.count({
                where: { driverId: userId, deliveryStatus: { in: [...ACTIVE] } },
            });
            if (active > 0) {
                throw new common_1.ConflictException('Finish your active deliveries before going offline');
            }
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: online ? { riderOnline: true } : { riderOnline: false },
        });
        return { online };
    }
    async setLocation(userId, lat, lng) {
        const r = await this.prisma.user.updateMany({
            where: { id: userId, riderOnline: true },
            data: { riderLat: lat, riderLng: lng, riderLocationAt: new Date() },
        });
        return { saved: r.count === 1 };
    }
    async deliveries(userId) {
        const [active, done] = await Promise.all([
            this.prisma.order.findMany({
                where: {
                    driverId: userId,
                    type: 'DELIVERY',
                    deliveryStatus: { in: [...ACTIVE] },
                },
                include: CARD_INCLUDE,
                orderBy: { assignedAt: 'asc' },
                take: 50,
            }),
            this.prisma.order.findMany({
                where: {
                    driverId: userId,
                    type: 'DELIVERY',
                    deliveryStatus: { in: ['DELIVERED', 'FAILED'] },
                    updatedAt: { gte: startOfToday() },
                },
                include: CARD_INCLUDE,
                orderBy: { updatedAt: 'desc' },
                take: 30,
            }),
        ]);
        return { active: active.map(present), done: done.map(present) };
    }
    async setStatus(userId, orderId, status, reason) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, type: 'DELIVERY', driverId: userId },
            select: { id: true, branchId: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Delivery not found');
        if (status === 'FAILED' && !reason?.trim()) {
            throw new common_1.BadRequestException('Say why the delivery could not be completed');
        }
        await this.delivery.setStatus(order.branchId, orderId, status, reason?.trim());
        const card = await this.prisma.order.findUniqueOrThrow({
            where: { id: orderId },
            include: CARD_INCLUDE,
        });
        return present(card);
    }
};
exports.RiderService = RiderService;
exports.RiderService = RiderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        delivery_service_1.DeliveryService])
], RiderService);
//# sourceMappingURL=rider.service.js.map