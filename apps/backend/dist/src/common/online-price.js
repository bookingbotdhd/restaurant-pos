"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustOnlinePrice = adjustOnlinePrice;
exports.onlinePriceAdjustOf = onlinePriceAdjustOf;
function adjustOnlinePrice(price, adj) {
    if (!adj || !adj.value)
        return price;
    const next = adj.kind === 'PERCENT' ? price * (1 + adj.value / 100) : price + adj.value;
    return Math.max(Math.round(next * 100) / 100, 0);
}
function onlinePriceAdjustOf(r) {
    const value = Number(r.onlinePriceAdjustValue);
    if (!value)
        return null;
    return {
        kind: r.onlinePriceAdjustKind === 'AMOUNT' ? 'AMOUNT' : 'PERCENT',
        value,
    };
}
//# sourceMappingURL=online-price.js.map