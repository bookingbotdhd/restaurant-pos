import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * EmptyState — what a screen shows when there is nothing to list yet.
 * Never a blank div: an icon in a tinted tile, a title, one line of helper
 * text, and (usually) the primary action that fixes the emptiness.
 *
 * Usage:
 *   <EmptyState
 *     icon={LayoutGrid}
 *     title="No floors yet"
 *     description="Add your first floor to start building the layout."
 *     action={<AddFloorDialog branchId={branchId} />}
 *   />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="-mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
