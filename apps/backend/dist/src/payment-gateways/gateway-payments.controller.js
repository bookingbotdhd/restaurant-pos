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
exports.GatewayPaymentsPublicController = exports.GatewayPaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const zod_1 = require("zod");
const audit_action_1 = require("../audit/audit-action");
const auth_decorator_1 = require("../common/decorators/auth.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const gateway_payments_service_1 = require("./gateway-payments.service");
const createSchema = zod_1.z.object({
    customerPhone: zod_1.z
        .string()
        .trim()
        .regex(/^\+?[0-9 ()-]{6,20}$/)
        .optional(),
    customerName: zod_1.z.string().trim().max(80).optional(),
    origin: zod_1.z.string().url().max(200).optional(),
});
const refundSchema = zod_1.z.object({
    amount: zod_1.z.coerce.number().positive(),
    reason: zod_1.z.string().trim().max(200).optional(),
    returnedItems: zod_1.z
        .array(zod_1.z.object({
        orderItemId: zod_1.z.string().min(1),
        quantity: zod_1.z.coerce.number().int().positive(),
    }))
        .max(100)
        .optional(),
});
let GatewayPaymentsController = class GatewayPaymentsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    create(u, branchId, orderId, body) {
        return this.svc.create(u.restaurantId, branchId, orderId, u.id, body);
    }
    list(u, branchId, orderId) {
        return this.svc.forOrder(u.restaurantId, branchId, orderId);
    }
    active(u) {
        return this.svc.activeSummary(u.restaurantId);
    }
    recent(u) {
        return this.svc.recent(u.restaurantId);
    }
    refundsToReview(u) {
        return this.svc.refundsNeedingReview(u.restaurantId);
    }
    refund(u, branchId, id, body) {
        return this.svc.refund(u.restaurantId, branchId, id, u.id, body);
    }
    refresh(u, branchId, id) {
        return this.svc.refresh(id, { restaurantId: u.restaurantId, branchId });
    }
};
exports.GatewayPaymentsController = GatewayPaymentsController;
__decorate([
    (0, auth_decorator_1.Auth)('bills.print'),
    (0, audit_action_1.AuditAction)('gateway_payment.created', 'GatewayPayment'),
    (0, common_1.Post)('orders/:orderId/gateway-payments'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(createSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('orderId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], GatewayPaymentsController.prototype, "create", null);
__decorate([
    (0, auth_decorator_1.Auth)('bills.print'),
    (0, common_1.Get)('orders/:orderId/gateway-payments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], GatewayPaymentsController.prototype, "list", null);
__decorate([
    (0, auth_decorator_1.Auth)('bills.print'),
    (0, common_1.Get)('payment-gateways/active'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GatewayPaymentsController.prototype, "active", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, common_1.Get)('payment-gateways/payments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GatewayPaymentsController.prototype, "recent", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, common_1.Get)('payment-gateways/refunds-to-review'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GatewayPaymentsController.prototype, "refundsToReview", null);
__decorate([
    (0, auth_decorator_1.Auth)('refunds.process'),
    (0, audit_action_1.AuditAction)('gateway_payment.refunded', 'GatewayPayment'),
    (0, common_1.Post)('gateway-payments/:id/refund'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(refundSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], GatewayPaymentsController.prototype, "refund", null);
__decorate([
    (0, auth_decorator_1.Auth)('bills.print'),
    (0, common_1.Post)('gateway-payments/:id/refresh'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], GatewayPaymentsController.prototype, "refresh", null);
exports.GatewayPaymentsController = GatewayPaymentsController = __decorate([
    (0, swagger_1.ApiTags)('payment-gateways'),
    (0, common_1.Controller)('v1'),
    __metadata("design:paramtypes", [gateway_payments_service_1.GatewayPaymentsService])
], GatewayPaymentsController);
let GatewayPaymentsPublicController = class GatewayPaymentsPublicController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async webhook(restaurantId, provider, mode, headers, req) {
        const m = mode.toUpperCase();
        if ((m !== 'TEST' && m !== 'LIVE') || !req.rawBody) {
            throw new common_1.BadRequestException('Bad request');
        }
        try {
            return await this.svc.webhook(restaurantId, provider, m, headers, req.rawBody.toString('utf8'));
        }
        catch (e) {
            if (e instanceof gateway_payments_service_1.WebhookRejected)
                throw new common_1.UnauthorizedException();
            throw e;
        }
    }
    status(id) {
        return this.svc.publicStatus(id);
    }
};
exports.GatewayPaymentsPublicController = GatewayPaymentsPublicController;
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    (0, common_1.HttpCode)(200),
    (0, common_1.Post)('webhook/:restaurantId/:provider/:mode'),
    __param(0, (0, common_1.Param)('restaurantId')),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Param)('mode')),
    __param(3, (0, common_1.Headers)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], GatewayPaymentsPublicController.prototype, "webhook", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    (0, common_1.Get)('return-status/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GatewayPaymentsPublicController.prototype, "status", null);
exports.GatewayPaymentsPublicController = GatewayPaymentsPublicController = __decorate([
    (0, swagger_1.ApiTags)('payment-gateways'),
    (0, common_1.Controller)('v1/payment-gateways'),
    __metadata("design:paramtypes", [gateway_payments_service_1.GatewayPaymentsService])
], GatewayPaymentsPublicController);
//# sourceMappingURL=gateway-payments.controller.js.map