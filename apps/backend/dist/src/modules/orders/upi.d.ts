export declare function buildUpiUri(opts: {
    vpa: string;
    name?: string | null;
    amount: number;
    note?: string;
    ref?: string;
}): string;
export interface ReceiptUpi {
    uri: string;
    amountText: string;
    payee: string | null;
}
export declare function upiForBill(opts: {
    vpa: string | null | undefined;
    payeeName: string | null | undefined;
    orderNumber: string;
    balanceDue: number;
    isProvisional: boolean;
    currencySymbol?: string;
}): ReceiptUpi | null;
