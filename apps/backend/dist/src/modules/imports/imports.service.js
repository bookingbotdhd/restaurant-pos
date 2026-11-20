"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuKey = exports.ImportsService = void 0;
exports.decodeCsv = decodeCsv;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../audit/audit.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const csv_1 = require("./csv");
const ingredient_import_1 = require("./ingredient-import");
const menu_import_1 = require("./menu-import");
Object.defineProperty(exports, "menuKey", { enumerable: true, get: function () { return menu_import_1.menuKey; } });
const PREVIEW_ROWS = 200;
const lower = (s) => s.toLowerCase();
const sameList = (a, b) => a.length === b.length &&
    [...a].sort().join('|').toLowerCase() ===
        [...b].sort().join('|').toLowerCase();
function decodeCsv(buf) {
    try {
        return {
            text: new TextDecoder('utf-8', { fatal: true }).decode(buf),
            note: null,
        };
    }
    catch {
        return {
            text: new TextDecoder('windows-1252').decode(buf),
            note: "The file is not UTF-8, so it was read as Windows-1252 (Excel's default). Check that any accented letters or ₹ look right.",
        };
    }
}
let ImportsService = class ImportsService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async run(kind, branchId, userId, file, opts) {
        const { text, note } = decodeCsv(file.buffer);
        let parsed;
        try {
            parsed = (0, csv_1.parseCsv)(text);
        }
        catch (e) {
            if (e instanceof csv_1.CsvError)
                throw new common_1.BadRequestException(e.message);
            throw e;
        }
        const validated = kind === 'menu' ? (0, menu_import_1.validateMenu)(parsed) : (0, ingredient_import_1.validateIngredients)(parsed);
        if (validated.fatal)
            throw new common_1.BadRequestException(validated.fatal);
        if (!opts.commit) {
            return this.plan(kind, this.prisma, branchId, validated, parsed.delimiter, note, opts, userId, false);
        }
        if (validated.errors.length > 0 && !opts.skipInvalid) {
            throw new common_1.UnprocessableEntityException({
                message: `${validated.errors.length} row${validated.errors.length === 1 ? ' has' : 's have'} errors. Fix the file, or choose to skip the invalid rows.`,
                errors: validated.errors,
            });
        }
        const result = await this.prisma.$transaction((tx) => this.plan(kind, tx, branchId, validated, parsed.delimiter, note, opts, userId, true), { timeout: 120_000, maxWait: 10_000 });
        await this.audit.record({
            userId,
            action: `import.${kind}`,
            entity: 'Import',
            metadata: { file: file.originalname.slice(0, 120), ...result.summary },
        });
        return result;
    }
    async plan(kind, db, branchId, v, delimiter, fileNote, opts, userId, apply) {
        const out = kind === 'menu'
            ? await this.planMenu(db, branchId, v.rows, opts, apply)
            : await this.planIngredients(db, branchId, userId, v.rows, opts, apply);
        const errors = [...v.errors, ...out.errors].sort((a, b) => a.line - b.line);
        const count = (a) => out.rows.filter((r) => r.action === a).length;
        return {
            kind,
            applied: apply,
            fileNote,
            delimiter: delimiter === '\t' ? 'tab' : delimiter,
            summary: {
                total: v.rows.length + v.errors.length,
                create: count('create'),
                update: count('update'),
                unchanged: count('unchanged'),
                skipped: count('skipped'),
                errors: errors.length,
            },
            newCategories: out.newCategories,
            newStations: out.newStations,
            unknownColumns: v.unknownColumns,
            warnings: out.warnings,
            errors,
            rows: out.rows.slice(0, PREVIEW_ROWS),
        };
    }
    async planMenu(db, branchId, rows, opts, apply) {
        const [cats, stations, items] = await Promise.all([
            db.menuCategory.findMany({ where: { branchId } }),
            db.kitchenStation.findMany({ where: { branchId } }),
            db.menuItem.findMany({ where: { branchId } }),
        ]);
        const catId = new Map(cats.map((c) => [lower(c.name), c.id]));
        const stationId = new Map(stations.map((s) => [lower(s.name), s.id]));
        const bySku = new Map(items.filter((i) => i.sku).map((i) => [lower(i.sku), i]));
        const byNameCat = new Map(items.map((i) => [`${lower(i.name)}|${i.categoryId}`, i]));
        const newCategories = [];
        const newStations = [];
        for (const r of rows) {
            if (!catId.has(lower(r.category)) &&
                !newCategories.some((c) => lower(c) === lower(r.category)))
                newCategories.push(r.category);
            if (r.station &&
                !stationId.has(lower(r.station)) &&
                !newStations.some((s) => lower(s) === lower(r.station)))
                newStations.push(r.station);
        }
        const planned = [];
        const warnings = [];
        const creates = [];
        const updates = [];
        const claimed = new Set();
        for (const r of rows) {
            const cid = catId.get(lower(r.category));
            let match = r.sku ? bySku.get(lower(r.sku)) : undefined;
            const matchedBySku = !!match;
            if (!match && cid) {
                const byName = byNameCat.get(`${lower(r.name)}|${cid}`);
                if (byName && (!r.sku || !byName.sku))
                    match = byName;
            }
            if (match && claimed.has(match.id)) {
                warnings.push({
                    line: r.line,
                    message: `"${r.name}" matches an item already handled by an earlier row, so it was treated as a new item`,
                });
                match = undefined;
            }
            if (!match) {
                planned.push({
                    line: r.line,
                    name: r.name,
                    detail: r.category,
                    action: 'create',
                    changes: [],
                });
                creates.push({ row: r });
                continue;
            }
            claimed.add(match.id);
            if (!opts.updateExisting) {
                planned.push({
                    line: r.line,
                    name: r.name,
                    detail: r.category,
                    action: 'skipped',
                    changes: [],
                });
                continue;
            }
            const data = {};
            const changes = [];
            const set = (field, label, next, cur) => {
                if (next === undefined)
                    return;
                if (next !== cur) {
                    data[field] = next;
                    changes.push(label);
                }
            };
            if (matchedBySku)
                set('name', 'name', r.name, match.name);
            if (cid && cid !== match.categoryId) {
                data.categoryId = cid;
                changes.push('category');
            }
            set('price', 'price', r.price, Number(match.price));
            set('halfPrice', 'half price', r.halfPrice, match.halfPrice === null ? null : Number(match.halfPrice));
            set('taxRatePercent', 'tax rate', r.taxRatePercent, Number(match.taxRatePercent));
            set('sku', 'SKU', r.sku, match.sku);
            set('description', 'description', r.description, match.description);
            let stationName;
            if (r.station) {
                const sid = stationId.get(lower(r.station));
                if (sid === undefined || sid !== match.stationId) {
                    stationName = r.station;
                    changes.push('station');
                }
            }
            set('isVeg', 'veg', r.isVeg, match.isVeg);
            set('spiceLevel', 'spice level', r.spiceLevel, match.spiceLevel);
            set('prepTimeMinutes', 'prep time', r.prepTimeMinutes, match.prepTimeMinutes);
            set('costPrice', 'cost price', r.costPrice, match.costPrice === null ? null : Number(match.costPrice));
            set('calories', 'calories', r.calories, match.calories);
            if (r.allergens && !sameList(r.allergens, match.allergens)) {
                data.allergens = r.allergens;
                changes.push('allergens');
            }
            set('availableFrom', 'available from', r.availableFrom, match.availableFrom);
            set('availableTo', 'available to', r.availableTo, match.availableTo);
            set('isActive', 'active', r.isActive, match.isActive);
            if (changes.length === 0) {
                planned.push({
                    line: r.line,
                    name: r.name,
                    detail: r.category,
                    action: 'unchanged',
                    changes: [],
                });
            }
            else {
                planned.push({
                    line: r.line,
                    name: r.name,
                    detail: r.category,
                    action: 'update',
                    changes,
                });
                updates.push({ id: match.id, data, stationName });
            }
        }
        if (apply) {
            const base = (await db.menuCategory.aggregate({
                where: { branchId },
                _max: { sortOrder: true },
            }))._max.sortOrder ?? 0;
            for (const [i, name] of newCategories.entries()) {
                const c = await db.menuCategory.create({
                    data: { branchId, name, sortOrder: base + i + 1 },
                });
                catId.set(lower(name), c.id);
            }
            for (const name of newStations) {
                const s = await db.kitchenStation.create({ data: { branchId, name } });
                stationId.set(lower(name), s.id);
            }
            const itemBase = (await db.menuItem.aggregate({
                where: { branchId },
                _max: { sortOrder: true },
            }))._max.sortOrder ?? 0;
            if (creates.length) {
                await db.menuItem.createMany({
                    data: creates.map(({ row: r }, i) => ({
                        branchId,
                        categoryId: catId.get(lower(r.category)),
                        stationId: r.station ? stationId.get(lower(r.station)) : undefined,
                        name: r.name,
                        sku: r.sku,
                        description: r.description,
                        price: r.price,
                        halfPrice: r.halfPrice,
                        taxRatePercent: r.taxRatePercent ?? 0,
                        costPrice: r.costPrice,
                        prepTimeMinutes: r.prepTimeMinutes,
                        calories: r.calories,
                        isVeg: r.isVeg ?? true,
                        spiceLevel: r.spiceLevel ?? 'NONE',
                        allergens: r.allergens ?? [],
                        availableFrom: r.availableFrom,
                        availableTo: r.availableTo,
                        isActive: r.isActive ?? true,
                        sortOrder: itemBase + i + 1,
                    })),
                });
            }
            for (const u of updates) {
                if (u.stationName)
                    u.data.stationId = stationId.get(lower(u.stationName));
                await db.menuItem.update({ where: { id: u.id }, data: u.data });
            }
        }
        return {
            rows: planned,
            warnings,
            errors: [],
            newCategories,
            newStations,
        };
    }
    async planIngredients(db, branchId, userId, rows, opts, apply) {
        const [existing, history] = await Promise.all([
            db.ingredient.findMany({ where: { branchId } }),
            db.stockMovement.groupBy({
                by: ['ingredientId'],
                where: { branchId },
                _count: true,
            }),
        ]);
        const byName = new Map(existing.map((i) => [(0, ingredient_import_1.ingredientKey)(i.name), i]));
        const hasHistory = new Set(history.map((h) => h.ingredientId));
        const planned = [];
        const warnings = [];
        const errors = [];
        const creates = [];
        const updates = [];
        for (const r of rows) {
            const cur = byName.get((0, ingredient_import_1.ingredientKey)(r.name));
            if (!cur) {
                planned.push({
                    line: r.line,
                    name: r.name,
                    detail: r.unit,
                    action: 'create',
                    changes: r.openingStock ? [`opening stock ${r.openingStock}`] : [],
                });
                creates.push(r);
                continue;
            }
            if (cur.unit !== r.unit) {
                errors.push({
                    line: r.line,
                    name: r.name,
                    messages: [
                        `Already exists with unit ${cur.unit}; the unit cannot be changed by import (quantities would be wrong). Use a different name, or change it in Inventory.`,
                    ],
                });
                continue;
            }
            if (!opts.updateExisting) {
                planned.push({
                    line: r.line,
                    name: r.name,
                    detail: r.unit,
                    action: 'skipped',
                    changes: [],
                });
                continue;
            }
            const data = {};
            const changes = [];
            if (r.sku !== undefined && r.sku !== cur.sku) {
                data.sku = r.sku;
                changes.push('SKU');
            }
            if (r.reorderLevel !== undefined &&
                r.reorderLevel !== Number(cur.reorderLevel)) {
                data.reorderLevel = r.reorderLevel;
                changes.push('reorder level');
            }
            if (r.costPerUnit !== undefined &&
                r.costPerUnit !== Number(cur.costPerUnit)) {
                data.costPerUnit = r.costPerUnit;
                changes.push('cost');
            }
            if (r.isActive !== undefined && r.isActive !== cur.isActive) {
                data.isActive = r.isActive;
                changes.push('active');
            }
            let opening;
            if (r.openingStock !== undefined && r.openingStock > 0) {
                if (!hasHistory.has(cur.id) && Number(cur.currentStock) === 0) {
                    opening = r.openingStock;
                    changes.push(`opening stock ${r.openingStock}`);
                }
                else {
                    warnings.push({
                        line: r.line,
                        message: `"${r.name}" already has stock history, so its stock was left as it is. Use Adjust stock in Inventory to change quantities.`,
                    });
                }
            }
            if (changes.length === 0) {
                planned.push({
                    line: r.line,
                    name: r.name,
                    detail: r.unit,
                    action: 'unchanged',
                    changes: [],
                });
            }
            else {
                planned.push({
                    line: r.line,
                    name: r.name,
                    detail: r.unit,
                    action: 'update',
                    changes,
                });
                updates.push({ id: cur.id, data, opening });
            }
        }
        if (apply) {
            const note = 'Opening stock (CSV import)';
            if (creates.length) {
                const made = await db.ingredient.createManyAndReturn({
                    data: creates.map((r) => ({
                        branchId,
                        name: r.name,
                        unit: r.unit,
                        sku: r.sku,
                        reorderLevel: r.reorderLevel ?? 0,
                        costPerUnit: r.costPerUnit ?? 0,
                        currentStock: r.openingStock ?? 0,
                        isActive: r.isActive ?? true,
                    })),
                    select: { id: true, name: true },
                });
                const idByName = new Map(made.map((m) => [(0, ingredient_import_1.ingredientKey)(m.name), m.id]));
                const moves = creates
                    .filter((r) => (r.openingStock ?? 0) > 0)
                    .map((r) => ({
                    branchId,
                    ingredientId: idByName.get((0, ingredient_import_1.ingredientKey)(r.name)),
                    type: 'ADJUSTMENT',
                    quantity: r.openingStock,
                    note,
                    createdById: userId,
                }));
                if (moves.length)
                    await db.stockMovement.createMany({ data: moves });
            }
            for (const u of updates) {
                await db.ingredient.update({
                    where: { id: u.id },
                    data: {
                        ...u.data,
                        ...(u.opening ? { currentStock: u.opening } : {}),
                    },
                });
                if (u.opening) {
                    await db.stockMovement.create({
                        data: {
                            branchId,
                            ingredientId: u.id,
                            type: 'ADJUSTMENT',
                            quantity: u.opening,
                            note,
                            createdById: userId,
                        },
                    });
                }
            }
        }
        return {
            rows: planned,
            warnings,
            errors,
            newCategories: [],
            newStations: [],
        };
    }
};
exports.ImportsService = ImportsService;
exports.ImportsService = ImportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ImportsService);
//# sourceMappingURL=imports.service.js.map