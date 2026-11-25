# Design System — RestroOS v2

Bar to hit: Stripe Dashboard, Linear, Notion, Vercel, Raycast, Arc, Figma,
Framer, Shopify Admin, Clerk Dashboard. Minimal, spacious, confident
typography, restrained color, real motion — not a "POS with rounded
corners." A screen that looks like a generic admin template is not done.

This is v2 (2026-11-25, `feature/ui-redesign`). It replaces the v1 wine/
burgundy notes below where they conflict: the shipped tokens are the violet
`#6D4AFF` / `#A18AFF` action colour on warm-neutral surfaces, defined in
`apps/web/app/globals.css` (Product Design System v1.0 handbook). **Tokens in
`globals.css` win over any colour table in this file.**

Rule for every screen, old or new: **build from the tokens and the shared
components in `apps/web/components/ui/`. Do not restyle a page ad hoc.**
If a screen needs a look the system doesn't have, add it to the system
(a token or a shared component) and use it from there — never a one-off
class in one page. New feature screens (split payment, hold order, table
timer, manager PIN, forecast, licence/activation) must follow
`docs/UI-DESIGN-SYSTEM.md`, the merge-pass guide for applying this system
to them.

## Tokens (`apps/web/app/globals.css`)

### Colour (light / dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#F7F7F5` | `#111114` | Page background (warm neutral, not pure white/black) |
| `--card` | `#FFFFFF` | `#19191E` | Cards, panels, dialogs |
| `--sidebar` | `#FFFFFF` | `#19191E` | Sidebar / drawer |
| `--foreground` | `#18181B` | `#F4F4F5` | Primary text |
| `--muted-foreground` | `#52525B` | `#A1A1AA` | Secondary text, hints |
| `--border` | `#E4E4E7` | `#34343C` | 1px borders (cards are a border, not a shadow) |
| `--primary` | `#6D4AFF` | `#A18AFF` | Brand violet — the one action colour |
| `--primary-hover` | `#5B3BE8` | `#B5A5FF` | Primary hover state |
| `--primary-foreground` | `#FFFFFF` | `#17102E` | Text on primary |
| `--accent` | `#F0EBFF` | `#30284B` | Active nav item, selected tint |
| `--accent-foreground` | `#4C2EC7` | `#D6CBFF` | Text on accent |
| `--success` | `#18845B` | `#5BC69A` | Paid, available, good news |
| `--warning` | `#A65C00` | `#F2BA62` | Reserved, pending, late, needs attention |
| `--destructive` | `#C43D4D` | `#FF7A88` | Cancelled, failed, destructive actions |
| `--info` | `#2863B8` | `#80B4FF` | In progress, informational |
| `--ring` | `#3C82F6` | `#80B4FF` | Focus ring |

Status aliases: `--status-available` (success), `--status-occupied`
(primary), `--status-reserved` / `--status-attention` (warning),
`--status-danger` (destructive). Prefer the `StatusBadge` tone maps
(see below) over raw colours at call sites.

### Typography

Font: Geist (Inter fallback) — one premium sans, no mixing. Tight
tracking (`-0.015em`) on headings, tabular numbers for every amount,
count and timer (`tabular-nums`).

| Role | Size | Weight |
|---|---|---|
| Page title (`PageHeader`) | 32px | semibold |
| Section title (`CardTitle`, `h2`) | 18px | medium/semibold |
| Card title | 16px | medium |
| Body | 15–16px | regular |
| Small label / eyebrow (`.eyebrow`) | 11px, uppercase, `tracking-[0.08em]` | semibold, muted |
| Numbers (KPIs) | 24–48px, bold, tabular-nums | — |
| KDS ticket items | 16px+ | semibold — read from 2–3 m |

### Spacing, radii, shadows

- Page gap: `gap-6` between sections; card padding `p-6` (compact `p-4`).
- Base radius `--radius: 0.75rem` (12px). Cards are `rounded-2xl` (16px),
  buttons/inputs `rounded-xl`, pills/badges `rounded-full`.
- Shadows mean "floating": cards have **no** shadow (1px border only);
  hover lift is `shadow-md` at most. `--shadow-float` for popovers,
  `--shadow-modal` for dialogs. Dialog overlay is `bg-black/50`.
