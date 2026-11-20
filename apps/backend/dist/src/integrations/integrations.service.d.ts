import { Prisma } from '@prisma/client';
import type { CreateIntegrationOrderDto, CreateIntegrationReservationDto, IntegrationRewardsLookupDto } from '@nodedr-restaurant/types';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryService } from '../modules/delivery/delivery.service';
import { OrdersService } from '../modules/orders/orders.service';
import { ReferralsService } from '../modules/referrals/referrals.service';
import { ReservationsService } from '../modules/reservations/reservations.service';
export declare const PERSONAL_DATA_SCOPE = "orders:read_customer";
export interface IntegrationKeyContext {
    id: string;
    restaurantId: string;
    branchId: string | null;
    scopes: string[];
}
export declare class IntegrationsService {
    private readonly prisma;
    private readonly orders;
    private readonly delivery;
    private readonly reservations;
    private readonly referrals;
    constructor(prisma: PrismaService, orders: OrdersService, delivery: DeliveryService, reservations: ReservationsService, referrals: ReferralsService);
    private assertBranch;
    listLocations(ctx: IntegrationKeyContext): Promise<{
        id: string;
        name: string;
        address: string | null;
        phone: string | null;
    }[]>;
    getMenu(ctx: IntegrationKeyContext, branchId: string): Promise<{
        locationId: string;
        locationName: string;
        categories: {
            items: {
                price: number | Prisma.Decimal;
                modifierGroups: {
                    id: string;
                    name: string;
                    minSelect: number;
                    maxSelect: number;
                    isRequired: boolean;
                    modifiers: {
                        id: string;
                        name: string;
                        priceAdjustment: Prisma.Decimal;
                        isDefault: boolean;
                    }[];
                }[];
                id: string;
                name: string;
                taxRatePercent: Prisma.Decimal;
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
    createOrder(ctx: IntegrationKeyContext, branchId: string, dto: CreateIntegrationOrderDto, idempotencyKey?: string): Promise<{
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
    private customerFor;
    private applyRewards;
    rewards(ctx: IntegrationKeyContext, branchId: string, dto: IntegrationRewardsLookupDto): Promise<{
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
    deliveryQuote(ctx: IntegrationKeyContext, branchId: string, pincode: string): Promise<{
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
    getOrder(ctx: IntegrationKeyContext, branchId: string, orderId: string, includeCustomer?: boolean): Promise<{
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
    private findOwnOrder;
    private present;
    createReservation(ctx: IntegrationKeyContext, branchId: string, dto: CreateIntegrationReservationDto): Promise<{
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
        deposit: Prisma.Decimal | null;
        customerName: string;
        reservedAt: Date;
        durationMinutes: number;
        specialRequests: string | null;
        reminderSentAt: Date | null;
    }>;
    getReservation(ctx: IntegrationKeyContext, branchId: string, reservationId: string): Promise<{
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
        deposit: Prisma.Decimal | null;
        customerName: string;
        reservedAt: Date;
        durationMinutes: number;
        specialRequests: string | null;
        reminderSentAt: Date | null;
    }>;
}
