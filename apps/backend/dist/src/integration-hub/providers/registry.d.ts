import type { IntegrationProvider } from './provider';
export declare const listProviders: () => IntegrationProvider[];
export declare const getProvider: (key: string) => IntegrationProvider | undefined;
export declare const sourceOf: (provider: IntegrationProvider) => string;
export declare function supports(provider: IntegrationProvider, op: keyof IntegrationProvider['capabilities']): boolean;
