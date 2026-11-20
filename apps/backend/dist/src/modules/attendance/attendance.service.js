"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const time_1 = require("../../common/time");
const branch_time_service_1 = require("../../common/services/branch-time.service");
const audit_service_1 = require("../../audit/audit.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const WITH_USER = {
    user: { select: { id: true, name: true } },
};
let AttendanceService = class AttendanceService {
    prisma;
    time;
    audit;
    constructor(prisma, time, audit) {
        this.prisma = prisma;
        this.time = time;
        this.audit = audit;
    }
    current(userId) {
        return this.prisma.attendance.findFirst({
            where: { userId, clockOutAt: null },
            include: WITH_USER,
            orderBy: { clockInAt: 'desc' },
        });
    }
    async clockIn(userId, branchId, note) {
        return this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${'clockin:' + userId}))`;
            const open = await tx.attendance.findFirst({
                where: { userId, clockOutAt: null },
            });
            if (open)
                throw new common_1.BadRequestException('Already clocked in');
            return tx.attendance.create({
                data: { userId, branchId, note },
                include: WITH_USER,
            });
        });
    }
    async clockOut(userId, note) {
        const open = await this.current(userId);
        if (!open)
            throw new common_1.BadRequestException('Not clocked in');
        return this.prisma.attendance.update({
            where: { id: open.id },
            data: { clockOutAt: new Date(), ...(note ? { note } : {}) },
            include: WITH_USER,
        });
    }
    async list(branchId, date, userId) {
        let range;
        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
                throw new common_1.BadRequestException('date must be YYYY-MM-DD');
            range = (0, time_1.zonedRange)(date, date, await this.time.tzForBranch(branchId));
        }
        return this.prisma.attendance.findMany({
            where: {
                branchId,
                ...(userId ? { userId } : {}),
                ...(range ? { clockInAt: range } : {}),
            },
            include: WITH_USER,
            orderBy: { clockInAt: 'desc' },
            take: 500,
        });
    }
    async correct(restaurantId, actorId, id, dto) {
        const rec = await this.prisma.attendance.findFirst({
            where: { id, branch: { restaurantId } },
        });
        if (!rec)
            throw new common_1.NotFoundException('Attendance record not found');
        const clockInAt = dto.clockInAt ?? rec.clockInAt;
        const clockOutAt = dto.clockOutAt === undefined ? rec.clockOutAt : dto.clockOutAt;
        const now = Date.now();
        if (clockInAt.getTime() > now + 60_000)
            throw new common_1.BadRequestException('Clock-in cannot be in the future');
        if (clockOutAt) {
            if (clockOutAt.getTime() > now + 60_000)
                throw new common_1.BadRequestException('Clock-out cannot be in the future');
            if (clockOutAt <= clockInAt)
                throw new common_1.BadRequestException('Clock-out must be after clock-in');
            if (clockOutAt.getTime() - clockInAt.getTime() > 24 * 3_600_000)
                throw new common_1.BadRequestException('A shift cannot be longer than 24 hours');
        }
        const overlap = await this.prisma.attendance.findFirst({
            where: {
                userId: rec.userId,
                id: { not: rec.id },
                clockInAt: { lt: clockOutAt ?? new Date(now + 24 * 3_600_000) },
                OR: [{ clockOutAt: null }, { clockOutAt: { gt: clockInAt } }],
            },
        });
        if (overlap)
            throw new common_1.BadRequestException('This overlaps another shift of the same person');
        const days = [
            rec.clockInAt,
            rec.clockOutAt ?? rec.clockInAt,
            clockInAt,
            clockOutAt ?? clockInAt,
        ];
        const lo = new Date(Math.min(...days.map((d) => d.getTime())));
        const hi = new Date(Math.max(...days.map((d) => d.getTime())));
        const locked = await this.prisma.payrollRun.findFirst({
            where: {
                branchId: rec.branchId,
                status: { in: ['FINALIZED', 'PAID'] },
                periodStart: { lte: hi },
                periodEnd: { gte: new Date(lo.getTime() - 24 * 3_600_000) },
            },
        });
        if (locked)
            throw new common_1.BadRequestException('This falls inside a payroll run that is already finalized - it cannot be changed');
        const updated = await this.prisma.attendance.update({
            where: { id },
            data: {
                clockInAt,
                clockOutAt,
                ...(dto.note !== undefined ? { note: dto.note } : {}),
            },
            include: WITH_USER,
        });
        await this.audit.record({
            userId: actorId,
            action: 'attendance.corrected',
            entity: 'Attendance',
            entityId: id,
            metadata: {
                reason: dto.reason,
                staff: updated.user.name,
                before: {
                    clockInAt: rec.clockInAt,
                    clockOutAt: rec.clockOutAt,
                    note: rec.note,
                },
                after: {
                    clockInAt: updated.clockInAt,
                    clockOutAt: updated.clockOutAt,
                    note: updated.note,
                },
            },
        });
        return updated;
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        branch_time_service_1.BranchTimeService,
        audit_service_1.AuditService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map