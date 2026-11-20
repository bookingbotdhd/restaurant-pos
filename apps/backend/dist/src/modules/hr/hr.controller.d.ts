import { type LeaveRequestDto, type PayrollLineAdjustDto, type PayrollPayDto, type PayrollRunDto, type SessionUser, type ShiftDto, type StaffPayDto } from '@nodedr-restaurant/types';
import { BranchAccessService } from '../../common/services/branch-access.service';
import { HrService } from './hr.service';
export declare class HrController {
    private readonly hr;
    private readonly branchAccess;
    constructor(hr: HrService, branchAccess: BranchAccessService);
    private access;
    shifts(u: SessionUser, branchId: string, from?: string, to?: string): Promise<({
        user: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        userId: string;
        branchId: string;
        note: string | null;
        startsAt: Date;
        endsAt: Date;
    })[]>;
    myShifts(u: SessionUser, branchId: string): Promise<({
        user: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        userId: string;
        branchId: string;
        note: string | null;
        startsAt: Date;
        endsAt: Date;
    })[]>;
    createShift(u: SessionUser, branchId: string, body: ShiftDto): Promise<{
        user: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        userId: string;
        branchId: string;
        note: string | null;
        startsAt: Date;
        endsAt: Date;
    }>;
    deleteShift(u: SessionUser, branchId: string, id: string): Promise<{
        ok: boolean;
    }>;
    requestLeave(u: SessionUser, body: LeaveRequestDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        branchId: string;
        status: import("@prisma/client").$Enums.LeaveStatus;
        type: import("@prisma/client").$Enums.LeaveType;
        reason: string | null;
        startDate: Date;
        endDate: Date;
        decidedById: string | null;
        decidedAt: Date | null;
    }>;
    myLeave(u: SessionUser): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        userId: string;
        branchId: string;
        status: import("@prisma/client").$Enums.LeaveStatus;
        type: import("@prisma/client").$Enums.LeaveType;
        reason: string | null;
        startDate: Date;
        endDate: Date;
        decidedById: string | null;
        decidedAt: Date | null;
    }[]>;
    leave(u: SessionUser, branchId: string, status?: string): Promise<({
        user: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        branchId: string;
        status: import("@prisma/client").$Enums.LeaveStatus;
        type: import("@prisma/client").$Enums.LeaveType;
        reason: string | null;
        startDate: Date;
        endDate: Date;
        decidedById: string | null;
        decidedAt: Date | null;
    })[]>;
    decide(u: SessionUser, branchId: string, id: string, body: {
        status: 'APPROVED' | 'REJECTED';
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        branchId: string;
        status: import("@prisma/client").$Enums.LeaveStatus;
        type: import("@prisma/client").$Enums.LeaveType;
        reason: string | null;
        startDate: Date;
        endDate: Date;
        decidedById: string | null;
        decidedAt: Date | null;
    }>;
    pay(u: SessionUser, branchId: string): Promise<{
        userId: string;
        name: string;
        payType: import("@prisma/client").$Enums.PayType | null;
        rate: number | null;
    }[]>;
    setPay(u: SessionUser, branchId: string, userId: string, body: StaffPayDto): Promise<{
        userId: string;
        payType: import("@prisma/client").$Enums.PayType;
        rate: import("@prisma/client/runtime/library").Decimal;
    }>;
    runs(u: SessionUser, branchId: string): Promise<{
        id: string;
        createdAt: Date;
        branchId: string;
        status: import("@prisma/client").$Enums.PayrollStatus;
        periodStart: Date;
        periodEnd: Date;
        tipPool: import("@prisma/client/runtime/library").Decimal;
        totalNet: import("@prisma/client/runtime/library").Decimal;
        finalizedAt: Date | null;
        paidAt: Date | null;
        paidById: string | null;
        paymentMethod: string | null;
        paymentRef: string | null;
    }[]>;
    run(u: SessionUser, branchId: string, id: string): Promise<{
        lines: ({
            user: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            userId: string;
            hoursWorked: import("@prisma/client/runtime/library").Decimal;
            basePay: import("@prisma/client/runtime/library").Decimal;
            tipShare: import("@prisma/client/runtime/library").Decimal;
            unpaidLeaveDeduction: import("@prisma/client/runtime/library").Decimal;
            allowances: import("@prisma/client/runtime/library").Decimal;
            bonus: import("@prisma/client/runtime/library").Decimal;
            advanceRecovery: import("@prisma/client/runtime/library").Decimal;
            otherDeductions: import("@prisma/client/runtime/library").Decimal;
            adjustmentNote: string | null;
            netPay: import("@prisma/client/runtime/library").Decimal;
            runId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        branchId: string;
        status: import("@prisma/client").$Enums.PayrollStatus;
        periodStart: Date;
        periodEnd: Date;
        tipPool: import("@prisma/client/runtime/library").Decimal;
        totalNet: import("@prisma/client/runtime/library").Decimal;
        finalizedAt: Date | null;
        paidAt: Date | null;
        paidById: string | null;
        paymentMethod: string | null;
        paymentRef: string | null;
    }>;
    createRun(u: SessionUser, branchId: string, body: PayrollRunDto): Promise<{
        lines: ({
            user: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            userId: string;
            hoursWorked: import("@prisma/client/runtime/library").Decimal;
            basePay: import("@prisma/client/runtime/library").Decimal;
            tipShare: import("@prisma/client/runtime/library").Decimal;
            unpaidLeaveDeduction: import("@prisma/client/runtime/library").Decimal;
            allowances: import("@prisma/client/runtime/library").Decimal;
            bonus: import("@prisma/client/runtime/library").Decimal;
            advanceRecovery: import("@prisma/client/runtime/library").Decimal;
            otherDeductions: import("@prisma/client/runtime/library").Decimal;
            adjustmentNote: string | null;
            netPay: import("@prisma/client/runtime/library").Decimal;
            runId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        branchId: string;
        status: import("@prisma/client").$Enums.PayrollStatus;
        periodStart: Date;
        periodEnd: Date;
        tipPool: import("@prisma/client/runtime/library").Decimal;
        totalNet: import("@prisma/client/runtime/library").Decimal;
        finalizedAt: Date | null;
        paidAt: Date | null;
        paidById: string | null;
        paymentMethod: string | null;
        paymentRef: string | null;
    }>;
    finalize(u: SessionUser, branchId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        branchId: string;
        status: import("@prisma/client").$Enums.PayrollStatus;
        periodStart: Date;
        periodEnd: Date;
        tipPool: import("@prisma/client/runtime/library").Decimal;
        totalNet: import("@prisma/client/runtime/library").Decimal;
        finalizedAt: Date | null;
        paidAt: Date | null;
        paidById: string | null;
        paymentMethod: string | null;
        paymentRef: string | null;
    }>;
    adjustLine(u: SessionUser, branchId: string, id: string, userId: string, body: PayrollLineAdjustDto): Promise<{
        user: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        userId: string;
        hoursWorked: import("@prisma/client/runtime/library").Decimal;
        basePay: import("@prisma/client/runtime/library").Decimal;
        tipShare: import("@prisma/client/runtime/library").Decimal;
        unpaidLeaveDeduction: import("@prisma/client/runtime/library").Decimal;
        allowances: import("@prisma/client/runtime/library").Decimal;
        bonus: import("@prisma/client/runtime/library").Decimal;
        advanceRecovery: import("@prisma/client/runtime/library").Decimal;
        otherDeductions: import("@prisma/client/runtime/library").Decimal;
        adjustmentNote: string | null;
        netPay: import("@prisma/client/runtime/library").Decimal;
        runId: string;
    }>;
    payRun(u: SessionUser, branchId: string, id: string, body: PayrollPayDto): Promise<{
        lines: ({
            user: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            userId: string;
            hoursWorked: import("@prisma/client/runtime/library").Decimal;
            basePay: import("@prisma/client/runtime/library").Decimal;
            tipShare: import("@prisma/client/runtime/library").Decimal;
            unpaidLeaveDeduction: import("@prisma/client/runtime/library").Decimal;
            allowances: import("@prisma/client/runtime/library").Decimal;
            bonus: import("@prisma/client/runtime/library").Decimal;
            advanceRecovery: import("@prisma/client/runtime/library").Decimal;
            otherDeductions: import("@prisma/client/runtime/library").Decimal;
            adjustmentNote: string | null;
            netPay: import("@prisma/client/runtime/library").Decimal;
            runId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        branchId: string;
        status: import("@prisma/client").$Enums.PayrollStatus;
        periodStart: Date;
        periodEnd: Date;
        tipPool: import("@prisma/client/runtime/library").Decimal;
        totalNet: import("@prisma/client/runtime/library").Decimal;
        finalizedAt: Date | null;
        paidAt: Date | null;
        paidById: string | null;
        paymentMethod: string | null;
        paymentRef: string | null;
    }>;
    slip(u: SessionUser, branchId: string, id: string, userId: string): Promise<{
        employer: string;
        branch: string;
        address: string | null;
        periodStart: Date;
        periodEnd: Date;
        status: import("@prisma/client").$Enums.PayrollStatus;
        paidAt: Date | null;
        paymentMethod: string | null;
        employee: string;
        hoursWorked: number;
        earnings: {
            basePay: number;
            tipShare: number;
            allowances: number;
            bonus: number;
        };
        deductions: {
            unpaidLeave: number;
            advanceRecovery: number;
            other: number;
        };
        netPay: number;
        note: string | null;
    }>;
    deleteRun(u: SessionUser, branchId: string, id: string): Promise<{
        ok: boolean;
    }>;
    performance(u: SessionUser, branchId: string, from: string, to: string): Promise<{
        userId: string;
        name: string;
        orders: number;
        sales: number;
        tips: number;
        hoursWorked: number;
        salesPerHour: number | null;
    }[]>;
}
