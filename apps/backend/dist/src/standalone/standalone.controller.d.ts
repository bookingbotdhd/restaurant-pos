import type { SessionUser } from '@nodedr-restaurant/types';
import { BranchAccessService } from '../common/services/branch-access.service';
import { StandaloneService } from './standalone.service';
export declare class StandaloneController {
    private readonly standalone;
    private readonly branchAccess;
    constructor(standalone: StandaloneService, branchAccess: BranchAccessService);
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
    sales(user: SessionUser, branchId: string, body: unknown): Promise<{
        results: import("./standalone.schema").OfflineSaleResult[];
    }>;
}
