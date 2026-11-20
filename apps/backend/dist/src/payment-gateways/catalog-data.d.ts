export interface CatalogSeed {
    key: string;
    name: string;
    countries: string[];
    integration: string;
    docsUrl: string;
    adapter: string | null;
    notes?: string;
    sources: string[];
    active?: boolean;
}
export declare const RESEARCHED_AT = "2026-11-05";
export declare const BUILTIN_CATALOG: CatalogSeed[];
export declare const COUNTRY_NAMES: Record<string, string>;
