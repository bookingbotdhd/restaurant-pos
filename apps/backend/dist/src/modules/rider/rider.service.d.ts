import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryService } from '../delivery/delivery.service';
export declare class RiderService {
    private readonly prisma;
    private readonly delivery;
    constructor(prisma: PrismaService, delivery: DeliveryService);
    private branchOf;
    me(userId: string): Promise<{
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
    setDuty(userId: string, online: boolean): Promise<{
        online: boolean;
    }>;
    setLocation(userId: string, lat: number, lng: number): Promise<{
        saved: boolean;
    }>;
    deliveries(userId: string): Promise<{
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
    setStatus(userId: string, orderId: string, status: 'PICKED_UP' | 'DELIVERED' | 'FAILED', reason?: string): Promise<{
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
