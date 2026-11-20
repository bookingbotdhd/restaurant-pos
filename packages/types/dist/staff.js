"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPermissionOverridesSchema = exports.departmentSchema = exports.updateStaffSchema = exports.createStaffSchema = void 0;
const zod_1 = require("zod");
exports.createStaffSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    password: zod_1.z.string().min(8),
    roleId: zod_1.z.string().min(1),
    branchIds: zod_1.z.array(zod_1.z.string()).min(1),
    departmentId: zod_1.z.string().min(1).nullable().optional(),
});
exports.updateStaffSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    roleId: zod_1.z.string().min(1).optional(),
    isActive: zod_1.z.boolean().optional(),
    branchIds: zod_1.z.array(zod_1.z.string()).optional(),
    password: zod_1.z.string().min(8).optional(),
    departmentId: zod_1.z.string().min(1).nullable().optional(),
});
// --- Departments & per-user permission overrides -----------------------------
exports.departmentSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(60),
});
exports.setPermissionOverridesSchema = zod_1.z.object({
    overrides: zod_1.z
        .array(zod_1.z.object({
        permissionKey: zod_1.z.string().min(1).max(80),
        effect: zod_1.z.enum(["GRANT", "DENY"]),
        reason: zod_1.z.string().trim().max(200).optional(),
        // ISO timestamp; omitted = never expires.
        expiresAt: zod_1.z.string().datetime().optional(),
    }))
        .max(100),
});
