"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuKey = exports.MAX_IMPORT_ROWS = exports.MENU_REQUIRED = exports.MENU_COLUMNS = exports.SPICE_LEVELS = void 0;
exports.mapHeaders = mapHeaders;
exports.validateMenu = validateMenu;
const fields_1 = require("./fields");
exports.SPICE_LEVELS = [
    'NONE',
    'MILD',
    'MEDIUM',
    'HOT',
    'EXTRA_HOT',
];
exports.MENU_COLUMNS = {
    name: ['name', 'item', 'itemname', 'dish', 'product'],
    category: ['category', 'categoryname', 'group'],
    price: ['price', 'sellingprice', 'mrp', 'fullprice', 'rate'],
    halfPrice: ['halfprice', 'half'],
    taxRatePercent: [
        'taxratepercent',
        'taxrate',
        'tax',
        'gst',
        'gstpercent',
        'gstrate',
        'taxpercent',
    ],
    sku: ['sku', 'code', 'itemcode'],
    description: ['description', 'desc'],
    station: ['station', 'kitchenstation', 'kitchen'],
    isVeg: ['isveg', 'veg', 'vegetarian', 'foodtype'],
    spiceLevel: ['spicelevel', 'spice'],
    prepTimeMinutes: ['preptimeminutes', 'preptime', 'preparationtime'],
    costPrice: ['costprice', 'cost'],
    calories: ['calories', 'kcal'],
    allergens: ['allergens', 'allergen'],
    availableFrom: ['availablefrom', 'from'],
    availableTo: ['availableto', 'to'],
    isActive: ['isactive', 'active', 'status'],
};
exports.MENU_REQUIRED = ['name', 'category', 'price'];
function mapHeaders(headers, columns) {
    const index = {};
    const unknown = [];
    headers.forEach((h, i) => {
        if (h === '')
            return;
        const key = (0, fields_1.headerKey)(h);
        const col = Object.keys(columns).find((c) => columns[c].includes(key));
        if (col && index[col] === undefined)
            index[col] = i;
        else if (!col)
            unknown.push(h);
    });
    return { index, unknown };
}
exports.MAX_IMPORT_ROWS = 2000;
const menuKey = (r) => r.sku
    ? `sku:${r.sku.toLowerCase()}`
    : `name:${r.name.toLowerCase()}|${r.category.toLowerCase()}`;
exports.menuKey = menuKey;
function validateMenu(csv) {
    const { index, unknown } = mapHeaders(csv.headers, exports.MENU_COLUMNS);
    const missing = exports.MENU_REQUIRED.filter((c) => index[c] === undefined);
    if (missing.length) {
        return {
            rows: [],
            errors: [],
            unknownColumns: unknown,
            fatal: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Download the example file to see the expected columns.`,
        };
    }
    if (csv.rows.length === 0) {
        return {
            rows: [],
            errors: [],
            unknownColumns: unknown,
            fatal: 'The file has a header but no items',
        };
    }
    if (csv.rows.length > exports.MAX_IMPORT_ROWS) {
        return {
            rows: [],
            errors: [],
            unknownColumns: unknown,
            fatal: `The file has ${csv.rows.length} rows; the limit is ${exports.MAX_IMPORT_ROWS} per import. Split it into smaller files.`,
        };
    }
    const rows = [];
    const errors = [];
    const seen = new Map();
    for (const { line, cells, overflow, longer } of csv.rows) {
        if (overflow) {
            const extra = `This row has more values than the file has columns - a value that contains a comma must be wrapped in "quotes"`;
            errors.push({ line, name: cells[0] ?? '', messages: [extra] });
            continue;
        }
        const cell = (c) => index[c] === undefined ? '' : (cells[index[c]] ?? '');
        const msgs = [];
        const take = (r) => {
            if (r.ok)
                return r.value;
            msgs.push(r.error);
            return undefined;
        };
        const name = take((0, fields_1.parseText)(cell('name'), 'Name', 120));
        if (!name && !msgs.length)
            msgs.push('Name is required');
        const category = take((0, fields_1.parseText)(cell('category'), 'Category', 60));
        if (!category && !msgs.some((m) => m.startsWith('Category')))
            msgs.push('Category is required');
        const price = take((0, fields_1.parseNumber)(cell('price'), 'Price', { min: 0, max: 1_000_000 }));
        if (price === undefined && !msgs.some((m) => m.startsWith('Price')))
            msgs.push('Price is required');
        const row = {
            line,
            name: name ?? '',
            category: category ?? '',
            price: price ?? 0,
            halfPrice: take((0, fields_1.parseNumber)(cell('halfPrice'), 'Half price', {
                min: 0,
                max: 1_000_000,
            })),
            taxRatePercent: take((0, fields_1.parseNumber)(cell('taxRatePercent'), 'Tax rate', { min: 0, max: 100 })),
            sku: take((0, fields_1.parseText)(cell('sku'), 'SKU', 40)),
            description: take((0, fields_1.parseText)(cell('description'), 'Description', 500)),
            station: take((0, fields_1.parseText)(cell('station'), 'Station', 60)),
            isVeg: take((0, fields_1.parseBool)(cell('isVeg'), 'Veg')),
            spiceLevel: take((0, fields_1.parseEnum)(cell('spiceLevel'), 'Spice level', exports.SPICE_LEVELS, {
                'no spice': 'NONE',
                low: 'MILD',
                med: 'MEDIUM',
                spicy: 'HOT',
                'very hot': 'EXTRA_HOT',
            })),
            prepTimeMinutes: take((0, fields_1.parseNumber)(cell('prepTimeMinutes'), 'Prep time', {
                min: 0,
                max: 1440,
                integer: true,
            })),
            costPrice: take((0, fields_1.parseNumber)(cell('costPrice'), 'Cost price', {
                min: 0,
                max: 1_000_000,
            })),
            calories: take((0, fields_1.parseNumber)(cell('calories'), 'Calories', {
                min: 0,
                max: 10_000,
                integer: true,
            })),
            allergens: take((0, fields_1.parseList)(cell('allergens'), 'Allergens')),
            availableFrom: take((0, fields_1.parseTime)(cell('availableFrom'), 'Available from')),
            availableTo: take((0, fields_1.parseTime)(cell('availableTo'), 'Available to')),
            isActive: take((0, fields_1.parseBool)(cell('isActive'), 'Active')),
        };
        if (row.halfPrice !== undefined &&
            price !== undefined &&
            row.halfPrice > price) {
            msgs.push('Half price is higher than the full price');
        }
        if ((row.availableFrom === undefined) !== (row.availableTo === undefined)) {
            msgs.push('Set both Available from and Available to, or neither');
        }
        if (msgs.length && longer) {
            msgs.push('This row has more columns than the header - a value that contains a comma (such as a name or description) must be wrapped in "quotes"');
        }
        if (!msgs.length) {
            const key = (0, exports.menuKey)(row);
            const first = seen.get(key);
            if (first !== undefined)
                msgs.push(`Duplicate of line ${first} in this file (same ${row.sku ? 'SKU' : 'name and category'})`);
            else
                seen.set(key, line);
        }
        if (msgs.length)
            errors.push({ line, name: name ?? '', messages: msgs });
        else
            rows.push(row);
    }
    return { rows, errors, unknownColumns: unknown };
}
//# sourceMappingURL=menu-import.js.map