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
exports.PaymentGatewaysController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const zod_1 = require("zod");
const audit_action_1 = require("../audit/audit-action");
const auth_decorator_1 = require("../common/decorators/auth.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const payment_gateways_service_1 = require("./payment-gateways.service");
const mode = zod_1.z.enum(['TEST', 'LIVE']);
const saveSchema = zod_1.z.object({
    country: zod_1.z.string().length(2),
    mode,
    credentials: zod_1.z.record(zod_1.z.string().max(60), zod_1.z.string().max(600)).default({}),
});
const modeSchema = zod_1.z.object({ mode, confirm: zod_1.z.string().max(60).optional() });
const enabledSchema = zod_1.z.object({ enabled: zod_1.z.boolean() });
const testSchema = zod_1.z.object({ mode: mode.optional() });
const customSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(80),
    countries: zod_1.z.array(zod_1.z.string().length(2)).min(1).max(20),
    docsUrl: zod_1.z
        .string()
        .url()
        .max(300)
        .refine((u) => u.startsWith('https://'), 'Use an https:// link'),
    integration: zod_1.z.string().trim().max(80).optional(),
    adapter: zod_1.z.string().max(40).nullable().optional(),
    notes: zod_1.z.string().trim().max(300).optional(),
});
let PaymentGatewaysController = class PaymentGatewaysController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    countries(u) {
        return this.svc.countries(u.restaurantId);
    }
    catalog(u, country = '') {
        return this.svc.catalog(u.restaurantId, country);
    }
    connections(u) {
        return this.svc.connections(u.restaurantId);
    }
    saveCustom(u, key, body) {
        return this.svc.upsertCustomEntry(u.restaurantId, {
            ...body,
            key: key.replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'custom',
        });
    }
    removeCustom(u, key) {
        return this.svc.deleteCustomEntry(u.restaurantId, key);
    }
    save(u, provider, body) {
        return this.svc.saveCredentials(u.restaurantId, provider, body);
    }
    test(u, provider, body) {
        return this.svc.test(u.restaurantId, provider, body.mode);
    }
    setMode(u, provider, body) {
        return this.svc.setMode(u.restaurantId, u.id, provider, body.mode, body.confirm);
    }
    setEnabled(u, provider, body) {
        return this.svc.setEnabled(u.restaurantId, provider, body.enabled);
    }
    removeCredentials(u, provider, m) {
        return this.svc.removeCredentials(u.restaurantId, provider, mode.parse(m.toUpperCase()));
    }
    remove(u, provider) {
        return this.svc.removeConnection(u.restaurantId, provider);
    }
};
exports.PaymentGatewaysController = PaymentGatewaysController;
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, common_1.Get)('countries'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PaymentGatewaysController.prototype, "countries", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, common_1.Get)('catalog'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('country')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PaymentGatewaysController.prototype, "catalog", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, common_1.Get)('connections'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PaymentGatewaysController.prototype, "connections", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('payment_gateway.custom_saved', 'PaymentGatewayCatalogEntry'),
    (0, common_1.Put)('custom/:key'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(customSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('key')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PaymentGatewaysController.prototype, "saveCustom", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('payment_gateway.custom_removed', 'PaymentGatewayCatalogEntry'),
    (0, common_1.Delete)('custom/:key'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PaymentGatewaysController.prototype, "removeCustom", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('payment_gateway.credentials_saved', 'PaymentGatewayConnection'),
    (0, common_1.Put)(':provider'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(saveSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PaymentGatewaysController.prototype, "save", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('payment_gateway.tested', 'PaymentGatewayConnection'),
    (0, common_1.Post)(':provider/test'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(testSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PaymentGatewaysController.prototype, "test", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('payment_gateway.mode_changed', 'PaymentGatewayConnection'),
    (0, common_1.Post)(':provider/mode'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(modeSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PaymentGatewaysController.prototype, "setMode", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('payment_gateway.toggled', 'PaymentGatewayConnection'),
    (0, common_1.Post)(':provider/enabled'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(enabledSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PaymentGatewaysController.prototype, "setEnabled", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('payment_gateway.credentials_removed', 'PaymentGatewayConnection'),
    (0, common_1.Delete)(':provider/credentials/:mode'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Param)('mode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PaymentGatewaysController.prototype, "removeCredentials", null);
__decorate([
    (0, auth_decorator_1.Auth)('settings.manage'),
    (0, audit_action_1.AuditAction)('payment_gateway.removed', 'PaymentGatewayConnection'),
    (0, common_1.Delete)(':provider'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PaymentGatewaysController.prototype, "remove", null);
exports.PaymentGatewaysController = PaymentGatewaysController = __decorate([
    (0, swagger_1.ApiTags)('payment-gateways'),
    (0, common_1.Controller)('v1/payment-gateways'),
    __metadata("design:paramtypes", [payment_gateways_service_1.PaymentGatewaysService])
], PaymentGatewaysController);
//# sourceMappingURL=payment-gateways.controller.js.map