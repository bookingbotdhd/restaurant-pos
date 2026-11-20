export type Parsed<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: string;
};
export declare const headerKey: (h: string) => string;
export declare function parseText(raw: string, label: string, max: number): Parsed<string | undefined>;
export declare function parseNumber(raw: string, label: string, opts?: {
    min?: number;
    max?: number;
    integer?: boolean;
}): Parsed<number | undefined>;
export declare function parseBool(raw: string, label: string): Parsed<boolean | undefined>;
export declare function parseEnum<T extends string>(raw: string, label: string, allowed: readonly T[], aliases?: Record<string, T>): Parsed<T | undefined>;
export declare function parseTime(raw: string, label: string): Parsed<string | undefined>;
export declare function parseList(raw: string, label: string): Parsed<string[] | undefined>;
