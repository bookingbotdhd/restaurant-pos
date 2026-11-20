import { type SessionUser } from '@nodedr-restaurant/types';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    list(user: SessionUser): import("@prisma/client").Prisma.PrismaPromise<{
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
    listRoles(user: SessionUser): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        label: string;
        name: string;
        createdAt: Date;
        restaurantId: string;
        isSystem: boolean;
    }[]>;
    create(user: SessionUser, body: unknown): Promise<{
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
    update(user: SessionUser, id: string, body: unknown): Promise<{
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
    remove(user: SessionUser, id: string): Promise<{
        ok: boolean;
    }>;
    listDepartments(user: SessionUser): import("@prisma/client").Prisma.PrismaPromise<({
        _count: {
            users: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        restaurantId: string;
    })[]>;
    createDepartment(user: SessionUser, body: unknown): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        restaurantId: string;
    }>;
    renameDepartment(user: SessionUser, id: string, body: unknown): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        restaurantId: string;
    }>;
    removeDepartment(user: SessionUser, id: string): Promise<{
        ok: boolean;
    }>;
    setPermissionOverrides(user: SessionUser, id: string, body: unknown): Promise<{
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
}
