"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PREFS = exports.TREND_DAYS = exports.CARD_WIDGETS = exports.TOP_WIDGETS = void 0;
exports.sanitizePrefs = sanitizePrefs;
exports.TOP_WIDGETS = ['kpis', 'attention', 'charts'];
exports.CARD_WIDGETS = [
    'tables',
    'kitchen',
    'recent',
    'channels',
];
exports.TREND_DAYS = [7, 14, 30, 90];
exports.DEFAULT_PREFS = {
    topOrder: [...exports.TOP_WIDGETS],
    cardOrder: [...exports.CARD_WIDGETS],
    hidden: [],
    trendDays: 14,
};
function ordered(input, allowed) {
    const seen = new Set();
    const out = [];
    if (Array.isArray(input)) {
        for (const v of input) {
            if (typeof v === 'string' && allowed.includes(v) && !seen.has(v)) {
                seen.add(v);
                out.push(v);
            }
        }
    }
    for (const a of allowed)
        if (!seen.has(a))
            out.push(a);
    return out;
}
function sanitizePrefs(raw) {
    const r = (raw && typeof raw === 'object' ? raw : {});
    const all = [...exports.TOP_WIDGETS, ...exports.CARD_WIDGETS];
    const hidden = Array.isArray(r.hidden)
        ? [
            ...new Set(r.hidden.filter((v) => typeof v === 'string' && all.includes(v))),
        ]
        : [];
    const days = Number(r.trendDays);
    return {
        topOrder: ordered(r.topOrder, exports.TOP_WIDGETS),
        cardOrder: ordered(r.cardOrder, exports.CARD_WIDGETS),
        hidden,
        trendDays: exports.TREND_DAYS.includes(days)
            ? days
            : exports.DEFAULT_PREFS.trendDays,
    };
}
//# sourceMappingURL=dashboard-prefs.js.map