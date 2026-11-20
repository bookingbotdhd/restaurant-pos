import { type PaymentGatewayAdapter } from './adapter';
export declare const cashfreeAdapter: PaymentGatewayAdapter;
export declare function cashfreeIdempotencyKey(reference: string): string;
export declare function extractLinkId(raw: string): string | null;
