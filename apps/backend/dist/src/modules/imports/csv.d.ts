export declare class CsvError extends Error {
}
export interface ParsedCsv {
    delimiter: ',' | ';' | '\t';
    headers: string[];
    rows: {
        line: number;
        cells: string[];
        overflow: boolean;
        longer: boolean;
    }[];
}
export declare function parseCsv(input: string): ParsedCsv;
export declare function csvCell(value: string | number | boolean | null | undefined): string;
export declare function toCsv(rows: (string | number | boolean | null | undefined)[][]): string;
export declare function looksLikeFormula(value: string): boolean;
