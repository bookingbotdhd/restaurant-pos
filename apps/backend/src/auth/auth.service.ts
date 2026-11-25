import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_ROLE_PERMISSIONS,
  MANAGER_ROLES,
  PERMISSIONS,
  STAFF_ROLES,
  type LoginDto,
  type ManagerPinApproval,
  type PinLoginDto,
  type RegisterDto,
  type SessionUser,
  type VerifyManagerPinDto,
} from '@restroos/types';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { TwoFactorService } from './two-factor.service';
import {
  effectivePermissions,
  permissionInclude,
  type PermissionSource,
} from './effective-permissions';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly twoFactor: TwoFactorService,
    private readonly audit: AuditService,
  ) {}

  private toSessionUser(user: {
    id: string;
    restaurantId: string;
    name: string;
    roleId: string;
    role: { name: string; permissions: { permission: { key: string } }[] };
    permissionOverrides?: PermissionSource['permissionOverrides'];
  }): SessionUser {
    return {
      id: user.id,
      restaurantId: user.restaurantId,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: effectivePermissions(user),
    };
  }

  /**
   * Delete my own account (an app-store requirement). The person's details are
   * erased and the login closed; order and payment rows that point at the user
   * stay, because tax records must be kept. The last active owner cannot do
   * this, or the restaurant would be locked out.
   */
  async deleteOwnAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Password is incorrect');
    }
    if (user.role.name === 'OWNER') {
      const otherOwners = await this.prisma.user.count({
        where: {
          restaurantId: user.restaurantId,
          isActive: true,
          id: { not: user.id },
          role: { name: 'OWNER' },
        },
      });
      if (otherOwners === 0) {
        throw new ConflictException(
          'You are the only owner. Make someone else an owner first, or contact support to close the restaurant.',
        );
      }
    }
    const scrambled = await bcrypt.hash(
      `${userId}:${Date.now()}:${Math.random()}`,
      10,
    );
    await this.prisma.$transaction([
      this.prisma.deviceToken.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({
        where: { recipientUserId: userId },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          name: 'Deleted user',
          email: null,
          phone: null,
          passwordHash: scrambled,
          pinHash: null,
          isActive: false,
          riderOnline: false,
          riderLat: null,
          riderLng: null,
          riderLocationAt: null,
          dashboardPrefs: Prisma.JsonNull,
          twoFactorSecret: null,
          twoFactorEnabled: false,
          twoFactorRecoveryHashes: [],
        },
      }),
    ]);
    return { ok: true };
  }

  async login(dto: LoginDto) {
    const include = permissionInclude;
    const id = dto.email.trim();
    let user: Awaited<ReturnType<typeof this.findLoginCandidate>> = null;
    // An email address, or a phone number as the login ID (delivery riders).
    // Every failure gives the same message so nothing reveals which IDs exist.
    if (id.includes('@')) {
      const u = await this.prisma.user.findFirst({
        where: { email: id, isActive: true },
        include,
      });
      if (u && (await bcrypt.compare(dto.password, u.passwordHash))) user = u;
    } else {
      user = await this.findLoginCandidate(id, dto.password);
    }
    if (!user) {
      // Spend comparable time when the ID is unknown, so timing does not reveal it.
      await bcrypt.compare(
        dto.password,
        '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi',
      );
      throw new UnauthorizedException('Invalid login ID or password');
    }

    // Only asked for after the password is right, so the response never
    // reveals which emails exist or which accounts use two-factor.
    if (user.twoFactorEnabled) {
      await this.twoFactor.verifyLogin(user, dto.totp);
    }

    return this.issueSession(user);
  }

  /** Phone-number login: compare real digits, then the password, against every active match. */
  private async findLoginCandidate(id: string, password: string) {
    const tail = id.replace(/\D/g, '').slice(-10);
    if (tail.length < 6) return null;
    const candidates = await this.prisma.user.findMany({
      where: { isActive: true, phone: { endsWith: tail.slice(-6) } },
      include: permissionInclude,
      take: 10,
    });
    for (const u of candidates) {
      if ((u.phone ?? '').replace(/\D/g, '').slice(-10) !== tail) continue;
      if (await bcrypt.compare(password, u.passwordHash)) return u;
    }
    return null;
  }

  async register(dto: RegisterDto) {
    // Sign-up is first-run setup. Once the server has a restaurant, anyone on
    // the network creating another would get an OWNER role - which carries the
    // instance-wide backup, update and sync permissions - so it stays closed
    // unless the host opts in (ALLOW_PUBLIC_SIGNUP=true) to run several tenants.
    if (
      process.env.ALLOW_PUBLIC_SIGNUP !== 'true' &&
      (await this.hasAnyRestaurant())
    ) {
      throw new ForbiddenException(
        'Sign-up is closed on this server. Ask the restaurant owner to create your account.',
      );
    }
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists',
      );
    }

    // Permissions are global, not per-tenant — upsert (idempotent) outside
    // the transaction below rather than re-creating them per restaurant.
    for (const permission of PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key: permission.key },
        update: {},
        create: permission,
      });
    }
    const allPermissions = await this.prisma.permission.findMany();
    const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const owner = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: { name: dto.restaurantName },
      });
      const branch = await tx.branch.create({
        data: { restaurantId: restaurant.id, name: dto.branchName },
      });

      let ownerRoleId = '';
      for (const roleName of STAFF_ROLES) {
        const role = await tx.role.create({
          data: {
            restaurantId: restaurant.id,
            name: roleName,
            label: roleName.replace(/_/g, ' '),
          },
        });
        if (roleName === 'OWNER') ownerRoleId = role.id;

        const grantedKeys = DEFAULT_ROLE_PERMISSIONS[roleName];
        await tx.rolePermission.createMany({
          data: grantedKeys
            .map((key) => permissionByKey.get(key))
            .filter((p): p is NonNullable<typeof p> => Boolean(p))
            .map((permission) => ({
              roleId: role.id,
              permissionId: permission.id,
            })),
        });
      }

      const user = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          roleId: ownerRoleId,
          name: dto.ownerName,
          email: dto.email,
          passwordHash,
        },
        include: permissionInclude,
      });

      await tx.userBranch.create({
        data: { userId: user.id, branchId: branch.id },
      });

      return user;
    });

    return this.issueSession(owner);
  }

  async hasAnyRestaurant(): Promise<boolean> {
    const restaurant = await this.prisma.restaurant.findFirst({
      select: { id: true },
    });
    return restaurant !== null;
  }

  async pinLogin(dto: PinLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: permissionInclude,
    });

    if (!user || !user.isActive || !user.pinHash) {
      throw new UnauthorizedException('PIN login not available for this user');
    }
    // A 4-8 digit PIN must not be a way around the second factor.
    if (user.twoFactorEnabled) {
      throw new UnauthorizedException(
        'PIN login is off for accounts with two-factor authentication — sign in with your password',
      );
    }

    const valid = await bcrypt.compare(dto.pin, user.pinHash);
    if (!valid) {
      throw new UnauthorizedException('Incorrect PIN');
    }

    return this.issueSession(user);
  }

  /**
   * Manager-PIN approval for one gated till action (a discount, a void).
   * Deliberately NOT pinLogin: it must not sign anyone in, switch the
   * session, or set a cookie — the cashier stays signed in and the manager
   * just proves they were at the till. The answer is a 5-minute approval
   * token; the gated endpoint re-checks it (verifyManagerApproval) before
   * acting, so a stolen or replayed token from another restaurant, or one
   * minted for a manager who has since lost the role, is refused.
   *
   * The PIN is matched against every active manager in this restaurant
   * (OWNER / ADMINISTRATOR / RESTAURANT_MANAGER with a PIN set), so the
   * cashier never picks which manager approves — whoever types their PIN
   * is the approver, and their name lands in the audit trail. A wrong PIN
   * gives the same message whether no manager has a PIN at all or the
   * digits were wrong, so the response never reveals which managers have
   * PINs set.
   */
  async verifyManagerPin(
    restaurantId: string,
    dto: VerifyManagerPinDto,
  ): Promise<ManagerPinApproval> {
    const managers = await this.prisma.user.findMany({
      where: {
        restaurantId,
        isActive: true,
        pinHash: { not: null },
        twoFactorEnabled: false,
        role: { name: { in: [...MANAGER_ROLES] } },
      },
      include: { role: true },
    });

    let manager: (typeof managers)[number] | null = null;
    for (const candidate of managers) {
      if (
        candidate.pinHash &&
        (await bcrypt.compare(dto.pin, candidate.pinHash))
      ) {
        manager = candidate;
        break;
      }
    }

    if (!manager) {
      // Spend comparable time when nothing matched, so timing does not
      // reveal whether any manager has a PIN set.
      await bcrypt.compare(
        dto.pin,
        '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi',
      );
      throw new UnauthorizedException(
        'Incorrect manager PIN — ask a manager to enter their PIN',
      );
    }

    const approvalToken = await this.jwt.signAsync(
      {
        sub: manager.id,
        purpose: 'manager-pin-approval',
        restaurantId,
        roleName: manager.role.name,
      },
      { expiresIn: '5m' },
    );

    await this.audit.record({
      userId: manager.id,
      action: 'manager.pin.verified',
      entity: 'User',
      entityId: manager.id,
      metadata: { roleName: manager.role.name },
    });

    return {
      approvalToken,
      manager: {
        id: manager.id,
        name: manager.name,
        roleName: manager.role.name,
      },
      expiresInSeconds: 300,
    };
  }

  /**
   * Re-checks a manager-PIN approval token at the gated endpoint. Throws
   * ForbiddenException (never returns null) so call sites read as a single
   * `await` with no "did we check?" branch to forget.
   */
  async verifyManagerApproval(
    token: string | undefined,
    restaurantId: string,
  ): Promise<{ id: string; name: string; roleName: string }> {
    if (!token) {
      throw new ForbiddenException(
        'Manager approval required — ask a manager to enter their PIN',
      );
    }
    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new ForbiddenException(
        'Manager approval is invalid or expired — ask a manager to enter their PIN again',
      );
    }
    const p = payload as {
      sub?: string;
      purpose?: string;
      restaurantId?: string;
    };
    if (p.purpose !== 'manager-pin-approval' || p.restaurantId !== restaurantId || !p.sub) {
      throw new ForbiddenException(
        'Manager approval is invalid or expired — ask a manager to enter their PIN again',
      );
    }
    const manager = await this.prisma.user.findUnique({
      where: { id: p.sub },
      include: { role: true },
    });
    // The approver must still be an active manager in this restaurant —
    // a token minted before a role change or a 2FA switch must not survive it.
    if (
      !manager ||
      !manager.isActive ||
      manager.restaurantId !== restaurantId ||
      manager.twoFactorEnabled ||
      !(MANAGER_ROLES as readonly string[]).includes(manager.role.name)
    ) {
      throw new ForbiddenException(
        'Manager approval is invalid or expired — ask a manager to enter their PIN again',
      );
    }
    return { id: manager.id, name: manager.name, roleName: manager.role.name };
  }

  private async issueSession(
    user: Parameters<AuthService['toSessionUser']>[0],
  ) {
    const sessionUser = this.toSessionUser(user);
    const token = await this.jwt.signAsync({ sub: user.id });
    return { token, user: sessionUser };
  }
}
