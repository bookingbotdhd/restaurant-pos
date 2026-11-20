"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatewayFetch = gatewayFetch;
exports.basicAuth = basicAuth;
const adapter_1 = require("./adapter");
async function gatewayFetch(url, opts = {}) {
    let res;
    try {
        res = await fetch(url, {
            method: opts.method ?? 'GET',
            headers: opts.headers,
            body: opts.body,
            redirect: 'error',
            signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
        });
    }
    catch {
        throw new adapter_1.GatewayError('The payment provider could not be reached');
    }
    const text = await res.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    }
    catch {
        json = null;
    }
    if (!res.ok) {
        throw new adapter_1.GatewayError(providerMessage(json) ?? `The provider answered HTTP ${res.status}`, res.status);
    }
    return json;
}
function providerMessage(json) {
    const j = (json ?? {});
    const m = j.error?.description ??
        j.error?.message ??
        j.message;
    return typeof m === 'string' ? m.slice(0, 200) : null;
}
function basicAuth(user, pass) {
    return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}
//# sourceMappingURL=http.js.map