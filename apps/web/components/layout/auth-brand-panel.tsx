import { ChefHat, ClipboardList, ReceiptText } from "lucide-react";
import { Logo } from "@/components/layout/logo";

/**
 * AuthBrandPanel — the left half of the login / signup screens (desktop only).
 * A violet brand panel: the purple-R RestroOS logo, a one-line promise, three
 * things the product does for a restaurant, and the "Powered by Shibam
 * Solutions" credit. The form lives on the right; on phones the panel hides
 * and the form stands alone.
 *
 * Keep the credit line: it is part of the RestroOS brand.
 */
const HIGHLIGHTS = [
  { icon: ReceiptText, text: "New order in seconds — menu, cart, bill, done" },
  { icon: ChefHat, text: "Live kitchen display the whole floor can read" },
  { icon: ClipboardList, text: "Tables, reservations and reports in one place" },
];

export function AuthBrandPanel({ headline, subhead }: { headline: string; subhead: string }) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[#4C2EC7] p-10 text-white lg:flex dark:bg-[#3D24A0]">
      {/* Soft radial glow + dot texture, pure CSS — no image asset needed. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 80% 0%, rgba(255,255,255,0.22), transparent 70%), radial-gradient(50% 40% at 10% 100%, rgba(161,138,255,0.45), transparent 70%)",
        }}
      />
      <div className="relative flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg">
          <Logo size={36} className="rounded-none" />
        </span>
        <span className="leading-tight">
          <span className="block text-lg font-semibold tracking-tight">RestroOS</span>
          <span className="block text-xs text-white/70">Powered by Shibam Solutions</span>
        </span>
      </div>

      <div className="relative">
        <h2 className="max-w-md text-4xl leading-tight font-semibold tracking-tight">{headline}</h2>
        <p className="mt-3 max-w-md text-base text-white/80">{subhead}</p>
        <ul className="mt-8 flex flex-col gap-4">
          {HIGHLIGHTS.map((h) => (
            <li key={h.text} className="flex items-center gap-3 text-sm font-medium text-white/90">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <h.icon className="h-4.5 w-4.5" />
              </span>
              {h.text}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/60">
        Dine-in · Takeaway · Delivery · QR ordering · Kiosk
      </p>
    </div>
  );
}
