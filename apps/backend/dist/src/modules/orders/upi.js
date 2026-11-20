"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUpiUri = buildUpiUri;
exports.upiForBill = upiForBill;
function buildUpiUri(opts) {
    const q = new URLSearchParams();
    q.set('pa', opts.vpa);
    if (opts.name)
        q.set('pn', opts.name.slice(0, 60));
    if (opts.amount > 0)
        q.set('am', opts.amount.toFixed(2));
    q.set('cu', 'INR');
    if (opts.note)
        q.set('tn', opts.note.slice(0, 60));
    if (opts.ref)
        q.set('tr', opts.ref.slice(0, 35));
    return `upi://pay?${q.toString().replace(/\+/g, '%20')}`;
}
function upiForBill(opts) {
    const vpa = opts.vpa?.trim();
    if (!vpa || !opts.isProvisional || !(opts.balanceDue > 0))
        return null;
    return {
        uri: buildUpiUri({
            vpa,
            name: opts.payeeName,
            amount: opts.balanceDue,
            note: `Order ${opts.orderNumber}`,
            ref: opts.orderNumber,
        }),
        amountText: `${opts.currencySymbol ?? 'Rs '}${opts.balanceDue.toFixed(2)}`,
        payee: opts.payeeName?.trim() || null,
    };
}
//# sourceMappingURL=upi.js.map