"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceOf = exports.getProvider = exports.listProviders = void 0;
exports.supports = supports;
const webhook_order_provider_1 = require("./webhook-order.provider");
const NOTE = 'Zomato and Swiggy do not offer a public order API. They deliver orders through the merchant webhook / an aggregator (UrbanPiper, Petpooja, Dotpe and similar) that your restaurant has an account with. Point it at the webhook URL below and sign requests with the secret.';
const PROVIDERS = [
    new webhook_order_provider_1.WebhookOrderProvider('zomato', 'Zomato', 'Receive Zomato orders as online orders needing acceptance - via your merchant webhook or an aggregator.', NOTE, 'zomato', 'Zomato restaurant ID (optional)'),
    new webhook_order_provider_1.WebhookOrderProvider('swiggy', 'Swiggy', 'Receive Swiggy orders as online orders needing acceptance - via your merchant webhook or an aggregator.', NOTE, 'swiggy', 'Swiggy outlet ID (optional)'),
    new webhook_order_provider_1.WebhookOrderProvider('aggregator', 'Aggregator (UrbanPiper, Petpooja, other)', 'One webhook for any aggregator or channel manager that forwards Zomato, Swiggy and other delivery orders.', NOTE, 'aggregator'),
];
const BY_KEY = new Map(PROVIDERS.map((p) => [p.key, p]));
const listProviders = () => PROVIDERS;
exports.listProviders = listProviders;
const getProvider = (key) => BY_KEY.get(key);
exports.getProvider = getProvider;
const sourceOf = (provider) => provider instanceof webhook_order_provider_1.WebhookOrderProvider ? provider.source : provider.key;
exports.sourceOf = sourceOf;
function supports(provider, op) {
    return provider.capabilities[op] === true;
}
//# sourceMappingURL=registry.js.map