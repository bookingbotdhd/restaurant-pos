import type { ParsedCsv } from './csv';
export declare const SPICE_LEVELS: readonly ["NONE", "MILD", "MEDIUM", "HOT", "EXTRA_HOT"];
export type SpiceLevelValue = (typeof SPICE_LEVELS)[number];
export declare const MENU_COLUMNS: {
    readonly name: readonly ["name", "item", "itemname", "dish", "product"];
    readonly category: readonly ["category", "categoryname", "group"];
    readonly price: readonly ["price", "sellingprice", "mrp", "fullprice", "rate"];
    readonly halfPrice: readonly ["halfprice", "half"];
    readonly taxRatePercent: readonly ["taxratepercent", "taxrate", "tax", "gst", "gstpercent", "gstrate", "taxpercent"];
    readonly sku: readonly ["sku", "code", "itemcode"];
    readonly description: readonly ["description", "desc"];
    readonly station: readonly ["station", "kitchenstation", "kitchen"];
    readonly isVeg: readonly ["isveg", "veg", "vegetarian", "foodtype"];
    readonly spiceLevel: readonly ["spicelevel", "spice"];
    readonly prepTimeMinutes: readonly ["preptimeminutes", "preptime", "preparationtime"];
    readonly costPrice: readonly ["costprice", "cost"];
    readonly calories: readonly ["calories", "kcal"];
    readonly allergens: readonly ["allergens", "allergen"];
    readonly availableFrom: readonly ["availablefrom", "from"];
    readonly availableTo: readonly ["availableto", "to"];
    readonly isActive: readonly ["isactive", "active", "status"];
};
export type MenuColumn = keyof typeof MENU_COLUMNS;
export declare const MENU_REQUIRED: MenuColumn[];
export interface MenuRow {
    line: number;
    name: string;
    category: string;
    price: number;
    halfPrice?: number;
    taxRatePercent?: number;
    sku?: string;
    description?: string;
    station?: string;
    isVeg?: boolean;
    spiceLevel?: SpiceLevelValue;
    prepTimeMinutes?: number;
    costPrice?: number;
    calories?: number;
    allergens?: string[];
    availableFrom?: string;
    availableTo?: string;
    isActive?: boolean;
}
export interface RowIssue {
    line: number;
    name: string;
    messages: string[];
}
export interface ValidatedImport<T> {
    rows: T[];
    errors: RowIssue[];
    unknownColumns: string[];
    fatal?: string;
}
export declare function mapHeaders(headers: string[], columns: Record<string, readonly string[]>): {
    index: Record<string, number>;
    unknown: string[];
};
export declare const MAX_IMPORT_ROWS = 2000;
export declare const menuKey: (r: Pick<MenuRow, "name" | "category" | "sku">) => string;
export declare function validateMenu(csv: ParsedCsv): ValidatedImport<MenuRow>;
