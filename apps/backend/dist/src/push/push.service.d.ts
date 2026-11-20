import { PrismaService } from '../prisma/prisma.service';
export interface PushMessage {
    title: string;
    body: string;
    path?: string;
    data?: Record<string, string>;
}
export declare class PushService {
    private readonly prisma;
    private readonly log;
    private account;
    private cached;
    constructor(prisma: PrismaService);
    private load;
    get enabled(): boolean;
    private accessToken;
    sendToUsers(userIds: string[], msg: PushMessage): void;
    private deliver;
}
