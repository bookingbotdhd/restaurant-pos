import { z } from "zod";
export declare const createStaffSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    roleId: z.ZodString;
    branchIds: z.ZodArray<z.ZodString>;
    departmentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type CreateStaffDto = z.infer<typeof createStaffSchema>;
export declare const updateStaffSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    roleId: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    branchIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    password: z.ZodOptional<z.ZodString>;
    departmentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpdateStaffDto = z.infer<typeof updateStaffSchema>;
export declare const departmentSchema: z.ZodObject<{
    name: z.ZodString;
}, z.core.$strip>;
export type DepartmentDto = z.infer<typeof departmentSchema>;
export declare const setPermissionOverridesSchema: z.ZodObject<{
    overrides: z.ZodArray<z.ZodObject<{
        permissionKey: z.ZodString;
        effect: z.ZodEnum<{
            GRANT: "GRANT";
            DENY: "DENY";
        }>;
        reason: z.ZodOptional<z.ZodString>;
        expiresAt: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type SetPermissionOverridesDto = z.infer<typeof setPermissionOverridesSchema>;
