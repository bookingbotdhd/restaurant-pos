import { PrismaService } from '../prisma/prisma.service';
export interface ConnectInput {
    externalAccountId?: string;
    credentials: Record<string, string>;
}
export declare class IntegrationHubService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private provider;
    private view;
    list(restaurantId: string): Promise<{
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
    private log;
    private require;
    connect(restaurantId: string, userId: string, providerKey: string, input: ConnectInput): Promise<{
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
    setEnabled(restaurantId: string, providerKey: string, enabled: boolean): Promise<{
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
    test(restaurantId: string, providerKey: string): Promise<{
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
    disconnect(restaurantId: string, providerKey: string): Promise<{
        ok: boolean;
    }>;
    logs(restaurantId: string, providerKey: string): Promise<{
        id: string;
        createdAt: Date;
        message: string;
        event: string;
        level: string;
    }[]>;
}
