"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayAdapter = void 0;
const crypto_1 = require("crypto");
const adapter_1 = require("./adapter");
const http_1 = require("./http");
const signature_1 = require("./signature");
const API = 'https://api.razorpay.com';
const auth = (c) => (0, http_1.basicAuth)(c.credentials.keyId, c.credentials.keySecret);
exports.razorpayAdapter = {
    key: 'razorpay',
    name: 'Razorpay',
    docsUrl: 'https://razorpay.com/docs/api/payments/payment-links/create-standard',
    integration: 'Razorpay-hosted Payment Link (UPI, cards, netbanking, wallets)',
    limitations: [
        'Refunds go back to the original payment method through the Razorpay API (Live payments only). Razorpay has no idempotency key, so a refund request is never retried automatically.',
        'Partial payments are disabled on the links this app creates.',
    ],
    fields: [
        {
            key: 'keyId',
            label: 'Key ID',
            secret: false,
            required: true,
            help: 'Dashboard → Account & Settings → API keys. Starts with rzp_test_ or rzp_live_.',
            validate: (v, mode) => v.startsWith(mode === 'TEST' ? 'rzp_test_' : 'rzp_live_')
                ? null
                : `This is not a ${mode === 'TEST' ? 'test' : 'live'}-mode key id`,
        },
        {
            key: 'keySecret',
            label: 'Key Secret',
            secret: true,
            required: true,
            help: 'Shown once when the key is generated.',
        },
        {
            key: 'webhookSecret',
            label: 'Webhook secret',
            secret: true,
            required: true,
            help: 'Set when you add the webhook. Subscribe to payment_link.paid, payment_link.partially_paid, payment_link.expired and payment_link.cancelled.',
        },
    ],
    async testConnection(ctx) {
        try {
            await (0, http_1.gatewayFetch)(`${API}/v1/payment_links?count=1`, {
                headers: { Authorization: auth(ctx) },
            });
            return { ok: true, message: 'Razorpay accepted the API keys.' };
        }
        catch (e) {
            return { ok: false, message: e.message };
        }
    },
    async createPayment(ctx, i) {
        const r = await (0, http_1.gatewayFetch)(`${API}/v1/payment_links`, {
            method: 'POST',
            headers: {
                Authorization: auth(ctx),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: i.amountMinor,
                currency: i.currency.toUpperCase(),
                accept_partial: false,
                reference_id: i.reference,
                description: i.description.slice(0, 2000),
                callback_url: i.returnUrl,
                callback_method: 'get',
                reminder_enable: false,
                notify: { sms: false, email: false },
                notes: { gatewayPaymentId: i.reference },
            }),
        });
        if (!r.id || !r.short_url)
            throw new adapter_1.GatewayError('Razorpay returned no payment link');
        return { providerRef: r.id, checkoutUrl: r.short_url };
    },
    async fetchStatus(ctx, providerRef) {
        const l = await (0, http_1.gatewayFetch)(`${API}/v1/payment_links/${encodeURIComponent(providerRef)}`, { headers: { Authorization: auth(ctx) } });
        const state = l.status === 'paid'
            ? 'PAID'
            : l.status === 'expired' || l.status === 'cancelled'
                ? 'EXPIRED'
                : 'PENDING';
        return {
            state,
            paidMinor: l.amount_paid ?? 0,
            requestedMinor: l.amount,
            currency: (l.currency ?? '').toUpperCase(),
            reference: l.reference_id ?? null,
            providerPaymentId: l.payments?.find((p) => p.payment_id)?.payment_id ?? null,
        };
    },
    async refund(ctx, i) {
        const r = await (0, http_1.gatewayFetch)(`${API}/v1/payments/${encodeURIComponent(i.providerPaymentId)}/refund`, {
            method: 'POST',
            headers: {
                Authorization: auth(ctx),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: i.amountMinor,
                speed: 'normal',
                receipt: i.reference,
                notes: { gatewayRefundId: i.reference },
            }),
        });
        if (r.status === 'failed') {
            throw new adapter_1.GatewayError('Razorpay could not refund this payment', 400);
        }
        return {
            providerRefundId: r.id,
            state: r.status === 'processed' ? 'DONE' : 'PENDING',
        };
    },
    verifyWebhook(ctx, headers, rawBody) {
        const secret = ctx.credentials.webhookSecret;
        const sig = headers['x-razorpay-signature'];
        if (!secret || !sig)
            throw new adapter_1.GatewayError('Missing webhook signature');
        if (!(0, signature_1.safeEqual)(sig, (0, signature_1.hmacHex)(secret, rawBody))) {
            throw new adapter_1.GatewayError('Webhook signature mismatch');
        }
        const ev = JSON.parse(rawBody);
        return {
            eventId: headers['x-razorpay-event-id'] ??
                (0, crypto_1.createHash)('sha256').update(rawBody).digest('hex'),
            providerRef: ev.event?.startsWith('payment_link.')
                ? (ev.payload?.payment_link?.entity?.id ?? null)
                : null,
        };
    },
};
//# sourceMappingURL=razorpay.adapter.js.map