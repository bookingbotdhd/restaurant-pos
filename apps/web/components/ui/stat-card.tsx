import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * StatCard — the dashboard KPI tile. One component, three sizes:
 *
 * - `hero` — the one number to look at first (revenue). Wide, tinted.
 * - `default` — a supporting figure (orders, occupied tables, kitchen queue).
 * - `compact` — an attention figure (pending payments, low stock).
 *
 * `accent` tints the icon tile and, for hero cards, the card background:
 * `success` = good / money in, `warning` = needs attention. Everything is a
 * link to where the records behind the number live, with a visible focus ring
 * and a hover state that lifts the border toward the brand colour.
 *
 * Numbers always use tabular-nums so they don't jitter as they change.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
  size = "default",
  className,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "success" | "warning";
  /** Where the full records behind this number live. */
  href: string;
  /** hero = the one number to look at first; compact = supporting figures. */
  size?: "hero" | "default" | "compact";
  className?: string;
}) {
  const hero = size === "hero";
  const compact = size === "compact";
  return (
    <Link
      href={href}
      aria-label={`${label}: ${value}. Open details`}
      className={cn(
        "group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
    >
      <Card
        className={cn(
          "flex h-full flex-col transition group-hover:border-primary/40 group-hover:shadow-md",
          hero
            ? "justify-between gap-6 border-success/25 bg-gradient-to-br from-success/10 via-card to-card p-6 sm:p-7"
            : compact
              ? "gap-2 p-4"
              : "gap-3 p-4 sm:p-6",
          accent === "warning" && !hero && "border-warning/40",
        )}
      >
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "font-medium text-muted-foreground",
              compact ? "text-xs" : "text-[13px]",
            )}
          >
            {label}
          </span>
          <div
            className={cn(
              "flex items-center justify-center rounded-xl",
              compact ? "h-7 w-7" : "h-9 w-9",
              accent === "success" && "bg-success/10 text-success",
              accent === "warning" && "bg-warning/10 text-warning",
              !accent && "bg-primary/10 text-primary",
            )}
          >
            <Icon className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />
          </div>
        </div>
        <span
          className={cn(
            "font-semibold tabular-nums tracking-tight text-foreground",
            hero ? "text-4xl sm:text-5xl" : compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
          )}
        >
          {value}
        </span>
      </Card>
    </Link>
  );
}
