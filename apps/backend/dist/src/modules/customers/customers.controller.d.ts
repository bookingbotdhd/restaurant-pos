import { type SessionUser } from '@nodedr-restaurant/types';
import { BranchAccessService } from '../../common/services/branch-access.service';
import { ReferralsService } from '../referrals/referrals.service';
import { CustomersService } from './customers.service';
export declare class CustomersController {
    private readonly customersService;
    private readonly branchAccess;
    private readonly referrals;
    constructor(customersService: CustomersService, branchAccess: BranchAccessService, referrals: ReferralsService);
    list(user: SessionUser, branchId: string, search?: string): Promise<{
        id: string;
        name: string | null;
        createdAt: Date;
        address: string | null;
        phone: string | null;
        email: string | null;
        branchId: string;
        notes: string | null;
        birthday: Date | null;
        anniversary: Date | null;
        allergies: string | null;
        loyaltyPoints: number;
        referralCode: string | null;
        marketingOptOut: boolean;
        walletBalance: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    rewards(user: SessionUser, branchId: string, id: string): Promise<{
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
    getById(user: SessionUser, branchId: string, id: string): Promise<{
        orders: {
            id: string;
            orderNumber: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            billedAt: Date | null;
        }[];
        giftCards: {
            id: string;
            createdAt: Date;
            isActive: boolean;
            branchId: string;
            customerId: string | null;
            code: string;
            initialValue: import("@prisma/client/runtime/library").Decimal;
            balance: import("@prisma/client/runtime/library").Decimal;
        }[];
        addresses: {
            id: string;
            label: string | null;
            createdAt: Date;
            updatedAt: Date;
            isDefault: boolean;
            customerId: string;
            state: string | null;
            pincode: string | null;
            line1: string;
            street: string | null;
            landmark: string | null;
            city: string | null;
            instructions: string | null;
        }[];
    } & {
        id: string;
        name: string | null;
        createdAt: Date;
        address: string | null;
        phone: string | null;
        email: string | null;
        branchId: string;
        notes: string | null;
        birthday: Date | null;
        anniversary: Date | null;
        allergies: string | null;
        loyaltyPoints: number;
        referralCode: string | null;
        marketingOptOut: boolean;
        walletBalance: import("@prisma/client/runtime/library").Decimal;
    }>;
    create(user: SessionUser, branchId: string, body: unknown): Promise<{
        id: string;
        name: string | null;
        createdAt: Date;
        address: string | null;
        phone: string | null;
        email: string | null;
        branchId: string;
        notes: string | null;
        birthday: Date | null;
        anniversary: Date | null;
        allergies: string | null;
        loyaltyPoints: number;
        referralCode: string | null;
        marketingOptOut: boolean;
        walletBalance: import("@prisma/client/runtime/library").Decimal;
    }>;
    update(user: SessionUser, branchId: string, id: string, body: unknown): Promise<{
        id: string;
        name: string | null;
        createdAt: Date;
        address: string | null;
        phone: string | null;
        email: string | null;
        branchId: string;
        notes: string | null;
        birthday: Date | null;
        anniversary: Date | null;
        allergies: string | null;
        loyaltyPoints: number;
        referralCode: string | null;
        marketingOptOut: boolean;
        walletBalance: import("@prisma/client/runtime/library").Decimal;
    }>;
    remove(user: SessionUser, branchId: string, id: string): Promise<{
        ok: boolean;
    }>;
    listAddresses(user: SessionUser, branchId: string, id: string): Promise<{
        id: string;
        label: string | null;
        createdAt: Date;
        updatedAt: Date;
        isDefault: boolean;
        customerId: string;
        state: string | null;
        pincode: string | null;
        line1: string;
        street: string | null;
        landmark: string | null;
        city: string | null;
        instructions: string | null;
    }[]>;
    addAddress(user: SessionUser, branchId: string, id: string, body: unknown): Promise<{
        id: string;
        label: string | null;
        createdAt: Date;
        updatedAt: Date;
        isDefault: boolean;
        customerId: string;
        state: string | null;
        pincode: string | null;
        line1: string;
        street: string | null;
        landmark: string | null;
        city: string | null;
        instructions: string | null;
    }>;
    updateAddress(user: SessionUser, branchId: string, id: string, addressId: string, body: unknown): Promise<{
        id: string;
        label: string | null;
        createdAt: Date;
        updatedAt: Date;
        isDefault: boolean;
        customerId: string;
        state: string | null;
        pincode: string | null;
        line1: string;
        street: string | null;
        landmark: string | null;
        city: string | null;
        instructions: string | null;
    }>;
    removeAddress(user: SessionUser, branchId: string, id: string, addressId: string): Promise<{
        ok: boolean;
    }>;
}
