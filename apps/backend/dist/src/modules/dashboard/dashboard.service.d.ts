import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { type DashboardPrefs } from './dashboard-prefs';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSummary(branchId: string, permissions?: string[]): Promise<{
        pendingPayments: {
            count: number;
            balance: number;
        };
        lowStock: number | null;
        customers: number | null;
        employees: number | null;
        unpaidPayrollRuns: number | null;
        todayRevenue: number;
        todayOrders: number;
        channels: {
            online: number;
            offline: number;
        };
        tables: {
            available: number;
            occupied: number;
            reserved: number;
            cleaning: number;
            outOfService: number;
        };
        kitchenQueue: {
            new: number;
            accepted: number;
            preparing: number;
            ready: number;
        };
        recentOrders: {
            id: string;
            orderNumber: string;
            type: import("@prisma/client").$Enums.OrderType;
            totalAmount: Prisma.Decimal;
            billedAt: Date | null;
        }[];
    }>;
    private attention;
    getPreferences(userId: string): Promise<DashboardPrefs>;
    setPreferences(userId: string, raw: unknown): Promise<DashboardPrefs>;
    getTrends(branchId: string, days?: number): Promise<{
        revenue: {
            date: string;
            amount: number;
        }[];
        waste: {
            date: string;
            cost: number;
        }[];
    }>;
}
