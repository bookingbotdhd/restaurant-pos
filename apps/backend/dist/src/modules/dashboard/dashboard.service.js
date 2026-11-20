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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const dashboard_prefs_1 = require("./dashboard-prefs");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary(branchId, permissions = []) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const [revenueAgg, ordersToday, orderTypeCounts, tableCounts, kitchenQueue, recentOrders,] = await Promise.all([
            this.prisma.order.aggregate({
                where: { branchId, status: 'PAID', billedAt: { gte: startOfDay } },
                _sum: { totalAmount: true },
            }),
            this.prisma.order.count({
                where: { branchId, createdAt: { gte: startOfDay } },
            }),
            this.prisma.order.groupBy({
                by: ['channel'],
                where: { branchId, createdAt: { gte: startOfDay } },
                _count: true,
            }),
            this.prisma.table.groupBy({
                by: ['status'],
                where: { floor: { branchId } },
                _count: true,
            }),
            this.prisma.kot.groupBy({
                by: ['status'],
                where: {
                    order: { branchId },
                    status: { notIn: ['SERVED', 'CANCELLED'] },
                },
                _count: true,
            }),
            this.prisma.order.findMany({
                where: { branchId, status: 'PAID' },
                orderBy: { billedAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    orderNumber: true,
                    type: true,
                    totalAmount: true,
                    billedAt: true,
                },
            }),
        ]);
        const has = (p) => permissions.includes(p);
        const attention = await this.attention(branchId, has);
        const tableStatusMap = Object.fromEntries(tableCounts.map((row) => [row.status, row._count]));
        const kitchenQueueMap = Object.fromEntries(kitchenQueue.map((row) => [row.status, row._count]));
        const channels = orderTypeCounts.reduce((acc, row) => {
            if (row.channel === 'ONLINE') {
                acc.online += row._count;
            }
            else {
                acc.offline += row._count;
            }
            return acc;
        }, { online: 0, offline: 0 });
        return {
            todayRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
            todayOrders: ordersToday,
            channels,
            tables: {
                available: tableStatusMap.AVAILABLE ?? 0,
                occupied: tableStatusMap.OCCUPIED ?? 0,
                reserved: tableStatusMap.RESERVED ?? 0,
                cleaning: tableStatusMap.CLEANING ?? 0,
                outOfService: tableStatusMap.OUT_OF_SERVICE ?? 0,
            },
            kitchenQueue: {
                new: kitchenQueueMap.NEW ?? 0,
                accepted: kitchenQueueMap.ACCEPTED ?? 0,
                preparing: kitchenQueueMap.PREPARING ?? 0,
                ready: kitchenQueueMap.READY ?? 0,
            },
            recentOrders,
            ...attention,
        };
    }
    async attention(branchId, has) {
        const [pending, lowStock, customers, employees, draftPayroll] = await Promise.all([
            this.prisma.order.findMany({
                where: {
                    branchId,
                    status: 'OPEN',
                    payments: { some: {} },
                },
                select: { totalAmount: true, payments: { select: { amount: true } } },
            }),
            has('inventory.manage')
                ? this.prisma.ingredient.findMany({
                    where: { branchId },
                    select: { currentStock: true, reorderLevel: true },
                })
                : null,
            has('customers.manage')
                ? this.prisma.customer.count({ where: { branchId } })
                : null,
            has('staff.manage')
                ? this.prisma.user.count({
                    where: { isActive: true, branches: { some: { branchId } } },
                })
                : null,
            has('staff.manage')
                ? this.prisma.payrollRun.count({
                    where: { branchId, status: { in: ['DRAFT', 'FINALIZED'] } },
                })
                : null,
        ]);
        const owed = pending.reduce((sum, o) => {
            const paid = o.payments.reduce((p, x) => p + Number(x.amount), 0);
            return sum + Math.max(Number(o.totalAmount) - paid, 0);
        }, 0);
        return {
            pendingPayments: {
                count: pending.length,
                balance: Math.round(owed * 100) / 100,
            },
            lowStock: lowStock === null
                ? null
                : lowStock.filter((i) => Number(i.currentStock) <= Number(i.reorderLevel)).length,
            customers,
            employees,
            unpaidPayrollRuns: draftPayroll,
        };
    }
    async getPreferences(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { dashboardPrefs: true },
        });
        return (0, dashboard_prefs_1.sanitizePrefs)(user?.dashboardPrefs);
    }
    async setPreferences(userId, raw) {
        const prefs = (0, dashboard_prefs_1.sanitizePrefs)(raw);
        await this.prisma.user.update({
            where: { id: userId },
            data: { dashboardPrefs: prefs },
        });
        return prefs;
    }
    async getTrends(branchId, days = 14) {
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        since.setDate(since.getDate() - (days - 1));
        const [orders, wasteLogs] = await Promise.all([
            this.prisma.order.findMany({
                where: { branchId, status: 'PAID', billedAt: { gte: since } },
                select: { totalAmount: true, billedAt: true },
            }),
            this.prisma.wasteLog.findMany({
                where: { branchId, createdAt: { gte: since } },
                select: { quantity: true, unitCostAtWaste: true, createdAt: true },
            }),
        ]);
        const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const revenueByDay = new Map();
        const wasteByDay = new Map();
        for (let i = 0; i < days; i++) {
            const d = new Date(since);
            d.setDate(d.getDate() + i);
            const key = dateKey(d);
            revenueByDay.set(key, 0);
            wasteByDay.set(key, 0);
        }
        for (const order of orders) {
            if (!order.billedAt)
                continue;
            const key = dateKey(order.billedAt);
            if (revenueByDay.has(key)) {
                revenueByDay.set(key, revenueByDay.get(key) + Number(order.totalAmount));
            }
        }
        for (const log of wasteLogs) {
            const key = dateKey(log.createdAt);
            if (wasteByDay.has(key)) {
                const cost = Number(log.quantity) * Number(log.unitCostAtWaste);
                wasteByDay.set(key, wasteByDay.get(key) + cost);
            }
        }
        return {
            revenue: [...revenueByDay.entries()].map(([date, amount]) => ({
                date,
                amount: Math.round(amount * 100) / 100,
            })),
            waste: [...wasteByDay.entries()].map(([date, cost]) => ({
                date,
                cost: Math.round(cost * 100) / 100,
            })),
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map