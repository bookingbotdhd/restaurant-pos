"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offlineSalesSchema = exports.offlineSaleSchema = void 0;
const zod_1 = require("zod");
const money = zod_1.z.coerce.number().min(0).max(10_000_000);
exports.offlineSaleSchema = zod_1.z.object({
    id: zod_1.z.string().min(8).max(64),
    localNumber: zod_1.z.string().max(40),
    soldAt: zod_1.z.string().datetime(),
    type: zod_1.z.enum(['DINE_IN', 'TAKEAWAY']).default('TAKEAWAY'),
    tableLabel: zod_1.z.string().max(40).optional(),
    note: zod_1.z.string().max(300).optional(),
    items: zod_1.z
        .array(zod_1.z.object({
        menuItemId: zod_1.z.string().min(1),
        quantity: zod_1.z.number().int().min(1).max(999),
        unitPrice: money,
    }))
        .min(1)
        .max(100),
    discountPercent: zod_1.z.coerce.number().min(0).max(100).optional(),
    discountFlat: money.optional(),
    payments: zod_1.z
        .array(zod_1.z.object({
        method: zod_1.z.enum(['CASH', 'CARD', 'UPI', 'OTHER']),
        amount: zod_1.z.coerce.number().positive(),
        tendered: zod_1.z.coerce.number().positive().optional(),
        reference: zod_1.z.string().max(100).optional(),
    }))
        .min(1)
        .max(6),
});
exports.offlineSalesSchema = zod_1.z.object({
    deviceName: zod_1.z.string().max(60).optional(),
    sales: zod_1.z.array(exports.offlineSaleSchema).min(1).max(50),
});
//# sourceMappingURL=standalone.schema.js.map