"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Stepper — the quantity control for the POS cart and any other place a
 * cashier changes a count by tapping. Buttons are 44px (the counter touch
 * floor) in the default `lg` size, the count is tabular-nums and centred,
 * and removing a line is a separate, clearly destructive action — never
 * hidden behind decrementing to zero.
 *
 * Usage (POS cart line):
 *   <Stepper
 *     value={line.quantity}
 *     onIncrement={() => onIncrement(line.key)}
 *     onDecrement={() => onDecrement(line.key)}
 *     onRemove={() => onRemove(line.key)}
 *     ariaLabel={line.name}
 *   />
 */
export function Stepper({
  value,
  onIncrement,
  onDecrement,
  onRemove,
  ariaLabel,
  size = "lg",
  className,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove?: () => void;
  /** Read out in the buttons' aria-labels, e.g. the item name. */
  ariaLabel?: string;
  size?: "default" | "lg";
  className?: string;
}) {
  const big = size === "lg";
  const btn = big ? "h-11 w-11" : "h-9 w-9";
  const icon = big ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(btn, "shrink-0 rounded-xl")}
        onClick={onDecrement}
        aria-label={ariaLabel ? `Decrease ${ariaLabel}` : "Decrease quantity"}
      >
        <Minus className={icon} />
      </Button>
      <span
        aria-live="polite"
        className={cn(
          "shrink-0 text-center font-semibold tabular-nums text-foreground",
          big ? "w-8 text-base" : "w-6 text-sm",
        )}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(btn, "shrink-0 rounded-xl")}
        onClick={onIncrement}
        aria-label={ariaLabel ? `Increase ${ariaLabel}` : "Increase quantity"}
      >
        <Plus className={icon} />
      </Button>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(btn, "shrink-0 rounded-xl text-muted-foreground hover:text-destructive")}
          onClick={onRemove}
          aria-label={ariaLabel ? `Remove ${ariaLabel} from cart` : "Remove from cart"}
        >
          <Trash2 className={icon} />
        </Button>
      )}
    </div>
  );
}
