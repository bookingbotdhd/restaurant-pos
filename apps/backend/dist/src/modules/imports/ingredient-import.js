"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingredientKey = exports.INGREDIENT_COLUMNS = exports.INGREDIENT_UNITS = void 0;
exports.validateIngredients = validateIngredients;
const fields_1 = require("./fields");
const menu_import_1 = require("./menu-import");
exports.INGREDIENT_UNITS = [
    'KG',
    'G',
    'L',
    'ML',
    'PIECE',
    'DOZEN',
    'PACK',
    'BOX',
];
const UNIT_ALIASES = {
    kgs: 'KG',
    kilo: 'KG',
    kilogram: 'KG',
    kilograms: 'KG',
    gm: 'G',
    gms: 'G',
    gram: 'G',
    grams: 'G',
    gr: 'G',
    ltr: 'L',
    litre: 'L',
    litres: 'L',
    liter: 'L',
    liters: 'L',
    mls: 'ML',
    millilitre: 'ML',
    milliliter: 'ML',
    pc: 'PIECE',
    pcs: 'PIECE',
    piece: 'PIECE',
    pieces: 'PIECE',
    nos: 'PIECE',
    no: 'PIECE',
    unit: 'PIECE',
    units: 'PIECE',
    each: 'PIECE',
    doz: 'DOZEN',
    dozens: 'DOZEN',
    packet: 'PACK',
    packets: 'PACK',
    packs: 'PACK',
    pkt: 'PACK',
    boxes: 'BOX',
};
exports.INGREDIENT_COLUMNS = {
    name: ['name', 'ingredient', 'ingredientname', 'item', 'material'],
    unit: ['unit', 'uom', 'measure', 'unitofmeasure'],
    sku: ['sku', 'code', 'itemcode'],
    reorderLevel: [
        'reorderlevel',
        'reorder',
        'minstock',
        'minimumstock',
        'lowstock',
        'lowstocklevel',
    ],
    costPerUnit: ['costperunit', 'cost', 'unitcost', 'rate', 'price'],
    openingStock: [
        'openingstock',
        'stock',
        'currentstock',
        'quantity',
        'qty',
        'opening',
    ],
    isActive: ['isactive', 'active', 'status'],
};
const ingredientKey = (name) => name.toLowerCase();
exports.ingredientKey = ingredientKey;
function validateIngredients(csv) {
    const { index, unknown } = (0, menu_import_1.mapHeaders)(csv.headers, exports.INGREDIENT_COLUMNS);
    const missing = ['name', 'unit'].filter((c) => index[c] === undefined);
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
            fatal: 'The file has a header but no ingredients',
        };
    }
    if (csv.rows.length > menu_import_1.MAX_IMPORT_ROWS) {
        return {
            rows: [],
            errors: [],
            unknownColumns: unknown,
            fatal: `The file has ${csv.rows.length} rows; the limit is ${menu_import_1.MAX_IMPORT_ROWS} per import. Split it into smaller files.`,
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
        const unit = take((0, fields_1.parseEnum)(cell('unit'), 'Unit', exports.INGREDIENT_UNITS, UNIT_ALIASES));
        if (!unit && !msgs.some((m) => m.startsWith('Unit')))
            msgs.push('Unit is required');
        const row = {
            line,
            name: name ?? '',
            unit: unit ?? 'KG',
            sku: take((0, fields_1.parseText)(cell('sku'), 'SKU', 40)),
            reorderLevel: take((0, fields_1.parseNumber)(cell('reorderLevel'), 'Reorder level', {
                min: 0,
                max: 1e9,
            })),
            costPerUnit: take((0, fields_1.parseNumber)(cell('costPerUnit'), 'Cost per unit', { min: 0, max: 1e9 })),
            openingStock: take((0, fields_1.parseNumber)(cell('openingStock'), 'Opening stock', {
                min: 0,
                max: 1e9,
            })),
            isActive: take((0, fields_1.parseBool)(cell('isActive'), 'Active')),
        };
        if (msgs.length && longer) {
            msgs.push('This row has more columns than the header - a value that contains a comma (such as a name or description) must be wrapped in "quotes"');
        }
        if (!msgs.length) {
            const key = (0, exports.ingredientKey)(row.name);
            const first = seen.get(key);
            if (first !== undefined)
                msgs.push(`Duplicate of line ${first} in this file (same name)`);
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
//# sourceMappingURL=ingredient-import.js.map