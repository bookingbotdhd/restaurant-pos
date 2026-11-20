import { z } from 'zod';
import { OrdersService } from '../modules/orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
export declare const aggregatorEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    event: z.ZodLiteral<"ping">;
}, z.core.$strip>, z.ZodObject<{
    event: z.ZodLiteral<"order.cancelled">;
    orderId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    event: z.ZodLiteral<"order.created">;
    orderId: z.ZodString;
    branchId: z.ZodOptional<z.ZodString>;
    type: z.ZodDefault<z.ZodEnum<{
        TAKEAWAY: "TAKEAWAY";
        DELIVERY: "DELIVERY";
    }>>;
    paymentMode: z.ZodOptional<z.ZodEnum<{
        PREPAID: "PREPAID";
        COD: "COD";
    }>>;
    customer: z.ZodObject<{
        name: z.ZodString;
        phone: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        ref: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    delivery: z.ZodOptional<z.ZodObject<{
        address: z.ZodString;
        pincode: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    notes: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        menuItemId: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        quantity: z.ZodNumber;
        kitchenNote: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>], "event">;
export type AggregatorEvent = z.infer<typeof aggregatorEventSchema>;
export declare function signAggregatorBody(secret: string, timestamp: string, rawBody: string): string;
export declare class AggregatorOrdersService {
    private readonly prisma;
    private readonly orders;
    private readonly logger;
    constructor(prisma: PrismaService, orders: OrdersService);
    private log;
    receive(restaurantId: string, providerKey: string, headers: Record<string, string | string[] | undefined>, rawBody: string): Promise<{
        ok: boolean;
        cancelled: boolean;
        needsAttention?: undefined;
    } | {
        ok: boolean;
        cancelled: boolean;
        needsAttention: boolean;
    } | {
        orderId: string;
        orderNumber: string | number;
        ok: boolean;
        duplicate: boolean;
    } | {
        ok: boolean;
    }>;
    private cancel;
    private staffFor;
    private createOrder;
    private ref;
}
