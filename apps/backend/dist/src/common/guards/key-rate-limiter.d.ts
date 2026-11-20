export declare class KeyRateLimiter {
    private readonly windowMs;
    private readonly windows;
    constructor(windowMs?: number);
    hit(bucket: string, limit: number, now?: number): number;
    private sweep;
}
export declare function envLimit(name: string, fallback: number): number;
