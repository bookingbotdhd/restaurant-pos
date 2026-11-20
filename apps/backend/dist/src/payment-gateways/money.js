"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currencyExponent = currencyExponent;
exports.toMinor = toMinor;
exports.fromMinor = fromMinor;
const ZERO_DECIMAL = new Set([
    'JPY',
    'KRW',
    'VND',
    'CLP',
    'ISK',
    'UGX',
    'XAF',
    'XOF',
]);
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);
function currencyExponent(currency) {
    const c = currency.toUpperCase();
    if (ZERO_DECIMAL.has(c))
        return 0;
    if (THREE_DECIMAL.has(c))
        return 3;
    return 2;
}
function toMinor(amount, currency) {
    const cents = Math.round(amount * 100);
    const exp = currencyExponent(currency);
    if (exp === 2)
        return cents;
    if (exp === 0)
        return Math.round(cents / 100);
    return cents * 10;
}
function fromMinor(minor, currency) {
    return minor / 10 ** currencyExponent(currency);
}
//# sourceMappingURL=money.js.map