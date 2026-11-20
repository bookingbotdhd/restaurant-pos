"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionInclude = void 0;
exports.effectivePermissions = effectivePermissions;
exports.permissionInclude = {
    role: { include: { permissions: { include: { permission: true } } } },
    permissionOverrides: { include: { permission: true } },
};
function effectivePermissions(user, now = new Date()) {
    const keys = new Set(user.role.permissions.map((rp) => rp.permission.key));
    const live = (user.permissionOverrides ?? []).filter((o) => !o.expiresAt || o.expiresAt.getTime() > now.getTime());
    for (const o of live)
        if (o.effect === 'GRANT')
            keys.add(o.permission.key);
    for (const o of live)
        if (o.effect === 'DENY')
            keys.delete(o.permission.key);
    return [...keys];
}
//# sourceMappingURL=effective-permissions.js.map