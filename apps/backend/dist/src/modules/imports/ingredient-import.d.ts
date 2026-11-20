import type { ParsedCsv } from './csv';
import { type ValidatedImport } from './menu-import';
export declare const INGREDIENT_UNITS: readonly ["KG", "G", "L", "ML", "PIECE", "DOZEN", "PACK", "BOX"];
export type IngredientUnitValue = (typeof INGREDIENT_UNITS)[number];
export declare const INGREDIENT_COLUMNS: {
    readonly name: readonly ["name", "ingredient", "ingredientname", "item", "material"];
    readonly unit: readonly ["unit", "uom", "measure", "unitofmeasure"];
    readonly sku: readonly ["sku", "code", "itemcode"];
    readonly reorderLevel: readonly ["reorderlevel", "reorder", "minstock", "minimumstock", "lowstock", "lowstocklevel"];
    readonly costPerUnit: readonly ["costperunit", "cost", "unitcost", "rate", "price"];
    readonly openingStock: readonly ["openingstock", "stock", "currentstock", "quantity", "qty", "opening"];
    readonly isActive: readonly ["isactive", "active", "status"];
};
export type IngredientColumn = keyof typeof INGREDIENT_COLUMNS;
export interface IngredientRow {
    line: number;
    name: string;
    unit: IngredientUnitValue;
    sku?: string;
    reorderLevel?: number;
    costPerUnit?: number;
    openingStock?: number;
    isActive?: boolean;
}
export declare const ingredientKey: (name: string) => string;
export declare function validateIngredients(csv: ParsedCsv): ValidatedImport<IngredientRow>;
