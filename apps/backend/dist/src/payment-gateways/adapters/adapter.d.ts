export type GatewayModeKey = 'TEST' | 'LIVE';
export interface GatewayField {
    key: string;
    label: string;
    secret: boolean;
    required: boolean;
    help?: string;
    validate?: (value: string, mode: GatewayModeKey) => string | null;
}
export interface GatewayContext {
    mode: GatewayModeKey;
    credentials: Record<string, string>;
}
export interface CreatePaymentInput {
    amountMinor: number;
    currency: string;
    reference: string;
    description: string;
    returnUrl: string;
    notifyUrl: string;
    customer?: {
        name?: string;
        phone?: string;
        email?: string;
    };
}
export interface CreatePaymentResult {
    providerRef: string;
    checkoutUrl: string;
}
export interface RemoteStatus {
    state: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED';
    paidMinor: number;
    requestedMinor: number;
    currency: string;
    reference?: string | null;
    providerPaymentId?: string | null;
}
export interface VerifiedWebhook {
    eventId: string;
    providerRef: string | null;
}
export interface RefundInput {
    providerPaymentId: string;
    amountMinor: number;
    currency: string;
    reference: string;
}
export interface RefundResult {
    providerRefundId: string;
    state: 'DONE' | 'PENDING';
}
export interface TestOutcome {
    ok: boolean;
    message: string;
}
export interface PaymentGatewayAdapter {
    readonly key: string;
    readonly name: string;
    readonly docsUrl: string;
    readonly integration: string;
    readonly fields: GatewayField[];
    readonly requiresCustomerPhone?: boolean;
    readonly limitations: string[];
    refund?(ctx: GatewayContext, input: RefundInput): Promise<RefundResult>;
    testConnection(ctx: GatewayContext): Promise<TestOutcome>;
    createPayment(ctx: GatewayContext, input: CreatePaymentInput): Promise<CreatePaymentResult>;
    fetchStatus(ctx: GatewayContext, providerRef: string): Promise<RemoteStatus>;
    verifyWebhook(ctx: GatewayContext, headers: Record<string, string | undefined>, rawBody: string): VerifiedWebhook;
}
export declare class GatewayError extends Error {
    readonly status?: number | undefined;
    constructor(message: string, status?: number | undefined);
}
