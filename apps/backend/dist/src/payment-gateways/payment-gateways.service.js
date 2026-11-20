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
var PaymentGatewaysService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentGatewaysService = void 0;
const common_1 = require("@nestjs/common");
const secret_box_1 = require("../integration-hub/secret-box");
const prisma_service_1 = require("../prisma/prisma.service");
const registry_1 = require("./adapters/registry");
const catalog_data_1 = require("./catalog-data");
const LIVE_PHRASE = 'ENABLE LIVE PAYMENTS';
const MAX_SHOWN = 5;
const credCtx = (rid, provider, mode) => `${rid}:gw:${provider}:${mode}`;
const credCol = (mode) => mode === 'TEST' ? 'testCredentialsEnc' : 'liveCredentialsEnc';
const keysCol = (mode) => mode === 'TEST' ? 'testKeys' : 'liveKeys';
let PaymentGatewaysService = PaymentGatewaysService_1 = class PaymentGatewaysService {
    prisma;
    logger = new common_1.Logger(PaymentGatewaysService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        try {
            for (const e of catalog_data_1.BUILTIN_CATALOG) {
                const data = {
                    name: e.name,
                    countries: e.countries,
                    integration: e.integration,
                    docsUrl: e.docsUrl,
                    adapter: e.adapter,
                    notes: e.notes ?? null,
                    sources: e.sources,
                    researchedAt: catalog_data_1.RESEARCHED_AT,
                };
                const existing = await this.prisma.paymentGatewayCatalogEntry.findFirst({
                    where: { restaurantId: null, key: e.key },
                });
                if (existing) {
                    await this.prisma.paymentGatewayCatalogEntry.update({
                        where: { id: existing.id },
                        data,
                    });
                }
                else {
                    await this.prisma.paymentGatewayCatalogEntry.create({
                        data: { ...data, key: e.key, active: e.active ?? true },
                    });
                }
            }
        }
        catch (e) {
            this.logger.warn(`Catalog seed skipped: ${e.message}`);
        }
    }
    describeAdapter(a) {
        if (!a)
            return null;
        return {
            fields: a.fields.map(({ validate: _v, ...f }) => f),
            requiresCustomerPhone: !!a.requiresCustomerPhone,
            limitations: a.limitations,
        };
    }
    async countries(restaurantId) {
        const rows = await this.prisma.paymentGatewayCatalogEntry.findMany({
            where: { active: true, OR: [{ restaurantId: null }, { restaurantId }] },
            select: { countries: true },
        });
        const set = new Set(rows.flatMap((r) => r.countries));
        return [...set].sort().map((code) => ({
            code,
            name: catalog_data_1.COUNTRY_NAMES[code] ?? code,
        }));
    }
    async catalog(restaurantId, country) {
        const code = country.toUpperCase();
        if (!/^[A-Z]{2}$/.test(code))
            throw new common_1.BadRequestException('Invalid country');
        const rows = await this.prisma.paymentGatewayCatalogEntry.findMany({
            where: {
                active: true,
                countries: { has: code },
                OR: [{ restaurantId: null }, { restaurantId }],
            },
            orderBy: [{ restaurantId: 'asc' }, { name: 'asc' }],
        });
        rows.sort((a, b) => Number(!!b.adapter) - Number(!!a.adapter));
        const conns = await this.prisma.paymentGatewayConnection.findMany({
            where: { restaurantId },
        });
        const byProvider = new Map(conns.map((c) => [c.provider, c]));
        return {
            country: code,
            researchedAt: catalog_data_1.RESEARCHED_AT,
            note: 'Provider availability, merchant approval, payment methods and settlement depend on the provider’s current rules and your merchant account. Choosing a country only filters this list; it does not decide where you may open an account.',
            providers: rows.slice(0, MAX_SHOWN).map((r) => {
                const adapter = (0, registry_1.getAdapter)(r.adapter);
                const c = byProvider.get(r.key);
                return {
                    key: r.key,
                    name: r.name,
                    integration: r.integration,
                    docsUrl: r.docsUrl,
                    notes: r.notes,
                    sources: r.sources,
                    custom: r.restaurantId !== null,
                    integrated: !!adapter,
                    ...(this.describeAdapter(adapter) ?? {
                        fields: [],
                        requiresCustomerPhone: false,
                        limitations: [],
                    }),
                    connection: c ? this.view(restaurantId, c, adapter) : null,
                };
            }),
            customProviderAllowed: true,
        };
    }
    async upsertCustomEntry(restaurantId, input) {
        const adapter = input.adapter ?? null;
        if (adapter && !(0, registry_1.getAdapter)(adapter)) {
            throw new common_1.BadRequestException('Unknown adapter');
        }
        const key = input.key.toLowerCase();
        const data = {
            name: input.name,
            countries: input.countries.map((c) => c.toUpperCase()),
            integration: input.integration ?? 'Custom provider',
            docsUrl: input.docsUrl,
            adapter,
            notes: input.notes ?? null,
            sources: [],
            researchedAt: null,
        };
        const existing = await this.prisma.paymentGatewayCatalogEntry.findFirst({
            where: { restaurantId, key },
        });
        return existing
            ? this.prisma.paymentGatewayCatalogEntry.update({
                where: { id: existing.id },
                data,
            })
            : this.prisma.paymentGatewayCatalogEntry.create({
                data: { ...data, key, restaurantId },
            });
    }
    async deleteCustomEntry(restaurantId, key) {
        const r = await this.prisma.paymentGatewayCatalogEntry.deleteMany({
            where: { restaurantId, key },
        });
        if (!r.count)
            throw new common_1.NotFoundException('Custom provider not found');
        return { ok: true };
    }
    adapterFor(entry) {
        const a = (0, registry_1.getAdapter)(entry.adapter);
        if (!a) {
            throw new common_1.BadRequestException(`${entry.name} is not integrated with OrderRestro yet, so credentials cannot be saved for it.`);
        }
        return a;
    }
    async entry(restaurantId, key) {
        const e = await this.prisma.paymentGatewayCatalogEntry.findFirst({
            where: {
                key,
                active: true,
                OR: [{ restaurantId }, { restaurantId: null }],
            },
            orderBy: { restaurantId: 'desc' },
        });
        if (!e)
            throw new common_1.NotFoundException('Unknown payment provider');
        return e;
    }
    complete(a, keys) {
        return a.fields
            .filter((f) => f.required)
            .every((f) => keys.includes(f.key));
    }
    view(restaurantId, c, a) {
        const base = `/api/v1/payment-gateways/webhook/${restaurantId}/${c.provider}`;
        return {
            provider: c.provider,
            country: c.country,
            enabled: c.enabled,
            mode: c.mode,
            liveConfirmedAt: c.liveConfirmedAt,
            testKeys: c.testKeys,
            liveKeys: c.liveKeys,
            testComplete: a ? this.complete(a, c.testKeys) : c.testKeys.length > 0,
            liveComplete: a ? this.complete(a, c.liveKeys) : c.liveKeys.length > 0,
            lastTestedAt: c.lastTestedAt,
            lastTestOk: c.lastTestOk,
            lastError: c.lastError,
            webhookPaths: { TEST: `${base}/TEST`, LIVE: `${base}/LIVE` },
        };
    }
    async connections(restaurantId) {
        const rows = await this.prisma.paymentGatewayConnection.findMany({
            where: { restaurantId },
        });
        return Promise.all(rows.map(async (c) => {
            const e = await this.entry(restaurantId, c.provider).catch(() => null);
            return this.view(restaurantId, c, (0, registry_1.getAdapter)(e?.adapter));
        }));
    }
    credentials(restaurantId, c, mode) {
        const enc = c[credCol(mode)];
        if (!enc)
            return {};
        try {
            return JSON.parse((0, secret_box_1.decryptSecret)(enc, credCtx(restaurantId, c.provider, mode)));
        }
        catch {
            throw new common_1.BadRequestException('Stored payment credentials could not be read (was the encryption key changed?). Re-enter them.');
        }
    }
    context(restaurantId, c, mode) {
        return { mode, credentials: this.credentials(restaurantId, c, mode) };
    }
    async saveCredentials(restaurantId, providerKey, input) {
        const entry = await this.entry(restaurantId, providerKey);
        const adapter = this.adapterFor(entry);
        const known = new Map(adapter.fields.map((f) => [f.key, f]));
        const errors = [];
        for (const [k, v] of Object.entries(input.credentials)) {
            const f = known.get(k);
            if (!f)
                throw new common_1.BadRequestException(`Unknown field "${k}"`);
            if (!v.trim())
                continue;
            const msg = f.validate?.(v.trim(), input.mode);
            if (msg)
                errors.push(`${f.label}: ${msg}`);
        }
        if (errors.length)
            throw new common_1.BadRequestException(errors.join(' '));
        const existing = await this.prisma.paymentGatewayConnection.findUnique({
            where: { restaurantId_provider: { restaurantId, provider: providerKey } },
        });
        const merged = existing
            ? this.credentials(restaurantId, existing, input.mode)
            : {};
        for (const [k, v] of Object.entries(input.credentials)) {
            if (v.trim())
                merged[k] = v.trim();
        }
        const enc = (0, secret_box_1.encryptSecret)(JSON.stringify(merged), credCtx(restaurantId, providerKey, input.mode));
        const keys = Object.keys(merged);
        const data = {
            country: input.country.toUpperCase(),
            [credCol(input.mode)]: enc,
            [keysCol(input.mode)]: keys,
            lastTestOk: null,
            lastError: null,
        };
        const row = await this.prisma.paymentGatewayConnection.upsert({
            where: { restaurantId_provider: { restaurantId, provider: providerKey } },
            create: {
                restaurantId,
                provider: providerKey,
                enabled: false,
                mode: 'TEST',
                ...data,
            },
            update: data,
        });
        return this.view(restaurantId, row, adapter);
    }
    async removeCredentials(restaurantId, providerKey, mode) {
        const entry = await this.entry(restaurantId, providerKey);
        const c = await this.require(restaurantId, providerKey);
        const wasActiveMode = c.mode === mode;
        const row = await this.prisma.paymentGatewayConnection.update({
            where: { id: c.id },
            data: {
                [credCol(mode)]: null,
                [keysCol(mode)]: [],
                ...(wasActiveMode ? { enabled: false } : {}),
                ...(mode === 'LIVE'
                    ? { mode: 'TEST', liveConfirmedAt: null, liveConfirmedById: null }
                    : {}),
                lastTestOk: null,
                lastError: null,
            },
        });
        return this.view(restaurantId, row, (0, registry_1.getAdapter)(entry.adapter));
    }
    async removeConnection(restaurantId, providerKey) {
        await this.prisma.paymentGatewayConnection.deleteMany({
            where: { restaurantId, provider: providerKey },
        });
        return { ok: true };
    }
    async require(restaurantId, providerKey) {
        const c = await this.prisma.paymentGatewayConnection.findUnique({
            where: { restaurantId_provider: { restaurantId, provider: providerKey } },
        });
        if (!c)
            throw new common_1.NotFoundException('This gateway is not set up yet');
        return c;
    }
    async test(restaurantId, providerKey, mode) {
        const entry = await this.entry(restaurantId, providerKey);
        const adapter = this.adapterFor(entry);
        const c = await this.require(restaurantId, providerKey);
        const m = mode ?? c.mode;
        if (!this.complete(adapter, m === 'TEST' ? c.testKeys : c.liveKeys)) {
            throw new common_1.BadRequestException(`Enter all required ${m === 'TEST' ? 'Test' : 'Live'} credentials first`);
        }
        const out = await adapter.testConnection(this.context(restaurantId, c, m));
        await this.prisma.paymentGatewayConnection.update({
            where: { id: c.id },
            data: {
                lastTestedAt: new Date(),
                lastTestOk: out.ok,
                lastError: out.ok ? null : out.message.slice(0, 300),
            },
        });
        return { ok: out.ok, mode: m, message: out.message };
    }
    async setMode(restaurantId, userId, providerKey, mode, confirm) {
        const entry = await this.entry(restaurantId, providerKey);
        const adapter = this.adapterFor(entry);
        const c = await this.require(restaurantId, providerKey);
        if (mode === 'LIVE') {
            if (!this.complete(adapter, c.liveKeys)) {
                throw new common_1.BadRequestException('Enter all Live credentials before switching to Live mode');
            }
            if (confirm !== LIVE_PHRASE) {
                throw new common_1.BadRequestException(`Type "${LIVE_PHRASE}" to confirm. Live mode charges real money.`);
            }
            const out = await adapter.testConnection(this.context(restaurantId, c, 'LIVE'));
            if (!out.ok) {
                throw new common_1.BadRequestException(`Live credentials were not accepted: ${out.message}`);
            }
        }
        const row = await this.prisma.paymentGatewayConnection.update({
            where: { id: c.id },
            data: mode === 'LIVE'
                ? { mode, liveConfirmedAt: new Date(), liveConfirmedById: userId }
                : { mode },
        });
        return this.view(restaurantId, row, adapter);
    }
    async setEnabled(restaurantId, providerKey, enabled) {
        const entry = await this.entry(restaurantId, providerKey);
        const adapter = this.adapterFor(entry);
        const c = await this.require(restaurantId, providerKey);
        if (enabled) {
            const keys = c.mode === 'TEST' ? c.testKeys : c.liveKeys;
            if (!this.complete(adapter, keys)) {
                throw new common_1.BadRequestException(`Enter all required ${c.mode === 'TEST' ? 'Test' : 'Live'} credentials first`);
            }
            await this.prisma.paymentGatewayConnection.updateMany({
                where: { restaurantId, NOT: { id: c.id } },
                data: { enabled: false },
            });
        }
        const row = await this.prisma.paymentGatewayConnection.update({
            where: { id: c.id },
            data: { enabled },
        });
        return this.view(restaurantId, row, adapter);
    }
    async active(restaurantId) {
        const c = await this.prisma.paymentGatewayConnection.findFirst({
            where: { restaurantId, enabled: true },
        });
        if (!c)
            return null;
        const entry = await this.entry(restaurantId, c.provider);
        const adapter = (0, registry_1.getAdapter)(entry.adapter);
        return adapter ? { connection: c, adapter } : null;
    }
    adaptersAvailable() {
        return (0, registry_1.listAdapters)().map((a) => ({ key: a.key, name: a.name }));
    }
};
exports.PaymentGatewaysService = PaymentGatewaysService;
exports.PaymentGatewaysService = PaymentGatewaysService = PaymentGatewaysService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentGatewaysService);
//# sourceMappingURL=payment-gateways.service.js.map