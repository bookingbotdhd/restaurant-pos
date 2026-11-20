"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyRateLimiter = void 0;
exports.envLimit = envLimit;
class KeyRateLimiter {
    windowMs;
    windows = new Map();
    constructor(windowMs = 60_000) {
        this.windowMs = windowMs;
    }
    hit(bucket, limit, now = Date.now()) {
        if (this.windows.size > 5_000)
            this.sweep(now);
        const w = this.windows.get(bucket);
        if (!w || now - w.start >= this.windowMs) {
            this.windows.set(bucket, { start: now, count: 1 });
            return 0;
        }
        w.count += 1;
        return w.count > limit
            ? Math.max(1, Math.ceil((w.start + this.windowMs - now) / 1000))
            : 0;
    }
    sweep(now) {
        for (const [k, w] of this.windows) {
            if (now - w.start >= this.windowMs)
                this.windows.delete(k);
        }
    }
}
exports.KeyRateLimiter = KeyRateLimiter;
function envLimit(name, fallback) {
    const n = Number(process.env[name]);
    return Number.isInteger(n) && n > 0 ? n : fallback;
}
//# sourceMappingURL=key-rate-limiter.js.map