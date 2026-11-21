"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntegrationReservationSchema = exports.integrationRewardsLookupSchema = exports.integrationIdempotencyKeySchema = exports.createIntegrationOrderSchema = exports.integrationDeliverySchema = exports.integrationOrderTypeSchema = exports.integrationOrderItemSchema = exports.createStaffApiKeySchema = exports.createIntegrationApiKeySchema = exports.integrationScopeSchema = exports.INTEGRATION_SCOPES = void 0;
const zod_1 = require("zod");
// Scopes an IntegrationApiKey (see schema.prisma) can hold — what an
// external website's own backend is allowed to do once authenticated with
// that key. Deliberately separate from the staff PermissionKey list
// (permissions.ts): these are not tied to any staff member or role, they
// describe what an external system integration is allowed to do.
exports.INTEGRATION_SCOPES = [
    { key: "locations:read", label: "View locations", description: "List active branches and their basic info." },
    { key: "menu:read", label: "View menu", description: "Read a location's menu, categories, and prices." },
    { key: "orders:write", label: "Create orders", description: "Place a new takeaway/delivery order for a location." },
    {
        key: "orders:read",
        label: "View order status",
        description: "Look up the status, items and totals of orders this key placed. Never includes customer details.",
    },
    {
        key: "orders:read_customer",
        label: "View order customer & delivery details",
        description: "Also read the customer's name, mobile number, email and delivery address on orders this key placed. Grant only to a backend that needs it to fulfil orders.",
    },
    {
        key: "reservations:write",
        label: "Book tables",
        description: "Create a new table reservation for a location.",
    },
    {
        key: "reservations:read",
        label: "View reservation status",
        description: "Look up a reservation's current status.",
    },
];
exports.integrationScopeSchema = zod_1.z.enum(exports.INTEGRATION_SCOPES.map((s) => s.key));
exports.createIntegrationApiKeySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(80),
    branchId: zod_1.z.string().optional(),
    scopes: zod_1.z.array(exports.integrationScopeSchema).min(1),
    // Optional: the key stops working at this time (ISO 8601, in the future).
    expiresAt: zod_1.z
        .string()
        .datetime()
        .refine((v) => new Date(v).getTime() > Date.now(), "expiresAt must be in the future")
        .optional(),
});
exports.createStaffApiKeySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(80),
});
// Public REST API request/response shapes (docs/integrations-api.md is the
// human-readable version of these).
exports.integrationOrderItemSchema = zod_1.z.object({
    menuItemId: zod_1.z.string().trim().min(1).max(64),
    quantity: zod_1.z.number().int().min(1).max(99),
    modifierIds: zod_1.z.array(zod_1.z.string().trim().min(1).max(64)).max(20).default([]),
    kitchenNote: zod_1.z.string().trim().max(200).optional(),
});
exports.integrationOrderTypeSchema = zod_1.z.enum(["TAKEAWAY", "DELIVERY"]);
// Digits with the usual separators, optional leading "+". Stricter than the
// staff-side delivery schema because this one is fed by an anonymous public
// form, and the value ends up on a kitchen/driver screen.
const phoneSchema = zod_1.z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ()-]{5,19}$/, "Enter a valid mobile number");
exports.integrationDeliverySchema = zod_1.z.object({
    address: zod_1.z.string().trim().min(5).max(300),
    pincode: zod_1.z.string().trim().min(3).max(12),
    // Defaults to customerPhone when omitted.
    phone: phoneSchema.optional(),
    // The customer's shared position (both or neither) and/or a named place / landmark.
    lat: zod_1.z.number().min(-90).max(90).optional(),
    lng: zod_1.z.number().min(-180).max(180).optional(),
    place: zod_1.z.string().trim().max(200).optional(),
}).refine((d) => (d.lat === undefined) === (d.lng === undefined), {
    path: ["lat"],
    message: "Send both lat and lng, or neither",
});
exports.createIntegrationOrderSchema = zod_1.z
    .object({
    type: exports.integrationOrderTypeSchema.default("TAKEAWAY"),
    customerName: zod_1.z.string().trim().min(1).max(80),
    customerPhone: phoneSchema,
    customerEmail: zod_1.z.string().trim().toLowerCase().email().max(120).optional(),
    notes: zod_1.z.string().trim().max(500).optional(),
    // Required for DELIVERY.
    delivery: exports.integrationDeliverySchema.optional(),
    // Requested time (pre-order / click & collect): ISO time at least 10
    // minutes ahead.
    scheduledFor: zod_1.z.string().datetime().optional(),
    items: zod_1.z.array(exports.integrationOrderItemSchema).min(1).max(50),
    // Referral link the customer arrived through (optional, ignored if invalid).
    referralCode: zod_1.z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6,12}$/).optional(),
    // The shared dish, when the link was for one item.
    sharedItemId: zod_1.z.string().trim().max(64).optional(),
    // Loyalty points the customer wants to use against this order's bill.
    redeemPoints: zod_1.z.number().int().min(1).max(1_000_000).optional(),
})
    .refine((o) => o.type !== "DELIVERY" || !!o.delivery, {
    path: ["delivery"],
    message: "delivery (address and pincode) is required for DELIVERY orders",
});
// Caller-chosen key that makes a retried POST return the original order.
exports.integrationIdempotencyKeySchema = zod_1.z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,64}$/, "Idempotency-Key must be 8-64 characters of A-Z a-z 0-9 _ -");
// Rewards lookup for a signed-in website customer (identified by mobile number).
exports.integrationRewardsLookupSchema = zod_1.z.object({
    customerPhone: phoneSchema,
    customerName: zod_1.z.string().trim().min(1).max(80).optional(),
});
exports.createIntegrationReservationSchema = zod_1.z.object({
    customerName: zod_1.z.string().trim().min(1).max(80),
    phone: zod_1.z.string().trim().min(1).max(30),
    email: zod_1.z.string().email().optional(),
    guestCount: zod_1.z.number().int().positive(),
    reservedAt: zod_1.z.coerce.date(),
    durationMinutes: zod_1.z.number().int().positive().default(90),
    specialRequests: zod_1.z.string().optional(),
});
