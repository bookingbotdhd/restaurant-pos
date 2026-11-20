"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookOrderProvider = void 0;
const provider_1 = require("./provider");
class WebhookOrderProvider {
    key;
    name;
    description;
    requirements;
    source;
    accountIdLabel;
    category = 'FOOD_DELIVERY';
    capabilities = {
        ...provider_1.NO_CAPABILITIES,
        receiveOrders: true,
        webhooks: true,
    };
    accountIdOptional = true;
    credentialFields = [
        {
            key: 'webhookSecret',
            label: 'Webhook signing secret',
            secret: true,
            required: true,
            help: 'Any long random string (16+ characters). Paste the same value into the aggregator / merchant webhook settings; it signs every order.',
        },
    ];
    constructor(key, name, description, requirements, source, accountIdLabel) {
        this.key = key;
        this.name = name;
        this.description = description;
        this.requirements = requirements;
        this.source = source;
        this.accountIdLabel = accountIdLabel;
    }
    testConnection() {
        return Promise.resolve({
            ok: false,
            status: 'PENDING_CONFIGURATION',
            message: `Secret saved. Waiting for the first signed delivery from ${this.name}: send a test order or a "ping" event from the aggregator, and this turns Connected when it arrives.`,
        });
    }
}
exports.WebhookOrderProvider = WebhookOrderProvider;
//# sourceMappingURL=webhook-order.provider.js.map