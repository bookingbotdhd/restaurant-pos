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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const zod_1 = require("zod");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const push_service_1 = require("./push.service");
const registerSchema = zod_1.z.object({
    token: zod_1.z.string().min(20).max(4096),
    platform: zod_1.z.enum(['ANDROID', 'IOS']),
    appVersion: zod_1.z.string().max(40).optional(),
});
let DevicesController = class DevicesController {
    prisma;
    push;
    constructor(prisma, push) {
        this.prisma = prisma;
        this.push = push;
    }
    config() {
        return {
            minVersion: process.env.MOBILE_MIN_VERSION ?? '1.0.0',
            latestVersion: process.env.MOBILE_LATEST_VERSION ?? '1.0.0',
            push: this.push.enabled,
        };
    }
    async register(user, body) {
        await this.prisma.deviceToken.upsert({
            where: { token: body.token },
            create: { userId: user.id, token: body.token, platform: body.platform, appVersion: body.appVersion },
            update: { userId: user.id, platform: body.platform, appVersion: body.appVersion, lastSeenAt: new Date() },
        });
        return { ok: true };
    }
    async unregister(user, token) {
        await this.prisma.deviceToken.deleteMany({ where: { token, userId: user.id } });
        return { ok: true };
    }
};
exports.DevicesController = DevicesController;
__decorate([
    (0, common_1.Get)('mobile/config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DevicesController.prototype, "config", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('devices'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(registerSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "register", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('devices/:token'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "unregister", null);
exports.DevicesController = DevicesController = __decorate([
    (0, swagger_1.ApiTags)('mobile'),
    (0, common_1.Controller)('v1'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        push_service_1.PushService])
], DevicesController);
//# sourceMappingURL=devices.controller.js.map