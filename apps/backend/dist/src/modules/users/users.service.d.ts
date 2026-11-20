import type { CreateStaffDto, DepartmentDto, SetPermissionOverridesDto, UpdateStaffDto } from '@nodedr-restaurant/types';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    list(restaurantId: string): Prisma.PrismaPromise<{
        id: string;
        name: string;
        createdAt: Date;
        branches: {
            branch: {
                id: string;
                name: string;
            };
        }[];
        phone: string | null;
        isActive: boolean;
        role: {
            id: string;
            label: string;
            name: string;
        };
        roleId: string;
        departmentId: string | null;
        email: string | null;
        department: {
            id: string;
            name: string;
        } | null;
        permissionOverrides: {
            permission: {
                key: string;
            };
            effect: import("@prisma/client").$Enums.PermissionEffect;
            reason: string | null;
            expiresAt: Date | null;
        }[];
    }[]>;
    listRoles(restaurantId: string): Prisma.PrismaPromise<{
        id: string;
        label: string;
        name: string;
        createdAt: Date;
        restaurantId: string;
        isSystem: boolean;
    }[]>;
    create(restaurantId: string, actorId: string, dto: CreateStaffDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        branches: {
            branch: {
                id: string;
                name: string;
            };
        }[];
        phone: string | null;
        isActive: boolean;
        role: {
            id: string;
            label: string;
            name: string;
        };
        roleId: string;
        departmentId: string | null;
        email: string | null;
        department: {
            id: string;
            name: string;
        } | null;
        permissionOverrides: {
            permission: {
                key: string;
            };
            effect: import("@prisma/client").$Enums.PermissionEffect;
            reason: string | null;
            expiresAt: Date | null;
        }[];
    }>;
    update(restaurantId: string, actorId: string, id: string, dto: UpdateStaffDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        branches: {
            branch: {
                id: string;
                name: string;
            };
        }[];
        phone: string | null;
        isActive: boolean;
        role: {
            id: string;
            label: string;
            name: string;
        };
        roleId: string;
        departmentId: string | null;
        email: string | null;
        department: {
            id: string;
            name: string;
        } | null;
        permissionOverrides: {
            permission: {
                key: string;
            };
            effect: import("@prisma/client").$Enums.PermissionEffect;
            reason: string | null;
            expiresAt: Date | null;
        }[];
    }>;
    remove(restaurantId: string, actorId: string, id: string): Promise<{
        ok: boolean;
    }>;
    listDepartments(restaurantId: string): Prisma.PrismaPromise<({
        _count: {
            users: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        restaurantId: string;
    })[]>;
    createDepartment(restaurantId: string, actorId: string, dto: DepartmentDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        restaurantId: string;
    }>;
    renameDepartment(restaurantId: string, actorId: string, id: string, dto: DepartmentDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        restaurantId: string;
    }>;
    removeDepartment(restaurantId: string, actorId: string, id: string): Promise<{
        ok: boolean;
    }>;
    setPermissionOverrides(restaurantId: string, actor: {
        id: string;
        permissions: string[];
    }, targetId: string, dto: SetPermissionOverridesDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        branches: {
            branch: {
                id: string;
                name: string;
            };
        }[];
        phone: string | null;
        isActive: boolean;
        role: {
            id: string;
            label: string;
            name: string;
        };
        roleId: string;
        departmentId: string | null;
        email: string | null;
        department: {
            id: string;
            name: string;
        } | null;
        permissionOverrides: {
            permission: {
                key: string;
            };
            effect: import("@prisma/client").$Enums.PermissionEffect;
            reason: string | null;
            expiresAt: Date | null;
        }[];
    }>;
    private assertDepartmentInRestaurant;
    private assertRoleInRestaurant;
    private assertBranchesInRestaurant;
}
