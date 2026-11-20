"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentGatewaysModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("../audit/audit.module");
const orders_module_1 = require("../modules/orders/orders.module");
const gateway_payments_controller_1 = require("./gateway-payments.controller");
const gateway_payments_service_1 = require("./gateway-payments.service");
const payment_gateways_controller_1 = require("./payment-gateways.controller");
const payment_gateways_service_1 = require("./payment-gateways.service");
let PaymentGatewaysModule = class PaymentGatewaysModule {
};
exports.PaymentGatewaysModule = PaymentGatewaysModule;
exports.PaymentGatewaysModule = PaymentGatewaysModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule, orders_module_1.OrdersModule],
        controllers: [
            payment_gateways_controller_1.PaymentGatewaysController,
            gateway_payments_controller_1.GatewayPaymentsController,
            gateway_payments_controller_1.GatewayPaymentsPublicController,
        ],
        providers: [payment_gateways_service_1.PaymentGatewaysService, gateway_payments_service_1.GatewayPaymentsService],
    })
], PaymentGatewaysModule);
//# sourceMappingURL=payment-gateways.module.js.map