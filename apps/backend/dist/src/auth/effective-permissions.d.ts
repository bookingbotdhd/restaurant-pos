export interface PermissionSource {
    role: {
        permissions: {
            permission: {
                key: string;
            };
        }[];
    };
    permissionOverrides?: {
        effect: 'GRANT' | 'DENY';
        expiresAt: Date | null;
        permission: {
            key: string;
        };
    }[];
}
export declare const permissionInclude: {
    readonly role: {
        readonly include: {
            readonly permissions: {
                readonly include: {
                    readonly permission: true;
                };
            };
        };
    };
    readonly permissionOverrides: {
        readonly include: {
            readonly permission: true;
        };
    };
};
export declare function effectivePermissions(user: PermissionSource, now?: Date): string[];