- Touch floor `--touch-target: 44px`. Default button is `h-10`,
  default input/select is `h-11`; on real touchscreens
  (`pointer: coarse`) every control is forced to a 44px minimum.
  POS steppers and primary CTAs use 44–48px. Never ship a 28–32px
  tap target on a counter screen.

### Motion

120ms quick / 180ms standard, `cubic-bezier(0.2, 0, 0, 1)`. Hover, press,
page transition, drawer open/close only — motion communicates state
change, never decorates. Full `prefers-reduced-motion` safety net in
`globals.css` (movement removed, feedback kept as text/icon/focus).

## Shared components (`apps/web/components/ui/`)

Primitives (shadcn/Base UI based): `Button` (default `h-10`, `lg` `h-12`,
`sm` `h-8`, `icon` 40px), `Input` (`h-11`, `rounded-xl`), `Select`
(trigger `h-11`), `Textarea`, `Label`, `Switch`, `Checkbox`, `Card`
(`rounded-2xl`, 1px ring), `Table` (uppercase 11px muted headers,
`px-4 py-3` cells, row hover), `Dialog` (overlay `black/50`, content
`p-6 rounded-2xl`), `Tabs` (list `h-11`, pill triggers), `Badge`
(`default/secondary/destructive/success/warning/info/outline/ghost/link`),
`Skeleton`, `Sheet`, `DropdownMenu`, `Sonner` toasts, `StatusNote`
(inline result/error message — the app has no toast popups).

Composition components (the ones that make screens consistent):

| Component | File | Use for |
|---|---|---|
| `PageHeader` | `ui/page-header.tsx` | Every screen's top: eyebrow, 32px title, one-line description, actions right. |
| `StatCard` | `ui/stat-card.tsx` | Dashboard KPIs. `hero` / `default` / `compact`, `accent` `success`/`warning`, always a link to the underlying records. |
| `StatusBadge` | `ui/status-badge.tsx` | Any lifecycle pill (table/order/kitchen/payment). Tones `success/warning/danger/info/primary/neutral` + maps `TABLE_STATUS_TONE`, `ORDER_STATUS_TONE`, `KITCHEN_STATUS_TONE` and `TABLE_STATUS_LABEL`. Reuse the maps — never invent a status colour. |
| `EmptyState` | `ui/empty-state.tsx` | Empty lists: icon tile, title, helper text, primary action. Never a blank div. |
| `Stepper` | `ui/stepper.tsx` | Quantity +/- with a separate remove action. 44px buttons (`lg`), tabular count, aria-labelled per item. |
| `AuthBrandPanel` | `layout/auth-brand-panel.tsx` | Login/signup left panel: violet brand block, logo, highlights, "Powered by Shibam Solutions". |

Layout: `layout/app-shell.tsx` (272px grouped sidebar, sticky blurred
header, centred `max-w-[1440px]` content), `layout/sidebar-nav.tsx`
(grouped Service / Manage / Admin, active item has a brand left bar +
filled tint), `layout/brand-footer.tsx` (purple-R logo + RestroOS +
"Powered by Shibam Solutions" — the credit line is part of the brand,
never remove it), `layout/mobile-bottom-nav.tsx` (pill-highlighted active
tab), `layout/logo.tsx` (purple-R `/logo.png`).

## Screen patterns

- **Page header:** `PageHeader` everywhere. Title is the noun
  ("Tables", "Reports"), description is one plain line of what to do
  here, actions are real `Button`s on the right.
- **Dashboard:** greeting + live date, `QuickActions` tiles (icon tile +
  label + hint), hero revenue `StatCard`, compact attention row, two
  `TrendChart`s, then Tables / Kitchen / Recent / Channels cards.
  Bento-style mixed sizes, not a uniform grid of identical boxes.
- **POS order screen:** built for speed — large touch targets, search
  with icon, category rail (desktop) / dropdown (phone), product tiles
  with the Indian veg/non-veg square mark, price in bold tabular nums,
  cart with `Stepper`, sticky subtotal + big "Send to kitchen" CTA,
  mobile cart as a bottom pill button. This screen trades some of the
  "spacious" aesthetic for density/speed deliberately; that's a
  considered exception, not an inconsistency.
