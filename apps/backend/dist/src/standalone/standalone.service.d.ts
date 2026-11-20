import type { SessionUser } from '@nodedr-restaurant/types';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../modules/orders/orders.service';
import type { OfflineSaleResult, OfflineSalesDto } from './standalone.schema';
export declare class StandaloneService {
    private readonly prisma;
    private readonly orders;
    private readonly logger;
    constructor(prisma: PrismaService, orders: OrdersService);
    snapshot(user: SessionUser, branchId: string): Promise<{
        generatedAt: string;
        user: {
            id: string;
            name: string;
            permissions: string[];
        };
        restaurant: {
            name: string;
            currency: string;
            timezone: string;
            upiVpa: string | null;
            upiPayeeName: string;
            maxManualDiscountPercent: number;
        };
        branch: {
            id: string;
            name: string;
            address: string | null;
            phone: string | null;
            gstNumber: string | null;
            taxRegime: import("@prisma/client").$Enums.TaxRegime;
            taxMode: import("@prisma/client").$Enums.TaxMode;
            taxLabel: string | null;
            taxId: string | null;
            printerPaperWidthMm: number;
            printerColumns: number | null;
        };
        categories: {
            id: string;
            name: string;
            sortOrder: number;
        }[];
        items: {
            id: string;
            categoryId: string;
            name: string;
            price: number;
            taxRate: number;
            isVeg: boolean;
            sellOffline: boolean;
        }[];
        floors: {
            id: string;
            name: string;
            tables: {
                id: string;
                label: string;
                capacity: number;
            }[];
        }[];
    }>;
    syncSales(user: SessionUser, branchId: string, body: OfflineSalesDto): Promise<{
        results: OfflineSaleResult[];
    }>;
    private recordSale;
    private applyOfflinePrices;
}
