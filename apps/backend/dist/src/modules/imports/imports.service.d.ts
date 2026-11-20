import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { menuKey, type RowIssue } from './menu-import';
import type { ImportKind } from './templates';
export type RowAction = 'create' | 'update' | 'unchanged' | 'skipped';
export interface PlannedRow {
    line: number;
    name: string;
    detail: string;
    action: RowAction;
    changes: string[];
}
export interface ImportResult {
    kind: ImportKind;
    applied: boolean;
    fileNote: string | null;
    delimiter: string;
    summary: {
        total: number;
        create: number;
        update: number;
        unchanged: number;
        skipped: number;
        errors: number;
    };
    newCategories: string[];
    newStations: string[];
    unknownColumns: string[];
    warnings: {
        line: number;
        message: string;
    }[];
    errors: RowIssue[];
    rows: PlannedRow[];
}
export interface ImportOptions {
    commit: boolean;
    updateExisting: boolean;
    skipInvalid: boolean;
}
export declare function decodeCsv(buf: Buffer): {
    text: string;
    note: string | null;
};
export declare class ImportsService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    run(kind: ImportKind, branchId: string, userId: string, file: {
        buffer: Buffer;
        originalname: string;
    }, opts: ImportOptions): Promise<ImportResult>;
    private plan;
    private planMenu;
    private planIngredients;
}
export { menuKey };
