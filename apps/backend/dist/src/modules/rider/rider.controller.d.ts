import type { SessionUser } from '@nodedr-restaurant/types';
import { z } from 'zod';
import { RiderService } from './rider.service';
declare const dutySchema: z.ZodObject<{
    online: z.ZodBoolean;
}, z.core.$strip>;
declare const locationSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
}, z.core.$strip>;
declare const statusSchema: z.ZodObject<{
    status: z.ZodEnum<{
        PICKED_UP: "PICKED_UP";
        DELIVERED: "DELIVERED";
        FAILED: "FAILED";
    }>;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare class RiderController {
    private readonly rider;
    constructor(rider: RiderService);
    me(u: SessionUser): Promise<{
        name: string;
        phone: string | null;
        online: boolean;
        location: {
            id: string;
            name: string;
            address: string | null;
        };
        today: {
            active: number;
            delivered: number;
            failed: number;
        };
    }>;
    duty(u: SessionUser, b: z.infer<typeof dutySchema>): Promise<{
        online: boolean;
    }>;
    location(u: SessionUser, b: z.infer<typeof locationSchema>): Promise<{
        saved: boolean;
    }>;
    deliveries(u: SessionUser): Promise<{
        active: {
            id: string;
            orderNumber: string;
            status: import("@prisma/client").$Enums.DeliveryStatus | null;
            assignedAt: Date | null;
            pickedUpAt: Date | null;
            deliveredAt: Date | null;
            failedReason: string | null;
            etaAt: Date | null;
            pickup: {
                name: string;
                address: string | null;
                phone: string | null;
            };
            customer: {
                name: string | null;
                phone: string | null;
            };
            address: string | null;
            pincode: string | null;
            location: {
                lat: number | null;
                lng: number | null;
                place: string | null;
                mapsUrl: string;
            };
            notes: string | null;
            items: {
                name: string;
                quantity: number;
            }[];
            amountToCollect: number;
            orderTotal: number;
            foodReady: boolean;
        }[];
        done: {
            id: string;
            orderNumber: string;
            status: import("@prisma/client").$Enums.DeliveryStatus | null;
            assignedAt: Date | null;
            pickedUpAt: Date | null;
            deliveredAt: Date | null;
            failedReason: string | null;
            etaAt: Date | null;
            pickup: {
                name: string;
                address: string | null;
                phone: string | null;
            };
            customer: {
                name: string | null;
                phone: string | null;
            };
            address: string | null;
            pincode: string | null;
            location: {
                lat: number | null;
                lng: number | null;
                place: string | null;
                mapsUrl: string;
            };
            notes: string | null;
            items: {
                name: string;
                quantity: number;
            }[];
            amountToCollect: number;
            orderTotal: number;
            foodReady: boolean;
        }[];
    }>;
    status(u: SessionUser, id: string, b: z.infer<typeof statusSchema>): Promise<{
        id: string;
        orderNumber: string;
        status: import("@prisma/client").$Enums.DeliveryStatus | null;
        assignedAt: Date | null;
        pickedUpAt: Date | null;
        deliveredAt: Date | null;
        failedReason: string | null;
        etaAt: Date | null;
        pickup: {
            name: string;
            address: string | null;
            phone: string | null;
        };
        customer: {
            name: string | null;
            phone: string | null;
        };
        address: string | null;
        pincode: string | null;
        location: {
            lat: number | null;
            lng: number | null;
            place: string | null;
            mapsUrl: string;
        };
        notes: string | null;
        items: {
            name: string;
            quantity: number;
        }[];
        amountToCollect: number;
        orderTotal: number;
        foodReady: boolean;
    }>;
}
export {};
