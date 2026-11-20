"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PushService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const prisma_service_1 = require("../prisma/prisma.service");
const b64url = (b) => Buffer.from(b).toString('base64url');
let PushService = PushService_1 = class PushService {
    prisma;
    log = new common_1.Logger(PushService_1.name);
    account;
    cached = null;
    constructor(prisma) {
        this.prisma = prisma;
    }
    load() {
        if (this.account !== undefined)
            return this.account;
        try {
            const raw = process.env.FCM_SERVICE_ACCOUNT_JSON ??
                (process.env.FCM_SERVICE_ACCOUNT_FILE
                    ? (0, node_fs_1.readFileSync)(process.env.FCM_SERVICE_ACCOUNT_FILE, 'utf8')
                    : '');
            this.account = raw ? JSON.parse(raw) : null;
        }
        catch (e) {
            this.log.warn(`Push is off: bad FCM service account (${e.message})`);
            this.account = null;
        }
        return this.account;
    }
    get enabled() {
        return this.load() !== null;
    }
    async accessToken(acct) {
        if (this.cached && this.cached.expires > Date.now() + 60_000)
            return this.cached.token;
        const now = Math.floor(Date.now() / 1000);
        const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
        const claim = b64url(JSON.stringify({
            iss: acct.client_email,
            scope: 'https://www.googleapis.com/auth/firebase.messaging',
            aud: 'https://oauth2.googleapis.com/token',
            iat: now,
            exp: now + 3600,
        }));
        const sig = (0, node_crypto_1.createSign)('RSA-SHA256').update(`${header}.${claim}`).sign(acct.private_key);
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: `${header}.${claim}.${b64url(sig)}`,
            }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok)
            throw new Error(`token ${res.status}`);
        const j = (await res.json());
        this.cached = { token: j.access_token, expires: Date.now() + j.expires_in * 1000 };
        return j.access_token;
    }
    sendToUsers(userIds, msg) {
        if (userIds.length === 0 || !this.enabled)
            return;
        void this.deliver(userIds, msg).catch((e) => this.log.warn(`Push failed: ${e.message}`));
    }
    async deliver(userIds, msg) {
        const acct = this.load();
        if (!acct)
            return;
        const devices = await this.prisma.deviceToken.findMany({
            where: { userId: { in: userIds } },
            select: { token: true },
        });
        if (devices.length === 0)
            return;
        const bearer = await this.accessToken(acct);
        const url = `https://fcm.googleapis.com/v1/projects/${acct.project_id}/messages:send`;
        for (const d of devices) {
            const res = await fetch(url, {
                method: 'POST',
                headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: {
                        token: d.token,
                        notification: { title: msg.title, body: msg.body },
                        data: { ...(msg.data ?? {}), ...(msg.path ? { path: msg.path } : {}) },
                        android: { priority: 'HIGH', notification: { channel_id: 'orders', sound: 'default' } },
                        apns: { payload: { aps: { sound: 'default' } } },
                    },
                }),
                signal: AbortSignal.timeout(10_000),
            });
            if (res.status === 404 || res.status === 400) {
                const text = await res.text();
                if (/UNREGISTERED|INVALID_ARGUMENT/.test(text)) {
                    await this.prisma.deviceToken.deleteMany({ where: { token: d.token } });
                }
            }
        }
    }
};
exports.PushService = PushService;
exports.PushService = PushService = PushService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PushService);
//# sourceMappingURL=push.service.js.map