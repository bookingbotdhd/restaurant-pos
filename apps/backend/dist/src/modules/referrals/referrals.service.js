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
exports.ReferralsService = exports.CODE_RE = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
exports.CODE_RE = /^[A-Z0-9]{6,12}$/;
const digits = (p) => (p ?? '').replace(/\D/g, '');
const samePhone = (a, b) => {
    const x = digits(a).slice(-10);
    const y = digits(b).slice(-10);
    return x.length >= 6 && x === y;
};
let ReferralsService = class ReferralsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async config(restaurantId) {
        const r = await this.prisma.restaurant.findUniqueOrThrow({
            where: { id: restaurantId },
            select: {
                referralEnabled: true,
                referralSharerPoints: true,
                referralReferredPoints: true,
                referralMinPurchase: true,
                onlineMinOrderAmount: true,
                loyaltyPointValue: true,
                currency: true,
            },
        });
        return {
            enabled: r.referralEnabled,
            sharerPoints: r.referralSharerPoints,
            referredPoints: r.referralReferredPoints,
            minPurchase: Number(r.referralMinPurchase),
            onlineMinOrder: Number(r.onlineMinOrderAmount),
            pointValue: Number(r.loyaltyPointValue),
            currency: r.currency,
        };
    }
    async codeFor(customerId) {
        const c = await this.prisma.customer.findUniqueOrThrow({
            where: { id: customerId },
            select: { referralCode: true },
        });
        if (c.referralCode)
            return c.referralCode;
        for (let i = 0; i < 6; i++) {
            const bytes = (0, node_crypto_1.randomBytes)(7);
            const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
            try {
                const r = await this.prisma.customer.updateMany({
                    where: { id: customerId, referralCode: null },
                    data: { referralCode: code },
                });
                if (r.count === 0)
                    break;
                return code;
            }
            catch (e) {
                if (!(e instanceof client_1.Prisma.PrismaClientKnownRequestError) ||
                    e.code !== 'P2002')
                    throw e;
            }
        }
        return (await this.prisma.customer.findUniqueOrThrow({
            where: { id: customerId },
            select: { referralCode: true },
        })).referralCode;
    }
    async attach(restaurantId, referredId, rawCode, sharedItemId) {
        const no = (reason) => ({ applied: false, reason });
        const code = rawCode.trim().toUpperCase();
        if (!exports.CODE_RE.test(code))
            return no('Invalid referral code');
        const cfg = await this.config(restaurantId);
        if (!cfg.enabled)
            return no('Referral rewards are not active');
        const referrer = await this.prisma.customer.findFirst({
            where: { referralCode: code, branch: { restaurantId } },
        });
        if (!referrer)
            return no('Unknown referral code');
        const referred = await this.prisma.customer.findFirst({
            where: { id: referredId, branch: { restaurantId } },
        });
        if (!referred)
            return no('Unknown customer');
        if (referrer.id === referred.id ||
            samePhone(referrer.phone, referred.phone)) {
            return no('You cannot use your own referral code');
        }
        const existing = await this.prisma.referral.findUnique({
            where: { referredId },
        });
        if (existing)
            return no('This customer was already referred');
        const prior = await this.prisma.order.count({
            where: {
                customerId: referredId,
                status: { in: ['PAID', 'BILLED'] },
            },
        });
        if (prior > 0)
            return no('Referral rewards are for new customers');
        if (referred.phone) {
            const tail = digits(referred.phone).slice(-10);
            if (tail.length >= 6) {
                const others = await this.prisma.customer.findMany({
                    where: {
                        branch: { restaurantId },
                        id: { not: referred.id },
                        phone: { endsWith: tail },
                    },
                    select: { id: true },
                });
                if (others.length) {
                    const paid = await this.prisma.order.count({
                        where: {
                            customerId: { in: others.map((o) => o.id) },
                            status: 'PAID',
                        },
                    });
                    if (paid > 0)
                        return no('Referral rewards are for new customers');
                }
            }
        }
        try {
            await this.prisma.referral.create({
                data: {
                    branchId: referred.branchId,
                    code,
                    referrerId: referrer.id,
                    referredId,
                    sharedItemId: sharedItemId?.slice(0, 64),
                },
            });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002') {
                return no('This customer was already referred');
            }
            throw e;
        }
        return { applied: true, referrerName: referrer.name };
    }
    async onOrderPaid(tx, order) {
        if (!order.customerId || !(order.totalAmount > 0))
            return;
        const referral = await tx.referral.findUnique({
            where: { referredId: order.customerId },
        });
        if (!referral || referral.status !== 'PENDING')
            return;
        const branch = await tx.branch.findUniqueOrThrow({
            where: { id: order.branchId },
            select: {
                restaurant: {
                    select: {
                        referralEnabled: true,
                        referralSharerPoints: true,
                        referralReferredPoints: true,
                        referralMinPurchase: true,
                    },
                },
            },
        });
        const r = branch.restaurant;
        if (!r.referralEnabled)
            return;
        if (order.foodValue < Number(r.referralMinPurchase))
            return;
        const claim = await tx.referral.updateMany({
            where: { id: referral.id, status: 'PENDING' },
            data: {
                status: 'REWARDED',
                rewardedAt: new Date(),
                qualifyingOrderId: order.id,
                referrerPoints: r.referralSharerPoints,
                referredPoints: r.referralReferredPoints,
            },
        });
        if (claim.count !== 1)
            return;
        await this.credit(tx, {
            branchId: referral.branchId,
            customerId: referral.referredId,
            points: r.referralReferredPoints,
            reason: 'REFERRAL_REFERRED',
            key: `referral:${referral.id}:referred`,
            referralId: referral.id,
            orderId: order.id,
        });
        await this.credit(tx, {
            branchId: referral.branchId,
            customerId: referral.referrerId,
            points: r.referralSharerPoints,
            reason: 'REFERRAL_REFERRER',
            key: `referral:${referral.id}:referrer`,
            referralId: referral.id,
            orderId: order.id,
        });
    }
    async credit(tx, a) {
        if (a.points <= 0)
            return;
        await tx.pointsLedger.create({
            data: {
                branchId: a.branchId,
                customerId: a.customerId,
                delta: a.points,
                reason: a.reason,
                referralId: a.referralId,
                orderId: a.orderId,
                idempotencyKey: a.key,
            },
        });
        await tx.customer.update({
            where: { id: a.customerId },
            data: { loyaltyPoints: { increment: a.points } },
        });
    }
    async recordOrderPoints(tx, a) {
        const rows = [];
        if (a.earned > 0) {
            rows.push({
                branchId: a.branchId,
                customerId: a.customerId,
                delta: a.earned,
                reason: 'EARN',
                orderId: a.orderId,
                idempotencyKey: `earn:${a.orderId}`,
            });
        }
        if (a.redeemed > 0) {
            rows.push({
                branchId: a.branchId,
                customerId: a.customerId,
                delta: -a.redeemed,
                reason: 'REDEEM',
                orderId: a.orderId,
                idempotencyKey: `redeem:${a.orderId}`,
            });
        }
        if (rows.length)
            await tx.pointsLedger.createMany({ data: rows, skipDuplicates: true });
    }
    async summary(restaurantId, customerId) {
        const db = this.prisma;
        const cfg = await this.config(restaurantId);
        const c = await db.customer.findUniqueOrThrow({
            where: { id: customerId },
            select: { id: true, name: true, phone: true, loyaltyPoints: true },
        });
        const code = cfg.enabled ? await this.codeFor(customerId) : null;
        const [invited, rewarded, earned, ledger] = await Promise.all([
            db.referral.count({ where: { referrerId: customerId } }),
            db.referral.count({
                where: { referrerId: customerId, status: 'REWARDED' },
            }),
            db.pointsLedger.aggregate({
                where: { customerId, reason: 'REFERRAL_REFERRER' },
                _sum: { delta: true },
            }),
            db.pointsLedger.findMany({
                where: { customerId },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { delta: true, reason: true, createdAt: true },
            }),
        ]);
        const pts = c.loyaltyPoints;
        const value = cfg.pointValue;
        const round = (n) => Math.round(n * 100) / 100;
        const steps = [100, 250, 500, 1000, 2500, 5000].filter((s) => s <= pts);
        if (pts > 0 && !steps.includes(pts))
            steps.push(pts);
        const referred = await db.referral.findUnique({
            where: { referredId: customerId },
            select: { status: true },
        });
        return {
            referralEnabled: cfg.enabled,
            code,
            points: pts,
            pointValue: value,
            currency: cfg.currency,
            balanceValue: round(pts * value),
            sharerPoints: cfg.sharerPoints,
            referredPoints: cfg.referredPoints,
            minPurchase: cfg.minPurchase,
            onlineMinOrder: cfg.onlineMinOrder,
            rewards: steps.map((p) => ({ points: p, discount: round(p * value) })),
            invited,
            rewarded,
            pointsFromReferrals: earned._sum.delta ?? 0,
            referredBy: referred?.status ?? null,
            history: ledger,
        };
    }
};
exports.ReferralsService = ReferralsService;
exports.ReferralsService = ReferralsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReferralsService);
//# sourceMappingURL=referrals.service.js.map