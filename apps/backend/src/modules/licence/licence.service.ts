// Licence activation.
//
// Flow (see docs/LICENCE.md for the human version): the host issues a
// key with `issue()` and hands the raw key to a restaurant (by email,
// invoice, whatever channel they already use). The restaurant pastes it
// into Settings → Licence and calls `activate()`. One licence is active
// per restaurant at a time; `deactivate()` releases it (e.g. moving to a
// new server) so the same key can be activated again elsewhere, while
// `revoke()` is the host's terminal kill-switch for a lost or abused key.
//
// What this is NOT: it does not change the app's licence. RestroOS stays
// AGPL-3.0 (see LICENSE); this module only records that a particular
// deployment was activated with a host-issued key. No commercial licence
// is needed: RestroOS is sold as a hosted service for multiple
// restaurants (source code and database stay with the host), and this is
// the per-restaurant activation for that hosted product — the host issues
// a key per restaurant and the restaurant activates it.
//
// Storage rules, following the IntegrationApiKey pattern: only the
// SHA-256 hash of a key is stored (`keyHash`, unique); the raw key is
// returned exactly once, by `issue()`, and never again. Reads return a
// masked summary (last four characters only). No key material is ever
// written to the audit log either.
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ActivateLicenceDto,
  IssueLicenceDto,
  LicenceSummary,
  SessionUser,
} from '@restroos/types';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  generateLicenceKey,
  hashLicenceKey,
  normalizeLicenceKey,
  validateLicenceKey,
} from './licence-key';

