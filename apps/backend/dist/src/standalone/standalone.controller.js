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
exports.StandaloneController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_decorator_1 = require("../common/decorators/auth.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const branch_access_service_1 = require("../common/services/branch-access.service");
const standalone_service_1 = require("./standalone.service");
const standalone_schema_1 = require("./standalone.schema");
let StandaloneController = class StandaloneController {
    standalone;
    branchAccess;
    constructor(standalone, branchAccess) {
        this.standalone = standalone;
        this.branchAccess = branchAccess;
    }
    async snapshot(user, branchId) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        return this.standalone.snapshot(user, branchId);
    }
    async sales(user, branchId, body) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        return this.standalone.syncSales(user, branchId, body);
    }
};
exports.StandaloneController = StandaloneController;
__decorate([
    (0, auth_decorator_1.Auth)('orders.create'),
    (0, common_1.Get)('snapshot'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StandaloneController.prototype, "snapshot", null);
__decorate([
    (0, auth_decorator_1.Auth)('orders.create', 'bills.print'),
    (0, common_1.Post)('sales'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(standalone_schema_1.offlineSalesSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], StandaloneController.prototype, "sales", null);
exports.StandaloneController = StandaloneController = __decorate([
    (0, swagger_1.ApiTags)('mobile'),
    (0, common_1.Controller)('v1/mobile/standalone'),
    __metadata("design:paramtypes", [standalone_service_1.StandaloneService,
        branch_access_service_1.BranchAccessService])
], StandaloneController);
//# sourceMappingURL=standalone.controller.js.map