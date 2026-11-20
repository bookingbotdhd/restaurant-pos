import type { SessionUser } from '@nodedr-restaurant/types';
import { z } from 'zod';
import { BranchAccessService } from '../../common/services/branch-access.service';
import { AttendanceService } from './attendance.service';
declare const clockInSchema: z.ZodObject<{
    branchId: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const clockOutSchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const correctionSchema: z.ZodObject<{
    clockInAt: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    clockOutAt: z.ZodOptional<z.ZodUnion<readonly [z.ZodCoercedDate<unknown>, z.ZodNull]>>;
    note: z.ZodOptional<z.ZodString>;
    reason: z.ZodString;
}, z.core.$strip>;
export declare class AttendanceController {
    private readonly attendance;
    private readonly branchAccess;
    constructor(attendance: AttendanceService, branchAccess: BranchAccessService);
    me(user: SessionUser): Promise<({
        user: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        userId: string;
        branchId: string;
        clockInAt: Date;
        clockOutAt: Date | null;
        note: string | null;
    }) | null>;
    clockIn(user: SessionUser, body: z.infer<typeof clockInSchema>): Promise<{
        user: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        userId: string;
        branchId: string;
        clockInAt: Date;
        clockOutAt: Date | null;
        note: string | null;
    }>;
    clockOut(user: SessionUser, body: z.infer<typeof clockOutSchema>): Promise<{
        user: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        userId: string;
        branchId: string;
        clockInAt: Date;
        clockOutAt: Date | null;
        note: string | null;
    }>;
    list(user: SessionUser, branchId: string, date?: string, userId?: string): Promise<({
        user: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        userId: string;
        branchId: string;
        clockInAt: Date;
        clockOutAt: Date | null;
        note: string | null;
    })[]>;
    correct(user: SessionUser, id: string, body: z.infer<typeof correctionSchema>): Promise<{
        user: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        userId: string;
        branchId: string;
        clockInAt: Date;
        clockOutAt: Date | null;
        note: string | null;
    }>;
}
export {};
