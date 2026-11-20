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
exports.CustomersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const types_1 = require("@nodedr-restaurant/types");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const branch_access_service_1 = require("../../common/services/branch-access.service");
const referrals_service_1 = require("../referrals/referrals.service");
const customers_service_1 = require("./customers.service");
let CustomersController = class CustomersController {
    customersService;
    branchAccess;
    referrals;
    constructor(customersService, branchAccess, referrals) {
        this.customersService = customersService;
        this.branchAccess = branchAccess;
        this.referrals = referrals;
    }
    async list(user, branchId, search) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        return this.customersService.list(branchId, search);
    }
    async rewards(user, branchId, id) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        await this.customersService.getById(branchId, id);
        return this.referrals.summary(user.restaurantId, id);
    }
    async getById(user, branchId, id) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        return this.customersService.getById(branchId, id);
    }
    async create(user, branchId, body) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        return this.customersService.create(branchId, body);
    }
    async update(user, branchId, id, body) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        return this.customersService.update(branchId, id, body);
    }
    async remove(user, branchId, id) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        return this.customersService.remove(branchId, id);
    }
    async listAddresses(user, branchId, id) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        return this.customersService.listAddresses(branchId, id);
    }
    async addAddress(user, branchId, id, body) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        return this.customersService.addAddress(branchId, id, body);
    }
    async updateAddress(user, branchId, id, addressId, body) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        return this.customersService.updateAddress(branchId, id, addressId, body);
    }
    async removeAddress(user, branchId, id, addressId) {
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        return this.customersService.removeAddress(branchId, id, addressId);
    }
};
exports.CustomersController = CustomersController;
__decorate([
    (0, auth_decorator_1.Auth)('customers.manage'),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "list", null);
__decorate([
    (0, auth_decorator_1.Auth)('customers.manage'),
    (0, common_1.Get)(':id/rewards'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "rewards", null);
__decorate([
    (0, auth_decorator_1.Auth)('customers.manage'),
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "getById", null);
__decorate([
    (0, auth_decorator_1.Auth)('customers.manage'),
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(types_1.customerSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "create", null);
__decorate([
    (0, auth_decorator_1.Auth)('customers.manage'),
    (0, common_1.Patch)(':id'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(types_1.customerSchema)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "update", null);
__decorate([
    (0, auth_decorator_1.Auth)('customers.manage'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "remove", null);
__decorate([
    (0, auth_decorator_1.Auth)('customers.manage'),
    (0, common_1.Get)(':id/addresses'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "listAddresses", null);
__decorate([
    (0, auth_decorator_1.Auth)('customers.manage'),
    (0, common_1.Post)(':id/addresses'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(types_1.customerAddressSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "addAddress", null);
__decorate([
    (0, auth_decorator_1.Auth)('customers.manage'),
    (0, common_1.Patch)(':id/addresses/:addressId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Param)('addressId')),
    __param(4, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(types_1.customerAddressUpdateSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "updateAddress", null);
__decorate([
    (0, auth_decorator_1.Auth)('customers.manage'),
    (0, common_1.Delete)(':id/addresses/:addressId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Param)('addressId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "removeAddress", null);
exports.CustomersController = CustomersController = __decorate([
    (0, swagger_1.ApiTags)('customers'),
    (0, common_1.Controller)('v1/customers'),
    __metadata("design:paramtypes", [customers_service_1.CustomersService,
        branch_access_service_1.BranchAccessService,
        referrals_service_1.ReferralsService])
], CustomersController);
//# sourceMappingURL=customers.controller.js.map