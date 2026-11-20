import type { CustomerAddressDto, CustomerAddressUpdateDto, CustomerDto } from '@nodedr-restaurant/types';
import { PrismaService } from '../../prisma/prisma.service';
export declare class CustomersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(branchId: string, search?: string): import("@prisma/client").Prisma.PrismaPromise<{
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
    getById(branchId: string, id: string): Promise<{
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
    create(branchId: string, dto: CustomerDto): import("@prisma/client").Prisma.Prisma__CustomerClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    update(branchId: string, id: string, dto: Partial<CustomerDto>): Promise<{
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
    remove(branchId: string, id: string): Promise<{
        ok: boolean;
    }>;
    listAddresses(branchId: string, customerId: string): Promise<{
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
    addAddress(branchId: string, customerId: string, dto: CustomerAddressDto): Promise<{
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
    updateAddress(branchId: string, customerId: string, addressId: string, dto: CustomerAddressUpdateDto): Promise<{
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
    removeAddress(branchId: string, customerId: string, addressId: string): Promise<{
        ok: boolean;
    }>;
    private assertInBranch;
}
