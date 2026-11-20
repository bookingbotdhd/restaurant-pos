import { z } from "zod";
export declare const INTEGRATION_SCOPES: readonly [{
    readonly key: "locations:read";
    readonly label: "View locations";
    readonly description: "List active branches and their basic info.";
}, {
    readonly key: "menu:read";
    readonly label: "View menu";
    readonly description: "Read a location's menu, categories, and prices.";
}, {
    readonly key: "orders:write";
    readonly label: "Create orders";
    readonly description: "Place a new takeaway/delivery order for a location.";
}, {
    readonly key: "orders:read";
    readonly label: "View order status";
    readonly description: "Look up the status, items and totals of orders this key placed. Never includes customer details.";
}, {
    readonly key: "orders:read_customer";
    readonly label: "View order customer & delivery details";
    readonly description: "Also read the customer's name, mobile number, email and delivery address on orders this key placed. Grant only to a backend that needs it to fulfil orders.";
}, {
    readonly key: "reservations:write";
    readonly label: "Book tables";
    readonly description: "Create a new table reservation for a location.";
}, {
    readonly key: "reservations:read";
    readonly label: "View reservation status";
    readonly description: "Look up a reservation's current status.";
}];
export declare const integrationScopeSchema: z.ZodEnum<{
    [x: string]: string;
}>;
export type IntegrationScope = z.infer<typeof integrationScopeSchema>;
export declare const createIntegrationApiKeySchema: z.ZodObject<{
    name: z.ZodString;
    branchId: z.ZodOptional<z.ZodString>;
    scopes: z.ZodArray<z.ZodEnum<{
        [x: string]: string;
    }>>;
    expiresAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateIntegrationApiKeyDto = z.infer<typeof createIntegrationApiKeySchema>;
export declare const createStaffApiKeySchema: z.ZodObject<{
    name: z.ZodString;
}, z.core.$strip>;
export type CreateStaffApiKeyDto = z.infer<typeof createStaffApiKeySchema>;
export declare const integrationOrderItemSchema: z.ZodObject<{
    menuItemId: z.ZodString;
    quantity: z.ZodNumber;
    modifierIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    kitchenNote: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const integrationOrderTypeSchema: z.ZodEnum<{
    TAKEAWAY: "TAKEAWAY";
    DELIVERY: "DELIVERY";
}>;
export declare const integrationDeliverySchema: z.ZodObject<{
    address: z.ZodString;
    pincode: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    lat: z.ZodOptional<z.ZodNumber>;
    lng: z.ZodOptional<z.ZodNumber>;
    place: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createIntegrationOrderSchema: z.ZodObject<{
    type: z.ZodDefault<z.ZodEnum<{
        TAKEAWAY: "TAKEAWAY";
        DELIVERY: "DELIVERY";
    }>>;
    customerName: z.ZodString;
    customerPhone: z.ZodString;
    customerEmail: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    delivery: z.ZodOptional<z.ZodObject<{
        address: z.ZodString;
        pincode: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
        lat: z.ZodOptional<z.ZodNumber>;
        lng: z.ZodOptional<z.ZodNumber>;
        place: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    scheduledFor: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        menuItemId: z.ZodString;
        quantity: z.ZodNumber;
        modifierIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
        kitchenNote: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    referralCode: z.ZodOptional<z.ZodString>;
    sharedItemId: z.ZodOptional<z.ZodString>;
    redeemPoints: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type CreateIntegrationOrderDto = z.infer<typeof createIntegrationOrderSchema>;
export declare const integrationIdempotencyKeySchema: z.ZodString;
export declare const integrationRewardsLookupSchema: z.ZodObject<{
    customerPhone: z.ZodString;
    customerName: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type IntegrationRewardsLookupDto = z.infer<typeof integrationRewardsLookupSchema>;
export declare const createIntegrationReservationSchema: z.ZodObject<{
    customerName: z.ZodString;
    phone: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    guestCount: z.ZodNumber;
    reservedAt: z.ZodCoercedDate<unknown>;
    durationMinutes: z.ZodDefault<z.ZodNumber>;
    specialRequests: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateIntegrationReservationDto = z.infer<typeof createIntegrationReservationSchema>;
