export interface ParsedInvoice {
    invoiceNumber: string | null;
    invoiceDate: string | null;
    dueDate: string | null;
    supplierName: string | null;
    gstin: string | null;
    gstinValid: boolean | null;
    taxAmount: number | null;
    totalAmount: number | null;
    currency: 'INR' | null;
    confidence: number;
    requiresReview: boolean;
    warnings: string[];
}
export declare const MAX_INVOICE_TEXT = 20000;
export declare function parseDate(raw: string): string | null;
export declare function gstinChecksumOk(gstin: string): boolean;
export declare function parseAmount(raw: string): number | null;
export declare function parseInvoiceText(input: string): ParsedInvoice;