- **Billing / checkout:** the money is the hero — Total due 24px bold,
  Balance due 20px bold, change-due in a success pill, payment methods
  as large buttons, UPI QR in a white card, sticky "Complete payment"
  bar at the bottom. Discount presets are 40px chips.
- **Tables:** floor plan tiles are status-tinted with a 2px border:
  green Available, violet Occupied, amber Reserved, grey Cleaning.
  Tile shows shape icon, name (bold), capacity, status label, elapsed
  time for occupied/reserved. Legend uses `StatusBadge`s.
- **KDS:** large legible tickets (16px items, bold order number),
  elapsed-time pill that turns amber at 15 min, fresh tickets ringed
  in brand violet, late/priority tickets ringed amber. Read from
  2–3 meters away — type size floors are higher than the rest of the app.
- **Reports:** report catalogue in a grouped left nav, filters + export
  in a card, results in the shared `Table`, `EmptyState` when no data.
- **Settings:** `PageHeader` + `SettingsTabs` + one `Card` per area,
  toggle rows are bordered `rounded-xl` rows with a label, helper text
  and a `Switch`.
- **Login / signup:** split screen — violet `AuthBrandPanel` left
  (desktop), form right ("Welcome back" / "Set up your restaurant",
  44px inputs, `lg` submit). Errors inline under the form, never only
  in a toast. 2FA code field appears when the server asks for it.

## Accessibility

WCAG AA minimum. Keyboard-navigable everywhere (POS and KDS especially —
they're used under time pressure). Visible focus states (2px ring).
Screen-reader labels on icon-only buttons. Status is never colour-only:
every status has a label and (in badges) a dot + text. Run
`accesslint`'s `audit` skill (live-DOM, not just static code read)
before marking any UI surface done.

## Layout

Top nav (branch switcher, language, notifications, user menu) +
grouped sidebar + content area. Sidebar collapses to an off-canvas
drawer below `lg` (this is a correctness requirement, not cosmetic —
the old fixed-256px sidebar ate 66% of a phone viewport before it was
caught and fixed; do not repeat that here, verify at ~375px/~768px/
desktop with real screenshots before calling any layout done).
Mobile gets a bottom nav (POS / Orders / Tables / KDS / Dashboard +
More). Dashboard uses a bento-grid layout where it fits.

## What changed in v2 (2026-11-25)

- Tokens: added `--shadow-popover/modal`, `--touch-target: 44px`,
  status aliases, `.eyebrow` + `.scroll-thin` utilities.
- Primitives grown up: Button default 32→40px, `lg` 36→48px, hover uses
  `--primary-hover`; Input/Select 32→44px, `rounded-xl`; Card
  `rounded-2xl`; Table headers uppercase micro-labels, roomier cells;
  Dialog overlay 10%→50% black, content `p-6 rounded-2xl`; Tabs list
  32→44px; Badge gained `success/warning/info` variants.
- New shared components: `PageHeader`, `StatCard` (extracted from the
  dashboard), `StatusBadge` (+ status→tone maps), `EmptyState`,
  `Stepper`, `AuthBrandPanel`.
- Sidebar grouped (Service / Manage / Admin) with a brand left-bar
  active state; sticky blurred header; brand footer as a proper lockup.
- Login/signup rebuilt as a split screen with the violet brand panel.
- Dashboard: quick actions are now icon tiles; pending-orders banner
  uses real buttons. POS: search icon, veg/non-veg square marks, bigger
  tiles, `Stepper` cart, pill mobile-cart button. Checkout: hero totals,
  pill kitchen status, bigger preset chips. Tables: bolder tiles with
  status labels + elapsed time, badge legend, `EmptyState`.
  Reports: shared `Table`, grouped nav, `EmptyState`. Orders: header
  + pending count pill + 44px filter chips + `EmptyState`. Menu /
  Inventory / Customers / Reservations / KDS headers unified on
  `PageHeader`. KDS tickets: larger type, bigger elapsed pill.
