import type { NotificationListQueryDto } from '@nodedr-restaurant/types';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
export interface NotifyPayload {
    type: string;
    title: string;
    body: string;
    entity?: string;
    entityId?: string;
}
export declare class NotificationsService {
    private readonly prisma;
    private readonly realtime;
    private readonly push;
    constructor(prisma: PrismaService, realtime: RealtimeGateway, push: PushService);
    private pathFor;
    notifyByPermission(branchId: string, permissionKey: string, payload: NotifyPayload): Promise<void>;
    notifyUser(userId: string, branchId: string, payload: NotifyPayload): Promise<void>;
    list(userId: string, query: NotificationListQueryDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            branchId: string;
            type: string;
            entity: string | null;
            entityId: string | null;
            body: string;
            recipientUserId: string | null;
            title: string;
            readAt: Date | null;
        }[];
        total: number;
        unreadCount: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    markRead(userId: string, id: string): Promise<{
        id: string;
        readAt: Date | null;
    }>;
    markAllRead(userId: string): Promise<{
        ok: boolean;
    }>;
}
