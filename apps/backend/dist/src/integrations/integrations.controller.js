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
exports.IntegrationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const types_1 = require("@nodedr-restaurant/types");
const zod_1 = require("zod");
const current_integration_key_decorator_1 = require("../common/decorators/current-integration-key.decorator");
const require_scope_decorator_1 = require("../common/decorators/require-scope.decorator");
const integration_api_key_guard_1 = require("../common/guards/integration-api-key.guard");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const integrations_service_1 = require("./integrations.service");
let IntegrationsController = class IntegrationsController {
    integrations;
    constructor(integrations) {
        this.integrations = integrations;
    }
    listLocations(key) {
        return this.integrations.listLocations(key);
    }
    getMenu(key, branchId) {
        return this.integrations.getMenu(key, branchId);
    }
    deliveryQuote(key, branchId, pincode) {
        return this.integrations.deliveryQuote(key, branchId, pincode ?? '');
    }
    createOrder(key, branchId, body, idempotencyKey) {
        if (idempotencyKey !== undefined) {
            const parsed = types_1.integrationIdempotencyKeySchema.safeParse(idempotencyKey);
            if (!parsed.success) {
                throw new common_1.BadRequestException(parsed.error.issues[0].message);
            }
        }
        return this.integrations.createOrder(key, branchId, body, idempotencyKey);
    }
    getOrder(key, branchId, orderId, include) {
        if (include !== undefined && include !== 'customer') {
            throw new common_1.BadRequestException('include must be "customer"');
        }
        return this.integrations.getOrder(key, branchId, orderId, include === 'customer');
    }
    rewards(key, branchId, body) {
        return this.integrations.rewards(key, branchId, body);
    }
    createReservation(key, branchId, body) {
        return this.integrations.createReservation(key, branchId, body);
    }
    getReservation(key, branchId, reservationId) {
        return this.integrations.getReservation(key, branchId, reservationId);
    }
};
exports.IntegrationsController = IntegrationsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'List the locations this key can use' }),
    (0, require_scope_decorator_1.RequireScope)('locations:read'),
    (0, common_1.Get)('locations'),
    __param(0, (0, current_integration_key_decorator_1.CurrentIntegrationKey)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "listLocations", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Public menu with modifier groups and availability window',
    }),
    (0, require_scope_decorator_1.RequireScope)('menu:read'),
    (0, common_1.Get)('locations/:branchId/menu'),
    __param(0, (0, current_integration_key_decorator_1.CurrentIntegrationKey)()),
    __param(1, (0, common_1.Param)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "getMenu", null);
__decorate([
    (0, require_scope_decorator_1.RequireScope)('menu:read'),
    (0, common_1.Get)('locations/:branchId/delivery-quote'),
    __param(0, (0, current_integration_key_decorator_1.CurrentIntegrationKey)()),
    __param(1, (0, common_1.Param)('branchId')),
    __param(2, (0, common_1.Query)('pincode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "deliveryQuote", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Place a takeaway or delivery order',
        description: 'Prices, tax and the delivery fee are calculated by the server; any amounts sent are ignored. Send an Idempotency-Key so a retry returns the original order instead of creating a second one.',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'Idempotency-Key',
        required: false,
        description: '8-64 characters of A-Z a-z 0-9 _ -',
    }),
    (0, swagger_1.ApiBody)({ schema: zod_1.z.toJSONSchema(types_1.createIntegrationOrderSchema) }),
    (0, require_scope_decorator_1.RequireScope)('orders:write'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    (0, common_1.Post)('locations/:branchId/orders'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(types_1.createIntegrationOrderSchema)),
    __param(0, (0, current_integration_key_decorator_1.CurrentIntegrationKey)()),
    __param(1, (0, common_1.Param)('branchId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Headers)('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "createOrder", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Status, items and totals of an order this key placed',
        description: 'Add ?include=customer to also receive the customer name, mobile number, email and delivery address. That needs the orders:read_customer scope; without it the request is rejected with 403.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'include', required: false, enum: ['customer'] }),
    (0, require_scope_decorator_1.RequireScope)('orders:read'),
    (0, common_1.Get)('locations/:branchId/orders/:orderId'),
    __param(0, (0, current_integration_key_decorator_1.CurrentIntegrationKey)()),
    __param(1, (0, common_1.Param)('branchId')),
    __param(2, (0, common_1.Param)('orderId')),
    __param(3, (0, common_1.Query)('include')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "getOrder", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: "A signed-in customer's points, rewards and referral link",
        description: 'Looks the customer up by mobile number (creating the profile if new) and returns their points balance, what it is worth, the rewards it buys, and their personal referral code. Call it only for a customer your own site has signed in. Needs the orders:write scope.',
    }),
    (0, require_scope_decorator_1.RequireScope)('orders:write'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    (0, common_1.Post)('locations/:branchId/rewards'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(types_1.integrationRewardsLookupSchema)),
    __param(0, (0, current_integration_key_decorator_1.CurrentIntegrationKey)()),
    __param(1, (0, common_1.Param)('branchId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "rewards", null);
__decorate([
    (0, require_scope_decorator_1.RequireScope)('reservations:write'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    (0, common_1.Post)('locations/:branchId/reservations'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(types_1.createIntegrationReservationSchema)),
    __param(0, (0, current_integration_key_decorator_1.CurrentIntegrationKey)()),
    __param(1, (0, common_1.Param)('branchId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "createReservation", null);
__decorate([
    (0, require_scope_decorator_1.RequireScope)('reservations:read'),
    (0, common_1.Get)('locations/:branchId/reservations/:reservationId'),
    __param(0, (0, current_integration_key_decorator_1.CurrentIntegrationKey)()),
    __param(1, (0, common_1.Param)('branchId')),
    __param(2, (0, common_1.Param)('reservationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "getReservation", null);
exports.IntegrationsController = IntegrationsController = __decorate([
    (0, swagger_1.ApiTags)('integrations'),
    (0, swagger_1.ApiBearerAuth)('integration-key'),
    (0, common_1.UseGuards)(integration_api_key_guard_1.IntegrationApiKeyGuard),
    (0, common_1.Controller)('v1/integrations'),
    __metadata("design:paramtypes", [integrations_service_1.IntegrationsService])
], IntegrationsController);
//# sourceMappingURL=integrations.controller.js.map