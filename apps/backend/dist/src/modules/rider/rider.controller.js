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
exports.RiderController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const zod_1 = require("zod");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const rider_service_1 = require("./rider.service");
const dutySchema = zod_1.z.object({ online: zod_1.z.boolean() });
const locationSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
});
const statusSchema = zod_1.z.object({
    status: zod_1.z.enum(['PICKED_UP', 'DELIVERED', 'FAILED']),
    reason: zod_1.z.string().trim().max(200).optional(),
});
let RiderController = class RiderController {
    rider;
    constructor(rider) {
        this.rider = rider;
    }
    me(u) {
        return this.rider.me(u.id);
    }
    duty(u, b) {
        return this.rider.setDuty(u.id, b.online);
    }
    location(u, b) {
        return this.rider.setLocation(u.id, b.lat, b.lng);
    }
    deliveries(u) {
        return this.rider.deliveries(u.id);
    }
    status(u, id, b) {
        return this.rider.setStatus(u.id, id, b.status, b.reason);
    }
};
exports.RiderController = RiderController;
__decorate([
    (0, auth_decorator_1.Auth)('delivery.rider'),
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RiderController.prototype, "me", null);
__decorate([
    (0, auth_decorator_1.Auth)('delivery.rider'),
    (0, common_1.Post)('duty'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(dutySchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RiderController.prototype, "duty", null);
__decorate([
    (0, auth_decorator_1.Auth)('delivery.rider'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    (0, common_1.Post)('location'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(locationSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RiderController.prototype, "location", null);
__decorate([
    (0, auth_decorator_1.Auth)('delivery.rider'),
    (0, common_1.Get)('deliveries'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RiderController.prototype, "deliveries", null);
__decorate([
    (0, auth_decorator_1.Auth)('delivery.rider'),
    (0, common_1.Patch)('deliveries/:id/status'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(statusSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], RiderController.prototype, "status", null);
exports.RiderController = RiderController = __decorate([
    (0, swagger_1.ApiTags)('rider'),
    (0, common_1.Controller)('v1/rider'),
    __metadata("design:paramtypes", [rider_service_1.RiderService])
], RiderController);
//# sourceMappingURL=rider.controller.js.map