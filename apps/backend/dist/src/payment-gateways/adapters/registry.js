"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAdapters = exports.getAdapter = void 0;
const cashfree_adapter_1 = require("./cashfree.adapter");
const razorpay_adapter_1 = require("./razorpay.adapter");
const stripe_adapter_1 = require("./stripe.adapter");
const ADAPTERS = [
    razorpay_adapter_1.razorpayAdapter,
    stripe_adapter_1.stripeAdapter,
    cashfree_adapter_1.cashfreeAdapter,
];
const BY_KEY = new Map(ADAPTERS.map((a) => [a.key, a]));
const getAdapter = (key) => key ? (BY_KEY.get(key) ?? null) : null;
exports.getAdapter = getAdapter;
const listAdapters = () => ADAPTERS;
exports.listAdapters = listAdapters;
//# sourceMappingURL=registry.js.map