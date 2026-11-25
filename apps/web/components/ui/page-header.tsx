import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — the one header every dashboard screen uses.
 *
 * Pattern: optional eyebrow (section, e.g. "Service"), a 32px semibold title,
 * one line of muted description, and actions pinned to the right (buttons,
 * tabs, search). Keeps every screen's top edge aligned and scannable.
 *
 * Usage:
 *   <PageHeader
 *     title="Tables"
 *     description="Live floor status — tap a table to update it"
 *     actions={<Button …>Edit floor plan</Button>}
 *   />
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[32px] leading-none font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
