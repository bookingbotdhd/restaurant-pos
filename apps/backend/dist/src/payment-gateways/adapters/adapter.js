"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayError = void 0;
class GatewayError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
exports.GatewayError = GatewayError;
//# sourceMappingURL=adapter.js.map