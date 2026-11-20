import type { SessionUser } from '@nodedr-restaurant/types';
import type { Response } from 'express';
import { BranchAccessService } from '../../common/services/branch-access.service';
import { ImportsService } from './imports.service';
export declare class ImportsController {
    private readonly imports;
    private readonly branchAccess;
    constructor(imports: ImportsService, branchAccess: BranchAccessService);
    private allow;
    template(user: SessionUser, k: string, example: string | undefined, res: Response): void;
    private handle;
    preview(user: SessionUser, kind: string, branchId: string, q: {
        updateExisting?: string;
    }, file?: Express.Multer.File): Promise<import("./imports.service").ImportResult>;
    commit(user: SessionUser, kind: string, branchId: string, q: {
        updateExisting?: string;
        skipInvalid?: string;
    }, file?: Express.Multer.File): Promise<import("./imports.service").ImportResult>;
}
