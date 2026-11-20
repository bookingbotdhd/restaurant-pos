export type OnlinePriceAdjust = {
    kind: 'PERCENT' | 'AMOUNT';
    value: number;
};
export declare function adjustOnlinePrice(price: number, adj: OnlinePriceAdjust | null): number;
export declare function onlinePriceAdjustOf(r: {
    onlinePriceAdjustKind: string;
    onlinePriceAdjustValue: unknown;
}): OnlinePriceAdjust | null;
