import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare const CODE_RE: RegExp;
export type AttachResult = {
    applied: true;
    referrerName: string | null;
} | {
    applied: false;
    reason: string;
};
export declare class ReferralsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    config(restaurantId: string): Promise<{
        enabled: boolean;
        sharerPoints: number;
        referredPoints: number;
        minPurchase: number;
        onlineMinOrder: number;
        pointValue: number;
        currency: string;
    }>;
    codeFor(customerId: string): Promise<string>;
    attach(restaurantId: string, referredId: string, rawCode: string, sharedItemId?: string): Promise<AttachResult>;
    onOrderPaid(tx: Prisma.TransactionClient, order: {
        id: string;
        branchId: string;
        customerId: string | null;
        totalAmount: number;
        foodValue: number;
    }): Promise<void>;
    private credit;
    recordOrderPoints(tx: Prisma.TransactionClient, a: {
        branchId: string;
        customerId: string;
        orderId: string;
        earned: number;
        redeemed: number;
    }): Promise<void>;
    summary(restaurantId: string, customerId: string): Promise<{
        referralEnabled: boolean;
        code: string | null;
        points: number;
        pointValue: number;
        currency: string;
        balanceValue: number;
        sharerPoints: number;
        referredPoints: number;
        minPurchase: number;
        onlineMinOrder: number;
        rewards: {
            points: number;
            discount: number;
        }[];
        invited: number;
        rewarded: number;
        pointsFromReferrals: number;
        referredBy: import("@prisma/client").$Enums.ReferralStatus | null;
        history: {
            createdAt: Date;
            reason: string;
            delta: number;
        }[];
    }>;
}
