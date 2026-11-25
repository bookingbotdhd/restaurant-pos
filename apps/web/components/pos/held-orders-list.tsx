"use client";

import { Pause, Play, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import type { HeldOrder } from "@/hooks/use-orders";

function heldMinutes(iso: string | null, fallbackIso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso ?? fallbackIso).getTime()) / 60_000));
}

function heldAgo(iso: string | null, fallbackIso: string) {
  const m = heldMinutes(iso, fallbackIso);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

// Short form for the long-wait badge: "45m", "2h" — no "ago", the badge
// itself says "Waiting".
function heldDuration(iso: string | null, fallbackIso: string) {
  const m = heldMinutes(iso, fallbackIso);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
}

// A held order that has waited half an hour is the one the floor forgets:
// flag it in the warning tone, with its held-time label — never colour alone.
const LONG_WAIT_MINUTES = 30;

// Parked orders on the POS: each row resumes its bill back to OPEN (and
// re-occupies its table) so the cashier can keep serving it. Rows follow
// the cart-line pattern (name, time held, total, Resume button).
export function HeldOrdersList({
  orders,
  isLoading,
  resumingId,
  onResume,
  onClose,
}: {
  orders: HeldOrder[];
  isLoading: boolean;
  resumingId: string | null;
  onResume: (orderId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Pause className="h-4 w-4 text-muted-foreground" aria-hidden />
          Held orders
          {!isLoading && orders.length > 0 && (
            <Badge variant="secondary">{orders.length}</Badge>
          )}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close held orders">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Pause}
          title="No held orders"
          description="Hold an open bill from its checkout panel to park it here and free its table."
          className="py-8"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {orders.map((o) => {
            const waitingLong = heldMinutes(o.heldAt, o.createdAt) >= LONG_WAIT_MINUTES;
            return (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    #{o.orderNumber}
                    {o.tableId ? (
                      <span className="ml-2 font-normal text-muted-foreground">Table {o.table?.number}</span>
                    ) : (
                      <span className="ml-2 font-normal capitalize text-muted-foreground">
                        {o.type.replace("_", " ").toLowerCase()}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.customer?.name ?? "Walk-in guest"} · {o.items.length} item{o.items.length === 1 ? "" : "s"} ·{" "}
                    {formatCurrency(o.totalAmount)} · held {heldAgo(o.heldAt, o.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {waitingLong && (
                    <StatusBadge tone="warning">Waiting {heldDuration(o.heldAt, o.createdAt)}</StatusBadge>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={resumingId !== null}
                    onClick={() => onResume(o.id)}
                  >
                    <Play className="h-4 w-4" />
                    {resumingId === o.id ? "Resuming…" : "Resume"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
