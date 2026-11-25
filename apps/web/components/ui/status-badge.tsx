import { cn } from "@/lib/utils";

/**
 * StatusBadge — a small pill with a dot, for anything with a lifecycle:
 * table status, order status, kitchen ticket status, payment state.
 *
 * Tones are semantic, never ad-hoc colours at the call site:
 * - `success` green — available, paid, served, ready
 * - `warning` amber — reserved, pending, late, needs attention
 * - `danger` red — cancelled, out of stock, failed
 * - `info` blue — informational / in progress
 * - `primary` violet — occupied, new, the brand action state
 * - `neutral` grey — cleaning, out of service, closed
 *
 * The maps below are the single source of truth for status → tone, so a
 * table that is OCCUPIED looks the same on the floor plan, in the POS table
 * picker and in a KDS header. New feature screens should reuse these maps
 * instead of inventing their own colours.
 */

export type StatusTone = "success" | "warning" | "danger" | "info" | "primary" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success ring-success/25",
  warning: "bg-warning/10 text-warning ring-warning/25",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
  info: "bg-info/10 text-info ring-info/25",
  primary: "bg-primary/10 text-primary ring-primary/25",
  neutral: "bg-muted text-muted-foreground ring-border",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  primary: "bg-primary",
  neutral: "bg-muted-foreground",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[tone])} />
      {children}
    </span>
  );
}

/** Table floor-plan status → tone. */
export const TABLE_STATUS_TONE: Record<string, StatusTone> = {
  AVAILABLE: "success",
  OCCUPIED: "primary",
  RESERVED: "warning",
  CLEANING: "neutral",
  OUT_OF_SERVICE: "neutral",
};

export const TABLE_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  CLEANING: "Cleaning",
  OUT_OF_SERVICE: "Out of service",
};

/** Order lifecycle status → tone. */
export const ORDER_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "warning",
  OPEN: "primary",
  PREPARING: "info",
  READY: "success",
  SERVED: "success",
  PAID: "success",
  CANCELLED: "danger",
};

/** Kitchen ticket (KOT) status → tone. */
export const KITCHEN_STATUS_TONE: Record<string, StatusTone> = {
  NEW: "primary",
  ACCEPTED: "info",
  PREPARING: "warning",
  READY: "success",
  SERVED: "neutral",
};
