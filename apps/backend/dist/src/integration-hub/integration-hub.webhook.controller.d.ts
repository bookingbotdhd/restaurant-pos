import type { Request } from 'express';
import { AggregatorOrdersService } from './aggregator-orders.service';
export declare class IntegrationHubWebhookController {
    private readonly svc;
    constructor(svc: AggregatorOrdersService);
    receive(restaurantId: string, provider: string, headers: Record<string, string>, req: Request & {
        rawBody?: Buffer;
    }): Promise<{
        ok: boolean;
        cancelled: boolean;
        needsAttention?: undefined;
    } | {
        ok: boolean;
        cancelled: boolean;
        needsAttention: boolean;
    } | {
        orderId: string;
        orderNumber: string | number;
        ok: boolean;
        duplicate: boolean;
    } | {
        ok: boolean;
    }>;
}
