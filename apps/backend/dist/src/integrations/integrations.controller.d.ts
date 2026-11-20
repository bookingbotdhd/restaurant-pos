import type { IntegrationKeyContext } from './integrations.service';
import { IntegrationsService } from './integrations.service';
export declare class IntegrationsController {
    private readonly integrations;
    constructor(integrations: IntegrationsService);
    listLocations(key: IntegrationKeyContext): Promise<{
        id: string;
        name: string;
        address: string | null;
        phone: string | null;
    }[]>;
    getMenu(key: IntegrationKeyContext, branchId: string): Promise<{
        locationId: string;
        locationName: string;
        categories: {
            items: {
                price: number | import("@prisma/client/runtime/library").Decimal;
                modifierGroups: {
                    id: string;
                    name: string;
                    minSelect: number;
                    maxSelect: number;
                    isRequired: boolean;
                    modifiers: {
                        id: string;
                        name: string;
                        priceAdjustment: import("@prisma/client/runtime/library").Decimal;
                        isDefault: boolean;
                    }[];
                }[];
                id: string;
                name: string;
                taxRatePercent: import("@prisma/client/runtime/library").Decimal;
                description: string | null;
                imageUrl: string | null;
                isVeg: boolean;
                isVegan: boolean;
                spiceLevel: import("@prisma/client").$Enums.SpiceLevel;
                allergens: string[];
                availableFrom: string | null;
                availableTo: string | null;
            }[];
            id: string;
            name: string;
            isActive: boolean;
            branchId: string;
            sortOrder: number;
            showOnWebsite: boolean;
        }[];
    }>;
    deliveryQuote(key: IntegrationKeyContext, branchId: string, pincode: string): Promise<{
        deliverable: false;
        zoneName?: undefined;
        fee?: undefined;
        minOrderAmount?: undefined;
        etaMinutes?: undefined;
    } | {
        deliverable: true;
        zoneName: string;
        fee: number;
        minOrderAmount: number;
        etaMinutes: number;
    }>;
    createOrder(key: IntegrationKeyContext, branchId: string, body: unknown, idempotencyKey?: string): Promise<{
        customer?: {
            name: string | null;
            phone: string | null;
            email: string | null;
        } | undefined;
        delivery?: {
            address: string | null;
            pincode: string | null;
            phone: string | null;
            lat: number | null;
            lng: number | null;
            place: string | null;
        } | null | undefined;
        id: string;
        orderNumber: string;
        type: import("@prisma/client").$Enums.OrderType;
        status: import("@prisma/client").$Enums.OrderStatus;
        acceptance: import("@prisma/client").$Enums.AcceptanceStatus;
        kitchenStatus: import("@prisma/client").$Enums.KotStatus[];
        createdAt: Date;
        scheduledFor: Date | null;
        notes: string | null;
        items: {
            name: string;
            quantity: number;
            unitPrice: number;
            lineTotal: number;
            kitchenNote: string | null;
            modifiers: {
                name: string;
                priceAdjustment: number;
            }[];
        }[];
        totals: {
            subtotal: number;
            tax: number;
            discount: number;
            deliveryFee: number;
            total: number;
            paid: number;
        };
        fulfillment: {
            deliveryStatus: import("@prisma/client").$Enums.DeliveryStatus | null;
            etaAt: Date | null;
            deliveredAt: Date | null;
        } | null;
    }>;
    getOrder(key: IntegrationKeyContext, branchId: string, orderId: string, include?: string): Promise<{
        customer?: {
            name: string | null;
            phone: string | null;
            email: string | null;
        } | undefined;
        delivery?: {
            address: string | null;
            pincode: string | null;
            phone: string | null;
            lat: number | null;
            lng: number | null;
            place: string | null;
        } | null | undefined;
        id: string;
        orderNumber: string;
        type: import("@prisma/client").$Enums.OrderType;
        status: import("@prisma/client").$Enums.OrderStatus;
        acceptance: import("@prisma/client").$Enums.AcceptanceStatus;
        kitchenStatus: import("@prisma/client").$Enums.KotStatus[];
        createdAt: Date;
        scheduledFor: Date | null;
        notes: string | null;
        items: {
            name: string;
            quantity: number;
            unitPrice: number;
            lineTotal: number;
            kitchenNote: string | null;
            modifiers: {
                name: string;
                priceAdjustment: number;
            }[];
        }[];
        totals: {
            subtotal: number;
            tax: number;
            discount: number;
            deliveryFee: number;
            total: number;
            paid: number;
        };
        fulfillment: {
            deliveryStatus: import("@prisma/client").$Enums.DeliveryStatus | null;
            etaAt: Date | null;
            deliveredAt: Date | null;
        } | null;
    }>;
    rewards(key: IntegrationKeyContext, branchId: string, body: unknown): Promise<{
        referralEnabled: boolean;
        code: string | null;
        points: number;
        pointValue: number;
        currency: string;
        balanceValue: number;
        sharerPoints: number;
        referredPoints: number;
        minPurchase: number;
        onlineMinOrder: number;
        rewards: {
            points: number;
            discount: number;
        }[];
        invited: number;
        rewarded: number;
        pointsFromReferrals: number;
        referredBy: import("@prisma/client").$Enums.ReferralStatus | null;
        history: {
            createdAt: Date;
            reason: string;
            delta: number;
        }[];
    }>;
    createReservation(key: IntegrationKeyContext, branchId: string, body: unknown): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        email: string | null;
        branchId: string;
        status: import("@prisma/client").$Enums.ReservationStatus;
        channel: import("@prisma/client").$Enums.OrderChannel;
        tableId: string | null;
        guestCount: number;
        deposit: import("@prisma/client/runtime/library").Decimal | null;
        customerName: string;
        reservedAt: Date;
        durationMinutes: number;
        specialRequests: string | null;
        reminderSentAt: Date | null;
    }>;
    getReservation(key: IntegrationKeyContext, branchId: string, reservationId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        email: string | null;
        branchId: string;
        status: import("@prisma/client").$Enums.ReservationStatus;
        channel: import("@prisma/client").$Enums.OrderChannel;
        tableId: string | null;
        guestCount: number;
        deposit: import("@prisma/client/runtime/library").Decimal | null;
        customerName: string;
        reservedAt: Date;
        durationMinutes: number;
        specialRequests: string | null;
        reminderSentAt: Date | null;
    }>;
}
