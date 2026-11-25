import { LifeBuoy } from "lucide-react";
import { Logo } from "./logo";

/**
 * Sidebar footer: the product brand lockup. The restaurant's own logo leads
 * the sidebar header (see AppShell); the RestroOS mark lives here as the
 * product credit — purple-R logo, name, and "Powered by Shibam Solutions".
 * Never remove the credit line: it is part of the RestroOS brand.
 */
export function BrandFooter() {
  return (
    <div className="flex flex-col gap-2 border-t border-sidebar-border px-4 py-4">
      <a
        href="https://github.com/bookingbotdhd/restaurant-pos"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-xl border border-sidebar-border px-3 py-2.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LifeBuoy className="h-3.5 w-3.5" />
        Contact support
      </a>
      <a
        href="https://github.com/bookingbotdhd/restaurant-pos"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-sidebar-accent/60"
      >
        <Logo size={28} />
        <span className="min-w-0 text-left leading-tight">
          <span className="block text-xs font-semibold text-sidebar-foreground">RestroOS</span>
          <span className="block text-[10px] text-sidebar-foreground/50">
            Powered by Shibam Solutions
          </span>
        </span>
      </a>
    </div>
  );
}
