import type { SessionUser } from '@nodedr-restaurant/types';
import { z } from 'zod';
import { PaymentGatewaysService } from './payment-gateways.service';
declare const saveSchema: z.ZodObject<{
    country: z.ZodString;
    mode: z.ZodEnum<{
        TEST: "TEST";
        LIVE: "LIVE";
    }>;
    credentials: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
declare const modeSchema: z.ZodObject<{
    mode: z.ZodEnum<{
        TEST: "TEST";
        LIVE: "LIVE";
    }>;
    confirm: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const enabledSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
}, z.core.$strip>;
declare const testSchema: z.ZodObject<{
    mode: z.ZodOptional<z.ZodEnum<{
        TEST: "TEST";
        LIVE: "LIVE";
    }>>;
}, z.core.$strip>;
declare const customSchema: z.ZodObject<{
    name: z.ZodString;
    countries: z.ZodArray<z.ZodString>;
    docsUrl: z.ZodString;
    integration: z.ZodOptional<z.ZodString>;
    adapter: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare class PaymentGatewaysController {
    private readonly svc;
    constructor(svc: PaymentGatewaysService);
    countries(u: SessionUser): Promise<{
        code: string;
        name: string;
    }[]>;
    catalog(u: SessionUser, country?: string): Promise<{
        country: string;
        researchedAt: string;
        note: string;
        providers: {
            connection: import("./payment-gateways.service").ConnectionView | null;
            fields: {
                key: string;
                label: string;
                secret: boolean;
                required: boolean;
                help?: string;
            }[];
            requiresCustomerPhone: boolean;
            limitations: string[];
            key: string;
            name: string;
            integration: string;
            docsUrl: string;
            notes: string | null;
            sources: string[];
            custom: boolean;
            integrated: boolean;
        }[];
        customProviderAllowed: boolean;
    }>;
    connections(u: SessionUser): Promise<import("./payment-gateways.service").ConnectionView[]>;
    saveCustom(u: SessionUser, key: string, body: z.infer<typeof customSchema>): Promise<{
        adapter: string | null;
        id: string;
        key: string;
        name: string;
        updatedAt: Date;
        restaurantId: string | null;
        notes: string | null;
        active: boolean;
        countries: string[];
        integration: string;
        docsUrl: string;
        sources: string[];
        researchedAt: string | null;
    }>;
    removeCustom(u: SessionUser, key: string): Promise<{
        ok: boolean;
    }>;
    save(u: SessionUser, provider: string, body: z.infer<typeof saveSchema>): Promise<import("./payment-gateways.service").ConnectionView>;
    test(u: SessionUser, provider: string, body: z.infer<typeof testSchema>): Promise<{
        ok: boolean;
        mode: import("@prisma/client").$Enums.GatewayMode;
        message: string;
    }>;
    setMode(u: SessionUser, provider: string, body: z.infer<typeof modeSchema>): Promise<import("./payment-gateways.service").ConnectionView>;
    setEnabled(u: SessionUser, provider: string, body: z.infer<typeof enabledSchema>): Promise<import("./payment-gateways.service").ConnectionView>;
    removeCredentials(u: SessionUser, provider: string, m: string): Promise<import("./payment-gateways.service").ConnectionView>;
    remove(u: SessionUser, provider: string): Promise<{
        ok: boolean;
    }>;
}
export {};
