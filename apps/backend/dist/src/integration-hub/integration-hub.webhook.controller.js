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
exports.IntegrationHubWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const aggregator_orders_service_1 = require("./aggregator-orders.service");
let IntegrationHubWebhookController = class IntegrationHubWebhookController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    receive(restaurantId, provider, headers, req) {
        if (!req.rawBody)
            throw new common_1.BadRequestException('Empty body');
        return this.svc.receive(restaurantId, provider, headers, req.rawBody.toString('utf8'));
    }
};
exports.IntegrationHubWebhookController = IntegrationHubWebhookController;
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    (0, common_1.HttpCode)(200),
    (0, common_1.Post)(':restaurantId/:provider'),
    __param(0, (0, common_1.Param)('restaurantId')),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Headers)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], IntegrationHubWebhookController.prototype, "receive", null);
exports.IntegrationHubWebhookController = IntegrationHubWebhookController = __decorate([
    (0, swagger_1.ApiTags)('integration-hub'),
    (0, common_1.Controller)('v1/integration-hub/webhook'),
    __metadata("design:paramtypes", [aggregator_orders_service_1.AggregatorOrdersService])
], IntegrationHubWebhookController);
//# sourceMappingURL=integration-hub.webhook.controller.js.map