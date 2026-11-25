"use client";

import { Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { HeldOrder } from "@/hooks/use-orders";

function heldAgo(iso: string | null, fallbackIso: string) {
  const m = Math.round((Date.now() - new Date(iso ?? fallbackIso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

// Parked orders on the POS: each row resumes its bill back to OPEN (and
// re-occupies its table) so the cashier can keep serving it.
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
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {orders.length}
            </span>
          )}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close held orders">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading held orders…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No held orders. Hold an open bill from its checkout panel to park it here and free its table.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={resumingId !== null}
                onClick={() => onResume(o.id)}
              >
                <Play className="h-4 w-4" />
                {resumingId === o.id ? "Resuming…" : "Resume"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
