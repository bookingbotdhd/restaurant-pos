export declare const TOP_WIDGETS: readonly ["kpis", "attention", "charts"];
export declare const CARD_WIDGETS: readonly ["tables", "kitchen", "recent", "channels"];
export declare const TREND_DAYS: readonly [7, 14, 30, 90];
export interface DashboardPrefs {
    topOrder: string[];
    cardOrder: string[];
    hidden: string[];
    trendDays: number;
}
export declare const DEFAULT_PREFS: DashboardPrefs;
export declare function sanitizePrefs(raw: unknown): DashboardPrefs;
