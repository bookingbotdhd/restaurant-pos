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
exports.IntegrationHubController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const zod_1 = require("zod");
const audit_action_1 = require("../audit/audit-action");
const auth_decorator_1 = require("../common/decorators/auth.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const integration_hub_service_1 = require("./integration-hub.service");
const connectSchema = zod_1.z.object({
    externalAccountId: zod_1.z.string().trim().max(120).optional(),
    credentials: zod_1.z.record(zod_1.z.string().max(60), zod_1.z.string().max(500)).default({}),
});
const enabledSchema = zod_1.z.object({ enabled: zod_1.z.boolean() });
let IntegrationHubController = class IntegrationHubController {
    hub;
    constructor(hub) {
        this.hub = hub;
    }
    list(u) {
        return this.hub.list(u.restaurantId);
    }
    connect(u, provider, body) {
        return this.hub.connect(u.restaurantId, u.id, provider, body);
    }
    test(u, provider) {
        return this.hub.test(u.restaurantId, provider);
    }
    setEnabled(u, provider, body) {
        return this.hub.setEnabled(u.restaurantId, provider, body.enabled);
    }
    logs(u, provider) {
        return this.hub.logs(u.restaurantId, provider);
    }
    disconnect(u, provider) {
        return this.hub.disconnect(u.restaurantId, provider);
    }
};
exports.IntegrationHubController = IntegrationHubController;
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IntegrationHubController.prototype, "list", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('integration.saved', 'IntegrationConnection'),
    (0, common_1.Put)(':provider'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(connectSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], IntegrationHubController.prototype, "connect", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('integration.tested', 'IntegrationConnection'),
    (0, common_1.Post)(':provider/test'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], IntegrationHubController.prototype, "test", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('integration.toggled', 'IntegrationConnection'),
    (0, common_1.Post)(':provider/enabled'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(enabledSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], IntegrationHubController.prototype, "setEnabled", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, common_1.Get)(':provider/logs'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], IntegrationHubController.prototype, "logs", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('integration.disconnected', 'IntegrationConnection'),
    (0, common_1.Delete)(':provider'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], IntegrationHubController.prototype, "disconnect", null);
exports.IntegrationHubController = IntegrationHubController = __decorate([
    (0, swagger_1.ApiTags)('integration-hub'),
    (0, common_1.Controller)('v1/integration-hub'),
    __metadata("design:paramtypes", [integration_hub_service_1.IntegrationHubService])
], IntegrationHubController);
//# sourceMappingURL=integration-hub.controller.js.map