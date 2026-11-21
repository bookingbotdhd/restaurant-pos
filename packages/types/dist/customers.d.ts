import { z } from "zod";
export declare const customerSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    birthday: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    anniversary: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    allergies: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    marketingOptOut: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type CustomerDto = z.infer<typeof customerSchema>;
export declare const customerAddressSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    line1: z.ZodString;
    street: z.ZodOptional<z.ZodString>;
    landmark: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    pincode: z.ZodOptional<z.ZodString>;
    instructions: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type CustomerAddressDto = z.infer<typeof customerAddressSchema>;
export declare const customerAddressUpdateSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    line1: z.ZodOptional<z.ZodString>;
    street: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    landmark: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    city: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    state: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    pincode: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    instructions: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isDefault: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type CustomerAddressUpdateDto = z.infer<typeof customerAddressUpdateSchema>;
/** One printable line for an order's delivery address snapshot. */
export declare function formatCustomerAddress(a: {
    line1: string;
    street?: string | null;
    landmark?: string | null;
    city?: string | null;
    state?: string | null;
}): string;
