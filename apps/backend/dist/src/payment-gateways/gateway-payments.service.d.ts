import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../modules/orders/orders.service';
import { type GatewayModeKey } from './adapters/adapter';
import type { RefundDto } from '@nodedr-restaurant/types';
import { PaymentGatewaysService } from './payment-gateways.service';
export declare class WebhookRejected extends Error {
}
export declare class GatewayPaymentsService {
    private readonly prisma;
    private readonly gateways;
    private readonly orders;
    private readonly logger;
    private readonly lastFetch;
    constructor(prisma: PrismaService, gateways: PaymentGatewaysService, orders: OrdersService);
    baseUrl(requestOrigin?: string): string;
    create(restaurantId: string, branchId: string, orderId: string, userId: string, input: {
        customerPhone?: string;
        customerName?: string;
        origin?: string;
    }): Promise<{
        id: string;
        orderId: string;
        provider: string;
        mode: import("@prisma/client").$Enums.GatewayMode;
        status: import("@prisma/client").$Enums.GatewayPaymentStatus;
        amountMinor: number;
        currency: string;
        checkoutUrl: string | null;
        note: string | null;
        createdAt: Date;
    }>;
    refresh(id: string, scope?: {
        restaurantId: string;
        branchId?: string;
    }): Promise<{
        id: string;
        orderId: string;
        provider: string;
        mode: import("@prisma/client").$Enums.GatewayMode;
        status: import("@prisma/client").$Enums.GatewayPaymentStatus;
        amountMinor: number;
        currency: string;
        checkoutUrl: string | null;
        note: string | null;
        createdAt: Date;
    }>;
    private apply;
    webhook(restaurantId: string, provider: string, mode: GatewayModeKey, headers: Record<string, string | undefined>, rawBody: string): Promise<{
        duplicate: boolean;
    }>;
    refund(restaurantId: string, branchId: string, gatewayPaymentId: string, userId: string, input: {
        amount: number;
        reason?: string;
        returnedItems?: RefundDto['returnedItems'];
    }): Promise<{
        ok: boolean;
        providerRefundId: string;
        amount: number;
        currency: string;
    }>;
    refundsNeedingReview(restaurantId: string): Promise<{
        id: string;
        orderId: string;
        provider: string;
        amountMinor: number;
        currency: string;
        note: string | null;
        providerRefundId: string | null;
        createdAt: Date;
    }[]>;
    refundsForOrder(restaurantId: string, orderId: string): Promise<{
        id: string;
        gatewayPaymentId: string;
        amountMinor: number;
        currency: string;
        status: import("@prisma/client").$Enums.GatewayRefundStatus;
        note: string | null;
        createdAt: Date;
    }[]>;
    forOrder(restaurantId: string, branchId: string, orderId: string): Promise<{
        refundableMinor: number;
        id: string;
        orderId: string;
        provider: string;
        mode: import("@prisma/client").$Enums.GatewayMode;
        status: import("@prisma/client").$Enums.GatewayPaymentStatus;
        amountMinor: number;
        currency: string;
        checkoutUrl: string | null;
        note: string | null;
        createdAt: Date;
    }[]>;
    activeSummary(restaurantId: string): Promise<{
        provider: string;
        name: string;
        mode: import("@prisma/client").$Enums.GatewayMode;
        requiresCustomerPhone: boolean;
    } | null>;
    recent(restaurantId: string): Promise<{
        id: string;
        orderId: string;
        provider: string;
        mode: import("@prisma/client").$Enums.GatewayMode;
        status: import("@prisma/client").$Enums.GatewayPaymentStatus;
        amountMinor: number;
        currency: string;
        checkoutUrl: string | null;
        note: string | null;
        createdAt: Date;
    }[]>;
    publicStatus(id: string): Promise<{
        status: import("@prisma/client").$Enums.GatewayPaymentStatus;
        test: boolean;
    }>;
    private present;
}