@Injectable()
export class LicenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toSummary(licence: {
    id: string;
    lastFour: string;
    plan: string;
    status: string;
    issuedTo: string | null;
    note: string | null;
    issuedAt: Date;
    expiresAt: Date | null;
    activatedAt: Date | null;
    instanceId: string | null;
    revokedAt: Date | null;
    restaurant: { id: string; name: string } | null;
  }): LicenceSummary {
    return {
      id: licence.id,
      lastFour: licence.lastFour,
      plan: licence.plan,
      status: licence.status as LicenceSummary['status'],
      issuedTo: licence.issuedTo,
      note: licence.note,
      issuedAt: licence.issuedAt.toISOString(),
      expiresAt: licence.expiresAt?.toISOString() ?? null,
      activatedAt: licence.activatedAt?.toISOString() ?? null,
      instanceId: licence.instanceId,
      revokedAt: licence.revokedAt?.toISOString() ?? null,
      restaurant: licence.restaurant,
    };
  }

  private readonly summaryInclude = {
    restaurant: { select: { id: true, name: true } },
  } as const;

  /**
   * Issues a new key. The raw key is returned once, in this response
   * only — the caller (the host) must pass it to the restaurant
   * themselves; it cannot be recovered afterwards. Gated to
   * settings.manage for now; issuing is a host-side action for the hosted
   * product, so a multi-tenant setup should restrict this endpoint (and
   * the issued-keys list) to host staff instead of restaurant admins.
   */
  async issue(actor: SessionUser, dto: IssueLicenceDto) {
    const raw = generateLicenceKey();
    const normalized = normalizeLicenceKey(raw);
    const licence = await this.prisma.licence.create({
      data: {
        keyHash: hashLicenceKey(normalized),
        lastFour: normalized.slice(-4),
        plan: dto.plan ?? 'STANDARD',
        issuedTo: dto.issuedTo ?? null,
        note: dto.note ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        issuedById: actor.id,
      },
      include: this.summaryInclude,
    });
    await this.audit.record({
      userId: actor.id,
      action: 'licence.issued',
      entity: 'Licence',
      entityId: licence.id,
      metadata: { plan: licence.plan, issuedTo: licence.issuedTo },
    });
    return { ...this.toSummary(licence), key: raw };
  }

  /** Every key this instance has issued, newest first (masked summaries). */
  async listIssued() {
    const licences = await this.prisma.licence.findMany({
      include: this.summaryInclude,
      orderBy: { issuedAt: 'desc' },
    });
    return licences.map((licence) => this.toSummary(licence));
  }

  /** The caller's restaurant's currently active licence, if any. */
  async getStatus(actor: SessionUser) {
    const licence = await this.prisma.licence.findFirst({
      where: { restaurantId: actor.restaurantId, status: 'ACTIVE' },
      include: this.summaryInclude,
    });
    return { active: licence ? this.toSummary(licence) : null };
  }

  /**
   * Activates a key for the caller's restaurant. A key activates at most
   * once at a time, and a restaurant holds at most one active licence —
   * deactivate the current one before activating another.
   */
  async activate(actor: SessionUser, dto: ActivateLicenceDto) {
    const normalized = normalizeLicenceKey(dto.key);
    const formatError = validateLicenceKey(normalized);
    if (formatError) throw new BadRequestException(formatError);

    const licence = await this.prisma.licence.findUnique({
      where: { keyHash: hashLicenceKey(normalized) },
      include: this.summaryInclude,
    });
    if (!licence) throw new NotFoundException('No licence was issued for that key');
    if (licence.status === 'REVOKED') {
      throw new BadRequestException('That licence key has been revoked');
    }
    if (
      licence.status === 'EXPIRED' ||
      (licence.expiresAt && licence.expiresAt.getTime() <= Date.now())
    ) {
      if (licence.status !== 'EXPIRED') {
        await this.prisma.licence.update({
          where: { id: licence.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new BadRequestException('That licence key has expired');
    }
    if (licence.status === 'ACTIVE') {
      throw new BadRequestException('That licence key is already activated');
    }

    const current = await this.prisma.licence.findFirst({
      where: { restaurantId: actor.restaurantId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (current) {
      throw new BadRequestException(
        'This restaurant already has an active licence — deactivate it before activating another key',
      );
    }

    const activated = await this.prisma.licence.update({
      where: { id: licence.id },
      data: {
        status: 'ACTIVE',
        restaurantId: actor.restaurantId,
        activatedAt: new Date(),
        activatedById: actor.id,
        instanceId: dto.instanceId ?? null,
      },
      include: this.summaryInclude,
    });
    await this.audit.record({
      userId: actor.id,
      action: 'licence.activated',
      entity: 'Licence',
      entityId: licence.id,
      metadata: { lastFour: licence.lastFour, plan: licence.plan },
    });
    return this.toSummary(activated);
  }

  /**
   * Releases the caller's active licence: it goes back to ISSUED with
   * the activation cleared, so the same key can be activated again —
   * on a new server, for example. This is not a revoke: the key stays
   * usable. Use `revoke()` to kill a key outright.
   */
  async deactivate(actor: SessionUser) {
    const licence = await this.prisma.licence.findFirst({
      where: { restaurantId: actor.restaurantId, status: 'ACTIVE' },
    });
    if (!licence) {
      throw new NotFoundException('This restaurant has no active licence');
    }
    await this.prisma.licence.update({
      where: { id: licence.id },
      data: {
        status: 'ISSUED',
        restaurantId: null,
        activatedAt: null,
        activatedById: null,
        instanceId: null,
      },
    });
    await this.audit.record({
      userId: actor.id,
      action: 'licence.deactivated',
      entity: 'Licence',
      entityId: licence.id,
      metadata: { lastFour: licence.lastFour, plan: licence.plan },
    });
    return { ok: true };
  }

  /** Terminal kill-switch for a key (issued or active). Cannot be undone. */
  async revoke(actor: SessionUser, id: string) {
    const licence = await this.prisma.licence.findUnique({ where: { id } });
    if (!licence) throw new NotFoundException('Licence not found');
    if (licence.status === 'REVOKED') return { ok: true };
    await this.prisma.licence.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        restaurantId: null,
        activatedAt: null,
        activatedById: null,
        instanceId: null,
      },
    });
    await this.audit.record({
      userId: actor.id,
      action: 'licence.revoked',
      entity: 'Licence',
      entityId: id,
      metadata: { lastFour: licence.lastFour, plan: licence.plan },
    });
    return { ok: true };
  }
}
