"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandaloneModule = void 0;
const common_1 = require("@nestjs/common");
const branch_access_service_1 = require("../common/services/branch-access.service");
const orders_module_1 = require("../modules/orders/orders.module");
const standalone_controller_1 = require("./standalone.controller");
const standalone_service_1 = require("./standalone.service");
let StandaloneModule = class StandaloneModule {
};
exports.StandaloneModule = StandaloneModule;
exports.StandaloneModule = StandaloneModule = __decorate([
    (0, common_1.Module)({
        imports: [orders_module_1.OrdersModule],
        controllers: [standalone_controller_1.StandaloneController],
        providers: [standalone_service_1.StandaloneService, branch_access_service_1.BranchAccessService],
    })
], StandaloneModule);
//# sourceMappingURL=standalone.module.js.map