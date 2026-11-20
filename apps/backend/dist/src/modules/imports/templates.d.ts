export declare const MENU_HEADERS: readonly ["name", "category", "price", "half_price", "tax_rate_percent", "sku", "description", "station", "is_veg", "spice_level", "prep_time_minutes", "cost_price", "calories", "allergens", "available_from", "available_to", "is_active"];
export declare const MENU_EXAMPLE: (string | number)[][];
export declare const INGREDIENT_HEADERS: readonly ["name", "unit", "sku", "reorder_level", "cost_per_unit", "opening_stock", "is_active"];
export declare const INGREDIENT_EXAMPLE: (string | number)[][];
export type ImportKind = 'menu' | 'ingredients';
export declare function templateCsv(kind: ImportKind, withExamples: boolean): string;
export declare const templateFileName: (kind: ImportKind, withExamples: boolean) => string;
