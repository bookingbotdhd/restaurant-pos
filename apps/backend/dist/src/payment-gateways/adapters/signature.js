"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hmacHex = hmacHex;
exports.hmacBase64 = hmacBase64;
exports.safeEqual = safeEqual;
const crypto_1 = require("crypto");
function hmacHex(secret, data) {
    return (0, crypto_1.createHmac)('sha256', secret).update(data, 'utf8').digest('hex');
}
function hmacBase64(secret, data) {
    return (0, crypto_1.createHmac)('sha256', secret).update(data, 'utf8').digest('base64');
}
function safeEqual(a, b) {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && (0, crypto_1.timingSafeEqual)(ab, bb);
}
//# sourceMappingURL=signature.js.map