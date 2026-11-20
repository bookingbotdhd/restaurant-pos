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
var IntegrationHubService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationHubService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const registry_1 = require("./providers/registry");
const secret_box_1 = require("./secret-box");
const ctxKey = (restaurantId, provider) => `${restaurantId}:${provider}`;
let IntegrationHubService = IntegrationHubService_1 = class IntegrationHubService {
    prisma;
    logger = new common_1.Logger(IntegrationHubService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    provider(key) {
        const p = (0, registry_1.getProvider)(key);
        if (!p)
            throw new common_1.NotFoundException('Unknown integration');
        return p;
    }
    view(c) {
        if (!c)
            return null;
        const keys = c.config
            ?.credentialKeys;
        return {
            id: c.id,
            enabled: c.enabled,
            status: c.status,
            externalAccountId: c.externalAccountId,
            credentialsSet: Object.fromEntries((keys ?? []).map((k) => [k, true])),
            lastSyncAt: c.lastSyncAt,
            lastSuccessAt: c.lastSuccessAt,
            lastError: c.lastError,
            updatedAt: c.updatedAt,
        };
    }
    async list(restaurantId) {
        const rows = await this.prisma.integrationConnection.findMany({
            where: { restaurantId },
        });
        const byProvider = new Map(rows.map((r) => [r.provider, r]));
        return (0, registry_1.listProviders)().map((p) => ({
            key: p.key,
            name: p.name,
            category: p.category,
            description: p.description,
            capabilities: p.capabilities,
            accountIdLabel: p.accountIdLabel ?? null,
            webhookPath: p.capabilities.webhooks
                ? `/api/v1/integration-hub/webhook/${restaurantId}/${p.key}`
                : null,
            requirements: p.requirements ?? null,
            credentialFields: p.credentialFields,
            connection: this.view(byProvider.get(p.key) ?? null),
        }));
    }
    async log(connectionId, level, event, message) {
        await this.prisma.integrationLog.create({
            data: { connectionId, level, event, message: message.slice(0, 500) },
        });
    }
    async require(restaurantId, providerKey) {
        this.provider(providerKey);
        const c = await this.prisma.integrationConnection.findUnique({
            where: { restaurantId_provider: { restaurantId, provider: providerKey } },
        });
        if (!c)
            throw new common_1.NotFoundException('This integration is not set up yet');
        return c;
    }
    async connect(restaurantId, userId, providerKey, input) {
        const provider = this.provider(providerKey);
        const known = new Set(provider.credentialFields.map((f) => f.key));
        for (const k of Object.keys(input.credentials)) {
            if (!known.has(k)) {
                throw new common_1.BadRequestException(`Unknown credential field "${k}"`);
            }
        }
        const existing = await this.prisma.integrationConnection.findUnique({
            where: { restaurantId_provider: { restaurantId, provider: providerKey } },
        });
        let merged = {};
        if (existing?.credentialsEnc) {
            try {
                merged = JSON.parse((0, secret_box_1.decryptSecret)(existing.credentialsEnc, ctxKey(restaurantId, providerKey)));
            }
            catch {
                merged = {};
            }
        }
        for (const [k, v] of Object.entries(input.credentials)) {
            if (v.trim() === '')
                delete merged[k];
            else
                merged[k] = v.trim();
        }
        if (merged.webhookSecret && merged.webhookSecret.length < 16) {
            throw new common_1.BadRequestException('The webhook signing secret must be at least 16 characters');
        }
        const missing = provider.credentialFields
            .filter((f) => f.required && !merged[f.key])
            .map((f) => f.label);
        if (missing.length) {
            throw new common_1.BadRequestException(`Enter: ${missing.join(', ')}`);
        }
        const accountId = input.externalAccountId?.trim() || existing?.externalAccountId || null;
        if (provider.accountIdLabel && !provider.accountIdOptional && !accountId) {
            throw new common_1.BadRequestException(`Enter the ${provider.accountIdLabel}`);
        }
        const data = {
            externalAccountId: accountId,
            credentialsEnc: (0, secret_box_1.encryptSecret)(JSON.stringify(merged), ctxKey(restaurantId, providerKey)),
            config: { credentialKeys: Object.keys(merged) },
            status: existing?.enabled === false
                ? 'DISABLED'
                : 'PENDING_CONFIGURATION',
            lastError: null,
        };
        const row = existing
            ? await this.prisma.integrationConnection.update({
                where: { id: existing.id },
                data,
            })
            : await this.prisma.integrationConnection.create({
                data: {
                    ...data,
                    restaurantId,
                    provider: providerKey,
                    createdById: userId,
                },
            });
        await this.log(row.id, 'INFO', 'credentials_saved', 'Credentials saved');
        return this.view(row);
    }
    async setEnabled(restaurantId, providerKey, enabled) {
        const c = await this.require(restaurantId, providerKey);
        const row = await this.prisma.integrationConnection.update({
            where: { id: c.id },
            data: {
                enabled,
                status: enabled ? 'PENDING_CONFIGURATION' : 'DISABLED',
            },
        });
        await this.log(c.id, 'INFO', enabled ? 'enabled' : 'disabled', enabled ? 'Enabled - run a connection test' : 'Disabled');
        return this.view(row);
    }
    async test(restaurantId, providerKey) {
        const provider = this.provider(providerKey);
        const c = await this.require(restaurantId, providerKey);
        if (!c.enabled) {
            throw new common_1.BadRequestException('Enable this integration before testing it');
        }
        let credentials;
        try {
            credentials = JSON.parse((0, secret_box_1.decryptSecret)(c.credentialsEnc ?? '', ctxKey(restaurantId, providerKey)));
        }
        catch {
            const msg = 'The saved credentials can no longer be read (the server key changed). Enter them again.';
            await this.prisma.integrationConnection.update({
                where: { id: c.id },
                data: {
                    status: 'AUTH_EXPIRED',
                    lastError: msg,
                    lastSyncAt: new Date(),
                },
            });
            await this.log(c.id, 'ERROR', 'test', msg);
            throw new common_1.BadRequestException(msg);
        }
        let result;
        try {
            result = await provider.testConnection({
                restaurantId,
                externalAccountId: c.externalAccountId,
                credentials,
            });
        }
        catch (e) {
            this.logger.warn(`${providerKey} test threw: ${e.message}`);
            result = {
                ok: false,
                status: 'SYNC_ERROR',
                message: 'The connection test failed unexpectedly.',
            };
        }
        const now = new Date();
        const row = await this.prisma.integrationConnection.update({
            where: { id: c.id },
            data: {
                status: result.status,
                lastSyncAt: now,
                ...(result.ok
                    ? { lastSuccessAt: now, lastError: null }
                    : { lastError: result.message }),
            },
        });
        await this.log(c.id, result.ok ? 'INFO' : 'WARN', 'test', result.message);
        return {
            ok: result.ok,
            message: result.message,
            connection: this.view(row),
        };
    }
    async disconnect(restaurantId, providerKey) {
        const c = await this.require(restaurantId, providerKey);
        await this.prisma.integrationConnection.delete({ where: { id: c.id } });
        return { ok: true };
    }
    async logs(restaurantId, providerKey) {
        const c = await this.require(restaurantId, providerKey);
        return this.prisma.integrationLog.findMany({
            where: { connectionId: c.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                level: true,
                event: true,
                message: true,
                createdAt: true,
            },
        });
    }
};
exports.IntegrationHubService = IntegrationHubService;
exports.IntegrationHubService = IntegrationHubService = IntegrationHubService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IntegrationHubService);
//# sourceMappingURL=integration-hub.service.js.map