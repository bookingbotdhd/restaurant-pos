"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Stepper } from "@/components/ui/stepper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CartLine } from "@/components/pos/cart-line";
import { SavedAddressPicker } from "@/components/pos/saved-address-picker";
import type { RestaurantTable } from "@/hooks/use-tables";
import { formatCurrency } from "@/lib/format";
import { subtotalOf } from "@/lib/pricing-preview";
import { ShoppingCart } from "lucide-react";

export type PosOrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export interface DeliveryDetails {
  address: string;
  pincode: string;
  phone: string;
}

export function CartPanel({
  lines,
  orderType,
  onOrderTypeChange,
  tables,
  tableId,
  onTableChange,
  onIncrement,
  onDecrement,
  onRemove,
  onSubmit,
  isSubmitting,
  existingOrderNumber,
  onViewExistingOrder,
  openBills,
  selectedBillId,
  onSelectBill,
  checkingTable = false,
  delivery,
  onDeliveryChange,
  scheduledFor,
  onScheduledForChange,
  branchId = null,
}: {
  lines: CartLine[];
  orderType: PosOrderType;
  onOrderTypeChange: (type: PosOrderType) => void;
  tables: RestaurantTable[];
  tableId: string;
  onTableChange: (id: string) => void;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onRemove: (key: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  existingOrderNumber?: string;
  onViewExistingOrder?: () => void;
  /** All unpaid bills on the selected table (more than one is possible). */
  openBills?: { id: string; orderNumber: string }[];
  selectedBillId?: string | null;
  onSelectBill?: (id: string) => void;
  /** The table's open bills are still loading - sending now could start a duplicate bill. */
  checkingTable?: boolean;
  delivery: DeliveryDetails;
  onDeliveryChange: (d: DeliveryDetails) => void;
  scheduledFor: string;
  onScheduledForChange: (v: string) => void;
  /** Used to look up a returning customer's saved addresses by phone. */
  branchId?: string | null;
}) {
  const subtotal = subtotalOf(lines.map((l) => l.unitPrice * l.quantity));
  const deliveryReady =
    orderType !== "DELIVERY" ||
    (delivery.address.trim().length >= 5 && delivery.pincode.trim().length >= 3 && delivery.phone.trim().length >= 6);
  const canSubmit =
    lines.length > 0 && (orderType !== "DINE_IN" || !!tableId) && deliveryReady && !isSubmitting && !checkingTable;

  return (
    <div className="flex h-full flex-col gap-4">
      <Tabs value={orderType} onValueChange={(v) => onOrderTypeChange(v as PosOrderType)}>
        <TabsList className="w-full">
          <TabsTrigger value="TAKEAWAY" className="flex-1">
            Takeaway
          </TabsTrigger>
          <TabsTrigger value="DINE_IN" className="flex-1">
            Dine-in
          </TabsTrigger>
          <TabsTrigger value="DELIVERY" className="flex-1">
            Delivery
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {orderType === "DINE_IN" && (
        <Select value={tableId} onValueChange={(v) => onTableChange(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select table">
              {(value: string | null) => {
                const t = tables.find((table) => table.id === value);
                if (!t) return "Select table";
                return `${t.name ?? `Table ${t.number}`}${t.status === "OCCUPIED" ? " (occupied)" : ""}`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tables.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name ?? `Table ${t.number}`} {t.status === "OCCUPIED" ? "(occupied)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {orderType === "DELIVERY" && (
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Delivery address"
            value={delivery.address}
            onChange={(e) => onDeliveryChange({ ...delivery, address: e.target.value })}
          />
          <SavedAddressPicker
            branchId={branchId}
            phone={delivery.phone}
            onPick={(address, pincode) => onDeliveryChange({ ...delivery, address, pincode })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Pincode"
              inputMode="numeric"
              value={delivery.pincode}
              onChange={(e) => onDeliveryChange({ ...delivery, pincode: e.target.value })}
            />
            <Input
              placeholder="Phone"
              inputMode="tel"
              value={delivery.phone}
              onChange={(e) => onDeliveryChange({ ...delivery, phone: e.target.value })}
            />
          </div>
        </div>
      )}

      {orderType !== "DINE_IN" && (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Schedule for later (optional)
          <Input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => onScheduledForChange(e.target.value)}
          />
        </label>
      )}

      {checkingTable && (
        <p role="status" className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          Checking this table&apos;s open bills…
        </p>
      )}
      {openBills && openBills.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" role="group" aria-label="Open bills on this table">
          <span>{openBills.length} open bills here — add to:</span>
          {openBills.map((b) => (
            <Button
              key={b.id}
              type="button"
              size="sm"
              variant={b.id === selectedBillId ? "default" : "outline"}
              className="h-9 px-3 text-xs"
              aria-pressed={b.id === selectedBillId}
              onClick={() => onSelectBill?.(b.id)}
            >
              #{b.orderNumber}
            </Button>
          ))}
        </div>
      )}
      {existingOrderNumber && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          <span>
            This table already has open order{" "}
            <span className="font-medium text-foreground">#{existingOrderNumber}</span>
            {lines.length > 0 && " — these items will be added to it as a new round."}
          </span>
          {onViewExistingOrder && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 px-3 text-xs"
              onClick={onViewExistingOrder}
            >
              View & pay
            </Button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Cart is empty"
            description="Tap a dish on the menu to start this order."
            className="h-full justify-center py-8"
          />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {lines.map((line) => (
              <div key={line.key} className="flex items-start justify-between gap-3 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-snug font-semibold text-foreground">{line.name}</p>
                  {line.modifierLabel && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{line.modifierLabel}</p>
                  )}
                  <p className="mt-1.5 text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(line.unitPrice * line.quantity)}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {formatCurrency(line.unitPrice)} each
                    </span>
                  </p>
                </div>
                <Stepper
                  value={line.quantity}
                  onIncrement={() => onIncrement(line.key)}
                  onDecrement={() => onDecrement(line.key)}
                  onRemove={() => onRemove(line.key)}
                  ariaLabel={line.name}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subtotal (incl. tax)</span>
          <span className="text-lg font-bold tabular-nums text-foreground">
            {formatCurrency(subtotal)}
          </span>
        </div>
        <Button size="lg" className="w-full" disabled={!canSubmit} onClick={onSubmit}>
          {isSubmitting
            ? "Sending to kitchen…"
            : existingOrderNumber
              ? "Add to order & send to kitchen"
              : "Send to kitchen"}
        </Button>
      </div>
    </div>
  );
}
