import { z } from 'zod';
export declare const offlineSaleSchema: z.ZodObject<{
    id: z.ZodString;
    localNumber: z.ZodString;
    soldAt: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<{
        DINE_IN: "DINE_IN";
        TAKEAWAY: "TAKEAWAY";
    }>>;
    tableLabel: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        menuItemId: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodCoercedNumber<unknown>;
    }, z.core.$strip>>;
    discountPercent: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    discountFlat: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    payments: z.ZodArray<z.ZodObject<{
        method: z.ZodEnum<{
            CASH: "CASH";
            CARD: "CARD";
            UPI: "UPI";
            OTHER: "OTHER";
        }>;
        amount: z.ZodCoercedNumber<unknown>;
        tendered: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        reference: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const offlineSalesSchema: z.ZodObject<{
    deviceName: z.ZodOptional<z.ZodString>;
    sales: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        localNumber: z.ZodString;
        soldAt: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<{
            DINE_IN: "DINE_IN";
            TAKEAWAY: "TAKEAWAY";
        }>>;
        tableLabel: z.ZodOptional<z.ZodString>;
        note: z.ZodOptional<z.ZodString>;
        items: z.ZodArray<z.ZodObject<{
            menuItemId: z.ZodString;
            quantity: z.ZodNumber;
            unitPrice: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>>;
        discountPercent: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        discountFlat: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        payments: z.ZodArray<z.ZodObject<{
            method: z.ZodEnum<{
                CASH: "CASH";
                CARD: "CARD";
                UPI: "UPI";
                OTHER: "OTHER";
            }>;
            amount: z.ZodCoercedNumber<unknown>;
            tendered: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            reference: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type OfflineSaleDto = z.infer<typeof offlineSaleSchema>;
export type OfflineSalesDto = z.infer<typeof offlineSalesSchema>;
export type OfflineSaleResult = {
    id: string;
    status: 'created' | 'duplicate';
    orderId: string;
    orderNumber: string;
} | {
    id: string;
    status: 'refused';
    reason: string;
};
