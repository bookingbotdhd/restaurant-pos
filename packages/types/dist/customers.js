"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerAddressUpdateSchema = exports.customerAddressSchema = exports.customerSchema = void 0;
exports.formatCustomerAddress = formatCustomerAddress;
const zod_1 = require("zod");
exports.customerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    address: zod_1.z.string().optional(),
    birthday: zod_1.z.coerce.date().optional(),
    anniversary: zod_1.z.coerce.date().optional(),
    allergies: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    marketingOptOut: zod_1.z.boolean().optional(),
});
exports.customerAddressSchema = zod_1.z.object({
    label: zod_1.z.string().trim().max(40).optional(),
    line1: zod_1.z.string().trim().min(1, "House / building is required").max(200),
    street: zod_1.z.string().trim().max(200).optional(),
    landmark: zod_1.z.string().trim().max(200).optional(),
    city: zod_1.z.string().trim().max(100).optional(),
    state: zod_1.z.string().trim().max(100).optional(),
    pincode: zod_1.z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9 -]{3,10}$/, "Enter a valid PIN / postal code")
        .optional(),
    instructions: zod_1.z.string().trim().max(300).optional(),
    isDefault: zod_1.z.boolean().optional(),
});
exports.customerAddressUpdateSchema = exports.customerAddressSchema.partial();
/** One printable line for an order's delivery address snapshot. */
function formatCustomerAddress(a) {
    return [a.line1, a.street, a.landmark ? `Near ${a.landmark}` : null, a.city, a.state]
        .map((p) => p?.trim())
        .filter(Boolean)
        .join(", ");
}
