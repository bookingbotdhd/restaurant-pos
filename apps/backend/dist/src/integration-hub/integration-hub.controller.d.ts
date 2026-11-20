import type { SessionUser } from '@nodedr-restaurant/types';
import { z } from 'zod';
import { IntegrationHubService } from './integration-hub.service';
declare const connectSchema: z.ZodObject<{
    externalAccountId: z.ZodOptional<z.ZodString>;
    credentials: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
declare const enabledSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
}, z.core.$strip>;
export declare class IntegrationHubController {
    private readonly hub;
    constructor(hub: IntegrationHubService);
    list(u: SessionUser): Promise<{
        key: string;
        name: string;
        category: import("./providers/provider").IntegrationCategory;
        description: string;
        capabilities: import("./providers/provider").ProviderCapabilities;
        accountIdLabel: string | null;
        webhookPath: string | null;
        requirements: string | null;
        credentialFields: import("./providers/provider").CredentialField[];
        connection: {
            id: string;
            enabled: boolean;
            status: import("@prisma/client").$Enums.IntegrationStatus;
            externalAccountId: string | null;
            credentialsSet: {
                [k: string]: boolean;
            };
            lastSyncAt: Date | null;
            lastSuccessAt: Date | null;
            lastError: string | null;
            updatedAt: Date;
        } | null;
    }[]>;
    connect(u: SessionUser, provider: string, body: z.infer<typeof connectSchema>): Promise<{
        id: string;
        enabled: boolean;
        status: import("@prisma/client").$Enums.IntegrationStatus;
        externalAccountId: string | null;
        credentialsSet: {
            [k: string]: boolean;
        };
        lastSyncAt: Date | null;
        lastSuccessAt: Date | null;
        lastError: string | null;
        updatedAt: Date;
    } | null>;
    test(u: SessionUser, provider: string): Promise<{
        ok: boolean;
        message: string;
        connection: {
            id: string;
            enabled: boolean;
            status: import("@prisma/client").$Enums.IntegrationStatus;
            externalAccountId: string | null;
            credentialsSet: {
                [k: string]: boolean;
            };
            lastSyncAt: Date | null;
            lastSuccessAt: Date | null;
            lastError: string | null;
            updatedAt: Date;
        } | null;
    }>;
    setEnabled(u: SessionUser, provider: string, body: z.infer<typeof enabledSchema>): Promise<{
        id: string;
        enabled: boolean;
        status: import("@prisma/client").$Enums.IntegrationStatus;
        externalAccountId: string | null;
        credentialsSet: {
            [k: string]: boolean;
        };
        lastSyncAt: Date | null;
        lastSuccessAt: Date | null;
        lastError: string | null;
        updatedAt: Date;
    } | null>;
    logs(u: SessionUser, provider: string): Promise<{
        id: string;
        createdAt: Date;
        message: string;
        event: string;
        level: string;
    }[]>;
    disconnect(u: SessionUser, provider: string): Promise<{
        ok: boolean;
    }>;
}
export {};
