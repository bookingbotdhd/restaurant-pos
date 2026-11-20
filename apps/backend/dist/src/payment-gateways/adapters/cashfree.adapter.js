"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashfreeAdapter = void 0;
exports.cashfreeIdempotencyKey = cashfreeIdempotencyKey;
exports.extractLinkId = extractLinkId;
const crypto_1 = require("crypto");
const adapter_1 = require("./adapter");
const http_1 = require("./http");
const money_1 = require("../money");
const signature_1 = require("./signature");
const API_VERSION = '2026-01-01';
const base = (c) => c.mode === 'TEST'
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg';
const headers = (c, extra = {}) => ({
    'x-api-version': API_VERSION,
    'x-client-id': c.credentials.clientId,
    'x-client-secret': c.credentials.clientSecret,
    ...extra,
});
exports.cashfreeAdapter = {
    key: 'cashfree',
    name: 'Cashfree Payments',
    docsUrl: 'https://www.cashfree.com/docs/api-reference/payments/latest/payment-links/create-payment-link',
    integration: 'Cashfree-hosted Payment Link (UPI, cards, netbanking, wallets)',
    requiresCustomerPhone: true,
    limitations: [
        'Cashfree requires the payer phone number to create a link.',
        "Webhook body parsing follows Cashfree's documented schema but has not been exercised against a live Cashfree account; the payment is always confirmed by a server-side status lookup, and the return page also triggers that lookup.",
        'Refunds are made in the Cashfree dashboard; OrderRestro cannot send them (the link-order refund API was not verified).',
    ],
    fields: [
        {
            key: 'clientId',
            label: 'App ID (client ID)',
            secret: false,
            required: true,
            help: 'Cashfree dashboard → Developers → API keys. Use the Test (sandbox) keys in Test mode.',
        },
        {
            key: 'clientSecret',
            label: 'Secret key',
            secret: true,
            required: true,
            help: 'Also used to verify webhook signatures.',
        },
    ],
    async testConnection(ctx) {
        try {
            await (0, http_1.gatewayFetch)(`${base(ctx)}/links/orderrestro-connection-check`, {
                headers: headers(ctx),
            });
            return { ok: true, message: 'Cashfree accepted the credentials.' };
        }
        catch (e) {
            const status = e.status;
            if (status === 404) {
                return { ok: true, message: 'Cashfree accepted the credentials.' };
            }
            return { ok: false, message: e.message };
        }
    },
    async createPayment(ctx, i) {
        if (!i.customer?.phone) {
            throw new adapter_1.GatewayError('Cashfree needs the customer phone number');
        }
        const r = await (0, http_1.gatewayFetch)(`${base(ctx)}/links`, {
            method: 'POST',
            headers: headers(ctx, {
                'Content-Type': 'application/json',
                'x-idempotency-key': cashfreeIdempotencyKey(i.reference),
            }),
            body: JSON.stringify({
                link_id: i.reference,
                link_amount: (0, money_1.fromMinor)(i.amountMinor, i.currency),
                link_currency: i.currency.toUpperCase(),
                link_purpose: i.description.slice(0, 500),
                link_partial_payments: false,
                customer_details: {
                    customer_phone: i.customer.phone,
                    ...(i.customer.name ? { customer_name: i.customer.name } : {}),
                    ...(i.customer.email ? { customer_email: i.customer.email } : {}),
                },
                link_notify: { send_sms: false, send_email: false },
                link_meta: { return_url: i.returnUrl, notify_url: i.notifyUrl },
            }),
        });
        if (!r.link_url)
            throw new adapter_1.GatewayError('Cashfree returned no payment link');
        return { providerRef: r.link_id ?? i.reference, checkoutUrl: r.link_url };
    },
    async fetchStatus(ctx, providerRef) {
        const l = await (0, http_1.gatewayFetch)(`${base(ctx)}/links/${encodeURIComponent(providerRef)}`, { headers: headers(ctx) });
        const requested = (0, money_1.toMinor)(l.link_amount, l.link_currency);
        const paid = (0, money_1.toMinor)(l.link_amount_paid ?? 0, l.link_currency);
        const status = l.link_status.toUpperCase();
        return {
            state: status === 'PAID'
                ? 'PAID'
                : status === 'EXPIRED' || status === 'CANCELLED'
                    ? 'EXPIRED'
                    : 'PENDING',
            paidMinor: paid,
            requestedMinor: requested,
            currency: l.link_currency.toUpperCase(),
            reference: l.link_id,
            providerPaymentId: null,
        };
    },
    verifyWebhook(ctx, hdrs, rawBody) {
        const secret = ctx.credentials.clientSecret;
        const sig = hdrs['x-webhook-signature'];
        const ts = hdrs['x-webhook-timestamp'];
        if (!secret || !sig || !ts)
            throw new adapter_1.GatewayError('Missing webhook signature');
        if (!(0, signature_1.safeEqual)(sig, (0, signature_1.hmacBase64)(secret, ts + rawBody))) {
            throw new adapter_1.GatewayError('Webhook signature mismatch');
        }
        return {
            eventId: (0, crypto_1.createHash)('sha256')
                .update(ts + rawBody)
                .digest('hex'),
            providerRef: extractLinkId(rawBody),
        };
    },
};
function cashfreeIdempotencyKey(reference) {
    const h = (0, crypto_1.createHash)('sha256').update(reference).digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
function extractLinkId(raw) {
    const dig = (o) => {
        if (!o || typeof o !== 'object')
            return null;
        const rec = o;
        if (typeof rec.link_id === 'string')
            return rec.link_id;
        for (const v of Object.values(rec)) {
            const f = dig(v);
            if (f)
                return f;
        }
        return null;
    };
    try {
        return dig(JSON.parse(raw));
    }
    catch {
    }
    const form = new URLSearchParams(raw);
    const direct = form.get('link_id');
    if (direct)
        return direct;
    for (const v of form.values()) {
        try {
            const f = dig(JSON.parse(v));
            if (f)
                return f;
        }
        catch {
        }
    }
    return null;
}
//# sourceMappingURL=cashfree.adapter.js.map