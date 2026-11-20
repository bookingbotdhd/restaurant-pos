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
exports.ImportsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const multer_1 = require("multer");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const branch_access_service_1 = require("../../common/services/branch-access.service");
const imports_service_1 = require("./imports.service");
const templates_1 = require("./templates");
const MAX_BYTES = 2 * 1024 * 1024;
const PERMISSION = {
    menu: 'menu.manage',
    ingredients: 'inventory.manage',
};
const upload = (0, platform_express_1.FileInterceptor)('file', {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (!/\.(csv|txt)$/i.test(file.originalname)) {
            cb(new common_1.BadRequestException('Choose a .csv file'), false);
            return;
        }
        cb(null, true);
    },
});
const asKind = (k) => {
    if (k === 'menu' || k === 'ingredients')
        return k;
    throw new common_1.BadRequestException('Unknown import type');
};
const flag = (v, fallback) => v === undefined ? fallback : v === 'true' || v === '1';
let ImportsController = class ImportsController {
    imports;
    branchAccess;
    constructor(imports, branchAccess) {
        this.imports = imports;
        this.branchAccess = branchAccess;
    }
    allow(user, kind) {
        if (!user.permissions.includes(PERMISSION[kind])) {
            throw new common_1.ForbiddenException(`You need the ${PERMISSION[kind]} permission to import this`);
        }
    }
    template(user, k, example, res) {
        const kind = asKind(k);
        this.allow(user, kind);
        const withExamples = flag(example, false);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${(0, templates_1.templateFileName)(kind, withExamples)}"`);
        res.send('﻿' + (0, templates_1.templateCsv)(kind, withExamples));
    }
    async handle(commit, user, k, branchId, file, q) {
        const kind = asKind(k);
        this.allow(user, kind);
        await this.branchAccess.assertAccess(user.restaurantId, branchId);
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        if (file.size === 0)
            throw new common_1.BadRequestException('The file is empty');
        return this.imports.run(kind, branchId, user.id, file, {
            commit,
            updateExisting: flag(q.updateExisting, true),
            skipInvalid: flag(q.skipInvalid, false),
        });
    }
    preview(user, kind, branchId, q, file) {
        return this.handle(false, user, kind, branchId, file, q);
    }
    commit(user, kind, branchId, q, file) {
        return this.handle(true, user, kind, branchId, file, q);
    }
};
exports.ImportsController = ImportsController;
__decorate([
    (0, auth_decorator_1.Auth)(),
    (0, common_1.Get)('templates/:kind'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Query)('example')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "template", null);
__decorate([
    (0, auth_decorator_1.Auth)(),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    (0, common_1.Post)(':kind/preview'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Query)('branchId')),
    __param(3, (0, common_1.Query)()),
    __param(4, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "preview", null);
__decorate([
    (0, auth_decorator_1.Auth)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.Post)(':kind/commit'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Query)('branchId')),
    __param(3, (0, common_1.Query)()),
    __param(4, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "commit", null);
exports.ImportsController = ImportsController = __decorate([
    (0, swagger_1.ApiTags)('imports'),
    (0, common_1.Controller)('v1/imports'),
    __metadata("design:paramtypes", [imports_service_1.ImportsService,
        branch_access_service_1.BranchAccessService])
], ImportsController);
//# sourceMappingURL=imports.controller.js.map