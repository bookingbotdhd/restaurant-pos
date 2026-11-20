import { type CredentialField, type IntegrationProvider, type ProviderCapabilities, type TestResult } from './provider';
export declare class WebhookOrderProvider implements IntegrationProvider {
    readonly key: string;
    readonly name: string;
    readonly description: string;
    readonly requirements: string;
    readonly source: string;
    readonly accountIdLabel?: string | undefined;
    readonly category: "FOOD_DELIVERY";
    readonly capabilities: ProviderCapabilities;
    readonly accountIdOptional = true;
    readonly credentialFields: CredentialField[];
    constructor(key: string, name: string, description: string, requirements: string, source: string, accountIdLabel?: string | undefined);
    testConnection(): Promise<TestResult>;
}
