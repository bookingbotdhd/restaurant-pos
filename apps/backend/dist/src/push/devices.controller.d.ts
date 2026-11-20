import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';
declare const registerSchema: z.ZodObject<{
    token: z.ZodString;
    platform: z.ZodEnum<{
        ANDROID: "ANDROID";
        IOS: "IOS";
    }>;
    appVersion: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare class DevicesController {
    private readonly prisma;
    private readonly push;
    constructor(prisma: PrismaService, push: PushService);
    config(): {
        minVersion: string;
        latestVersion: string;
        push: boolean;
    };
    register(user: {
        id: string;
    }, body: z.infer<typeof registerSchema>): Promise<{
        ok: boolean;
    }>;
    unregister(user: {
        id: string;
    }, token: string): Promise<{
        ok: boolean;
    }>;
}
export {};
