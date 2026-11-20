import type { PaymentGatewayAdapter } from './adapter';
export declare const getAdapter: (key: string | null | undefined) => PaymentGatewayAdapter | null;
export declare const listAdapters: () => PaymentGatewayAdapter[];
