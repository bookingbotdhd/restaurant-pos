"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@restroos/types";
import { hasPermission } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { NavDot } from "./nav-dot";
import { NAV_ITEMS, type NavItem } from "./nav-items";

// The sidebar is grouped so a cashier finds the shift screens at a glance
// and the rarely-touched admin screens don't compete with them:
// Service (used all shift) → Manage (back office) → Admin (rarely touched).
// The active item gets a brand-coloured left bar and a filled tint, not just
// a slightly different background — it has to read at arm's length.
const GROUPS: { key: NonNullable<NavItem["group"]>; label: string }[] = [
  { key: "service", label: "Service" },
  { key: "manage", label: "Manage" },
  { key: "admin", label: "Admin" },
];

export function SidebarNav({
  user,
  onNavigate,
}: {
  user?: SessionUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const badges = useNavBadges();
  const allowed = NAV_ITEMS.filter((item) => !item.permission || hasPermission(user, item.permission));
  const visibleGroups = GROUPS.map(({ key, label }) => ({
    key,
    label,
    items: allowed.filter((item) => (item.group ?? "manage") === key),
  })).filter((g) => g.items.length > 0);

  return (
    <nav className="flex flex-col gap-0 px-3" aria-label="Main navigation">
      {visibleGroups.map(({ key, label, items }, groupIndex) => {
        return (
          <div key={key} className="flex flex-col gap-1">
            <p className={cn("eyebrow px-3 pb-1.5", groupIndex === 0 ? "pt-1" : "pt-5")}>{label}</p>
            {items.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm ring-1 ring-primary/20"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                    />
                  )}
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  {t(item.labelKey)}
                  {badges.nav[item.href] && !isActive ? <NavDot /> : null}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
