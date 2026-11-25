import { CalendarPlus, ChefHat, LayoutGrid, ShoppingCart, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { href: "/pos", label: "New order", hint: "Take an order", icon: ShoppingCart },
  { href: "/tables", label: "Tables", hint: "Floor status", icon: LayoutGrid },
  { href: "/reservations", label: "New reservation", hint: "Book a table", icon: CalendarPlus },
  { href: "/kds", label: "Kitchen display", hint: "Live tickets", icon: ChefHat },
  { href: "/menu", label: "Menu", hint: "Items & prices", icon: UtensilsCrossed },
];

// One-tap jumps into the flows staff reach for most during service — big
// touch tiles right under the header, each with an icon, a label and a hint
// of what it does, so a new cashier reads the row once and never again.
export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "group flex min-h-[76px] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3",
            "shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:translate-y-0",
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <action.icon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{action.label}</span>
            <span className="block truncate text-xs text-muted-foreground">{action.hint}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
