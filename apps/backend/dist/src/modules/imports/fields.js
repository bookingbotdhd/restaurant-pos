"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.headerKey = void 0;
exports.parseText = parseText;
exports.parseNumber = parseNumber;
exports.parseBool = parseBool;
exports.parseEnum = parseEnum;
exports.parseTime = parseTime;
exports.parseList = parseList;
const csv_1 = require("./csv");
const ok = (value) => ({ ok: true, value });
const bad = (error) => ({ ok: false, error });
const headerKey = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
exports.headerKey = headerKey;
function parseText(raw, label, max) {
    const v = raw.trim();
    if (v === '')
        return ok(undefined);
    if (v.length > max)
        return bad(`${label} is longer than ${max} characters`);
    if ((0, csv_1.looksLikeFormula)(v)) {
        return bad(`${label} starts with "${v[0]}", which spreadsheets treat as a formula - remove it`);
    }
    return ok(v);
}
function parseNumber(raw, label, opts = {}) {
    let v = raw
        .trim()
        .replace(/^(?:₹|rs\.?|inr)\s*/i, '')
        .replace(/\s/g, '');
    if (v === '')
        return ok(undefined);
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(v))
        v = v.replace(/,/g, '');
    if (/^\d+,\d{1,2}$/.test(v)) {
        return bad(`${label} "${raw.trim()}" uses a decimal comma - write it with a dot (12.5)`);
    }
    if (!/^-?\d+(\.\d+)?$/.test(v))
        return bad(`${label} "${raw.trim()}" is not a number`);
    const n = Number(v);
    if (!Number.isFinite(n))
        return bad(`${label} is not a valid number`);
    if (opts.integer && !Number.isInteger(n))
        return bad(`${label} must be a whole number`);
    if (opts.min !== undefined && n < opts.min)
        return bad(`${label} cannot be below ${opts.min}`);
    if (opts.max !== undefined && n > opts.max)
        return bad(`${label} cannot be above ${opts.max}`);
    return ok(n);
}
const YES = new Set(['yes', 'y', 'true', 't', '1', 'veg', 'active', 'on']);
const NO = new Set([
    'no',
    'n',
    'false',
    'f',
    '0',
    'non-veg',
    'nonveg',
    'non veg',
    'inactive',
    'off',
]);
function parseBool(raw, label) {
    const v = raw.trim().toLowerCase();
    if (v === '')
        return ok(undefined);
    if (YES.has(v))
        return ok(true);
    if (NO.has(v))
        return ok(false);
    return bad(`${label} "${raw.trim()}" should be yes or no`);
}
function parseEnum(raw, label, allowed, aliases = {}) {
    const v = raw.trim();
    if (v === '')
        return ok(undefined);
    const key = v.toUpperCase().replace(/[\s-]+/g, '_');
    const hit = allowed.includes(key)
        ? key
        : aliases[v.toLowerCase()];
    return hit
        ? ok(hit)
        : bad(`${label} "${v}" is not one of: ${allowed.join(', ')}`);
}
function parseTime(raw, label) {
    const v = raw.trim();
    if (v === '')
        return ok(undefined);
    const m = /^(\d{1,2}):(\d{2})$/.exec(v);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) {
        return bad(`${label} "${v}" should look like 09:30 (24-hour)`);
    }
    return ok(`${m[1].padStart(2, '0')}:${m[2]}`);
}
function parseList(raw, label) {
    const v = raw.trim();
    if (v === '')
        return ok(undefined);
    const items = v
        .split(/[;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
    for (const i of items) {
        if (i.length > 40)
            return bad(`${label} entry "${i.slice(0, 20)}..." is too long`);
        if ((0, csv_1.looksLikeFormula)(i))
            return bad(`${label} entry "${i}" starts with a formula character`);
    }
    return ok([...new Set(items)]);
}
//# sourceMappingURL=fields.js.map