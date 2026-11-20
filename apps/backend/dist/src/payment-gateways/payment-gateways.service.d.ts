import { OnModuleInit } from '@nestjs/common';
import type { GatewayMode, PaymentGatewayConnection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { GatewayContext, PaymentGatewayAdapter } from './adapters/adapter';
export interface ConnectionView {
    provider: string;
    country: string;
    enabled: boolean;
    mode: GatewayMode;
    liveConfirmedAt: Date | null;
    testKeys: string[];
    liveKeys: string[];
    testComplete: boolean;
    liveComplete: boolean;
    lastTestedAt: Date | null;
    lastTestOk: boolean | null;
    lastError: string | null;
    webhookPaths: {
        TEST: string;
        LIVE: string;
    };
}
export declare class PaymentGatewaysService implements OnModuleInit {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    private describeAdapter;
    countries(restaurantId: string): Promise<{
        code: string;
        name: string;
    }[]>;
    catalog(restaurantId: string, country: string): Promise<{
        country: string;
        researchedAt: string;
        note: string;
        providers: {
            connection: ConnectionView | null;
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
    upsertCustomEntry(restaurantId: string, input: {
        key: string;
        name: string;
        countries: string[];
        docsUrl: string;
        integration?: string;
        adapter?: string | null;
        notes?: string;
    }): Promise<{
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
    deleteCustomEntry(restaurantId: string, key: string): Promise<{
        ok: boolean;
    }>;
    private adapterFor;
    private entry;
    private complete;
    view(restaurantId: string, c: PaymentGatewayConnection, a: PaymentGatewayAdapter | null): ConnectionView;
    connections(restaurantId: string): Promise<ConnectionView[]>;
    credentials(restaurantId: string, c: PaymentGatewayConnection, mode: GatewayMode): Record<string, string>;
    context(restaurantId: string, c: PaymentGatewayConnection, mode: GatewayMode): GatewayContext;
    saveCredentials(restaurantId: string, providerKey: string, input: {
        country: string;
        mode: GatewayMode;
        credentials: Record<string, string>;
    }): Promise<ConnectionView>;
    removeCredentials(restaurantId: string, providerKey: string, mode: GatewayMode): Promise<ConnectionView>;
    removeConnection(restaurantId: string, providerKey: string): Promise<{
        ok: boolean;
    }>;
    private require;
    test(restaurantId: string, providerKey: string, mode?: GatewayMode): Promise<{
        ok: boolean;
        mode: import("@prisma/client").$Enums.GatewayMode;
        message: string;
    }>;
    setMode(restaurantId: string, userId: string, providerKey: string, mode: GatewayMode, confirm?: string): Promise<ConnectionView>;
    setEnabled(restaurantId: string, providerKey: string, enabled: boolean): Promise<ConnectionView>;
    active(restaurantId: string): Promise<{
        connection: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            country: string;
            lastError: string | null;
            provider: string;
            enabled: boolean;
            mode: import("@prisma/client").$Enums.GatewayMode;
            liveConfirmedAt: Date | null;
            liveConfirmedById: string | null;
            testCredentialsEnc: string | null;
            liveCredentialsEnc: string | null;
            testKeys: string[];
            liveKeys: string[];
            lastTestedAt: Date | null;
            lastTestOk: boolean | null;
        };
        adapter: PaymentGatewayAdapter;
    } | null>;
    adaptersAvailable(): {
        key: string;
        name: string;
    }[];
}
