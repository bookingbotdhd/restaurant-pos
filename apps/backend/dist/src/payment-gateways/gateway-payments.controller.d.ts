import type { SessionUser } from '@nodedr-restaurant/types';
import type { Request } from 'express';
import { z } from 'zod';
import { GatewayPaymentsService } from './gateway-payments.service';
declare const createSchema: z.ZodObject<{
    customerPhone: z.ZodOptional<z.ZodString>;
    customerName: z.ZodOptional<z.ZodString>;
    origin: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const refundSchema: z.ZodObject<{
    amount: z.ZodCoercedNumber<unknown>;
    reason: z.ZodOptional<z.ZodString>;
    returnedItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
        orderItemId: z.ZodString;
        quantity: z.ZodCoercedNumber<unknown>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare class GatewayPaymentsController {
    private readonly svc;
    constructor(svc: GatewayPaymentsService);
    create(u: SessionUser, branchId: string, orderId: string, body: z.infer<typeof createSchema>): Promise<{
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
    list(u: SessionUser, branchId: string, orderId: string): Promise<{
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
    active(u: SessionUser): Promise<{
        provider: string;
        name: string;
        mode: import("@prisma/client").$Enums.GatewayMode;
        requiresCustomerPhone: boolean;
    } | null>;
    recent(u: SessionUser): Promise<{
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
    refundsToReview(u: SessionUser): Promise<{
        id: string;
        orderId: string;
        provider: string;
        amountMinor: number;
        currency: string;
        note: string | null;
        providerRefundId: string | null;
        createdAt: Date;
    }[]>;
    refund(u: SessionUser, branchId: string, id: string, body: z.infer<typeof refundSchema>): Promise<{
        ok: boolean;
        providerRefundId: string;
        amount: number;
        currency: string;
    }>;
    refresh(u: SessionUser, branchId: string, id: string): Promise<{
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
}
export declare class GatewayPaymentsPublicController {
    private readonly svc;
    constructor(svc: GatewayPaymentsService);
    webhook(restaurantId: string, provider: string, mode: string, headers: Record<string, string | undefined>, req: Request & {
        rawBody?: Buffer;
    }): Promise<{
        duplicate: boolean;
    }>;
    status(id: string): Promise<{
        status: import("@prisma/client").$Enums.GatewayPaymentStatus;
        test: boolean;
    }>;
}
export {};
