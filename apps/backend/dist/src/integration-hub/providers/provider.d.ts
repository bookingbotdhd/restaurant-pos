export type IntegrationCategory = 'FOOD_DELIVERY' | 'PAYMENT' | 'ACCOUNTING' | 'MARKETING' | 'MESSAGING' | 'AUTOMATION';
export interface ProviderCapabilities {
    receiveOrders: boolean;
    updateOrderStatus: boolean;
    cancelOrders: boolean;
    webhooks: boolean;
    oauth: boolean;
}
export interface CredentialField {
    key: string;
    label: string;
    secret: boolean;
    required: boolean;
    help?: string;
}
export interface ProviderContext {
    restaurantId: string;
    externalAccountId: string | null;
    credentials: Record<string, string>;
}
export interface TestResult {
    ok: boolean;
    status: 'CONNECTED' | 'PENDING_CONFIGURATION' | 'AUTH_EXPIRED' | 'SYNC_ERROR';
    message: string;
}
export interface IntegrationProvider {
    readonly key: string;
    readonly name: string;
    readonly category: IntegrationCategory;
    readonly description: string;
    readonly capabilities: ProviderCapabilities;
    readonly credentialFields: CredentialField[];
    readonly accountIdLabel?: string;
    readonly accountIdOptional?: boolean;
    readonly requirements?: string;
    testConnection(ctx: ProviderContext): Promise<TestResult>;
    updateOrderStatus?(ctx: ProviderContext, externalOrderId: string, status: 'ACCEPTED' | 'REJECTED' | 'READY' | 'CANCELLED', reason?: string): Promise<void>;
    processWebhook?(ctx: ProviderContext, headers: Record<string, string>, rawBody: string): Promise<{
        externalOrderId?: string;
    }>;
    refreshCredentials?(ctx: ProviderContext): Promise<Record<string, string>>;
}
export declare const NO_CAPABILITIES: ProviderCapabilities;
