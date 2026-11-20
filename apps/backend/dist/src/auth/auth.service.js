"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const types_1 = require("@nodedr-restaurant/types");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const two_factor_service_1 = require("./two-factor.service");
const effective_permissions_1 = require("./effective-permissions");
let AuthService = class AuthService {
    prisma;
    jwt;
    twoFactor;
    constructor(prisma, jwt, twoFactor) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.twoFactor = twoFactor;
    }
    toSessionUser(user) {
        return {
            id: user.id,
            restaurantId: user.restaurantId,
            name: user.name,
            roleId: user.roleId,
            roleName: user.role.name,
            permissions: (0, effective_permissions_1.effectivePermissions)(user),
        };
    }
    async deleteOwnAccount(userId, password) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            throw new common_1.UnauthorizedException('Password is incorrect');
        }
        if (user.role.name === 'OWNER') {
            const otherOwners = await this.prisma.user.count({
                where: {
                    restaurantId: user.restaurantId,
                    isActive: true,
                    id: { not: user.id },
                    role: { name: 'OWNER' },
                },
            });
            if (otherOwners === 0) {
                throw new common_1.ConflictException('You are the only owner. Make someone else an owner first, or contact support to close the restaurant.');
            }
        }
        const scrambled = await bcrypt.hash(`${userId}:${Date.now()}:${Math.random()}`, 10);
        await this.prisma.$transaction([
            this.prisma.deviceToken.deleteMany({ where: { userId } }),
            this.prisma.notification.deleteMany({
                where: { recipientUserId: userId },
            }),
            this.prisma.user.update({
                where: { id: userId },
                data: {
                    name: 'Deleted user',
                    email: null,
                    phone: null,
                    passwordHash: scrambled,
                    pinHash: null,
                    isActive: false,
                    riderOnline: false,
                    riderLat: null,
                    riderLng: null,
                    riderLocationAt: null,
                    dashboardPrefs: client_1.Prisma.JsonNull,
                    twoFactorSecret: null,
                    twoFactorEnabled: false,
                    twoFactorRecoveryHashes: [],
                },
            }),
        ]);
        return { ok: true };
    }
    async login(dto) {
        const include = effective_permissions_1.permissionInclude;
        const id = dto.email.trim();
        let user = null;
        if (id.includes('@')) {
            const u = await this.prisma.user.findFirst({
                where: { email: id, isActive: true },
                include,
            });
            if (u && (await bcrypt.compare(dto.password, u.passwordHash)))
                user = u;
        }
        else {
            user = await this.findLoginCandidate(id, dto.password);
        }
        if (!user) {
            await bcrypt.compare(dto.password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
            throw new common_1.UnauthorizedException('Invalid login ID or password');
        }
        if (user.twoFactorEnabled) {
            await this.twoFactor.verifyLogin(user, dto.totp);
        }
        return this.issueSession(user);
    }
    async findLoginCandidate(id, password) {
        const tail = id.replace(/\D/g, '').slice(-10);
        if (tail.length < 6)
            return null;
        const candidates = await this.prisma.user.findMany({
            where: { isActive: true, phone: { endsWith: tail.slice(-6) } },
            include: effective_permissions_1.permissionInclude,
            take: 10,
        });
        for (const u of candidates) {
            if ((u.phone ?? '').replace(/\D/g, '').slice(-10) !== tail)
                continue;
            if (await bcrypt.compare(password, u.passwordHash))
                return u;
        }
        return null;
    }
    async register(dto) {
        if (process.env.ALLOW_PUBLIC_SIGNUP !== 'true' &&
            (await this.hasAnyRestaurant())) {
            throw new common_1.ForbiddenException('Sign-up is closed on this server. Ask the restaurant owner to create your account.');
        }
        const existing = await this.prisma.user.findFirst({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.BadRequestException('An account with this email already exists');
        }
        for (const permission of types_1.PERMISSIONS) {
            await this.prisma.permission.upsert({
                where: { key: permission.key },
                update: {},
                create: permission,
            });
        }
        const allPermissions = await this.prisma.permission.findMany();
        const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const owner = await this.prisma.$transaction(async (tx) => {
            const restaurant = await tx.restaurant.create({
                data: { name: dto.restaurantName },
            });
            const branch = await tx.branch.create({
                data: { restaurantId: restaurant.id, name: dto.branchName },
            });
            let ownerRoleId = '';
            for (const roleName of types_1.STAFF_ROLES) {
                const role = await tx.role.create({
                    data: {
                        restaurantId: restaurant.id,
                        name: roleName,
                        label: roleName.replace(/_/g, ' '),
                    },
                });
                if (roleName === 'OWNER')
                    ownerRoleId = role.id;
                const grantedKeys = types_1.DEFAULT_ROLE_PERMISSIONS[roleName];
                await tx.rolePermission.createMany({
                    data: grantedKeys
                        .map((key) => permissionByKey.get(key))
                        .filter((p) => Boolean(p))
                        .map((permission) => ({
                        roleId: role.id,
                        permissionId: permission.id,
                    })),
                });
            }
            const user = await tx.user.create({
                data: {
                    restaurantId: restaurant.id,
                    roleId: ownerRoleId,
                    name: dto.ownerName,
                    email: dto.email,
                    passwordHash,
                },
                include: effective_permissions_1.permissionInclude,
            });
            await tx.userBranch.create({
                data: { userId: user.id, branchId: branch.id },
            });
            return user;
        });
        return this.issueSession(owner);
    }
    async hasAnyRestaurant() {
        const restaurant = await this.prisma.restaurant.findFirst({
            select: { id: true },
        });
        return restaurant !== null;
    }
    async pinLogin(dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
            include: effective_permissions_1.permissionInclude,
        });
        if (!user || !user.isActive || !user.pinHash) {
            throw new common_1.UnauthorizedException('PIN login not available for this user');
        }
        if (user.twoFactorEnabled) {
            throw new common_1.UnauthorizedException('PIN login is off for accounts with two-factor authentication — sign in with your password');
        }
        const valid = await bcrypt.compare(dto.pin, user.pinHash);
        if (!valid) {
            throw new common_1.UnauthorizedException('Incorrect PIN');
        }
        return this.issueSession(user);
    }
    async issueSession(user) {
        const sessionUser = this.toSessionUser(user);
        const token = await this.jwt.signAsync({ sub: user.id });
        return { token, user: sessionUser };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        two_factor_service_1.TwoFactorService])
], AuthService);
//# sourceMappingURL=auth.service.js.map