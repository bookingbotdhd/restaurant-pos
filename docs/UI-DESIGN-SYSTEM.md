# Applying the Design System to New Feature Screens

Guide for the final merge pass: the feature screens built in parallel
(split payment, hold order, table timer, manager-PIN prompts, AI sales
forecast, licence/activation) were built in other worktrees against the
old look. When they land, restyle them with the v2 system below — do not
restyle each screen ad hoc, and do not copy classes from an old screen.

Full contract: `DESIGN_SYSTEM.md`. Tokens live in
`apps/web/app/globals.css`; shared components in
`apps/web/components/ui/`. This file is the per-screen checklist.

## The 5-minute checklist (every screen)

1. **Header** — `PageHeader` with a 32px title, one-line description,
   and actions as real `Button`s on the right.
2. **Cards** — `Card` (`rounded-2xl`, 1px border, `p-6`). No custom
   card styles, no shadows on static cards.
3. **Buttons** — `Button` default (`h-10`) for normal actions, `size="lg"`
   (`h-12`) for the one primary CTA, `size="sm"` only for dense rows.
   Primary = violet fill; destructive = the `destructive` variant
   (soft red tint, not a solid red button) unless it's the final
   destructive confirm.
4. **Inputs** — `Input` / `Select` / `Textarea` as shipped (44px,
   `rounded-xl`). Labels above, helper text below, errors in
   `text-destructive` under the field.
5. **Status** — `StatusBadge` with a tone from the maps in
   `ui/status-badge.tsx` (`TABLE_STATUS_TONE`, `ORDER_STATUS_TONE`,
   `KITCHEN_STATUS_TONE`). Never a hand-picked colour class for a
   status. If a screen needs a status the maps don't cover, add it to
   the map — don't inline a colour.
6. **Empty / loading / error** — `EmptyState` for empty, `Skeleton`
   for loading, `QueryError` for load failure. Never a blank div or a
   bare "No data" paragraph.
7. **Money** — always `formatCurrency`, always `tabular-nums`, totals
   bold and larger than the rows above them.
8. **Touch** — every tappable control ≥ 44px on counter screens.
   Dialogs: overlay `bg-black/50`, content `p-6 rounded-2xl`, title
   18px semibold.

## Per feature screen

### Split payment (billing)

- Reuse the checkout layout in `components/pos/checkout-panel.tsx`:
  the bill summary (`BillSummary`) is the single source of figures —
  add split rows to it, don't build a second summary.
- Each payer's share is a row: name/amount + a `Stepper`-style amount
  control or a preset chip row (`min-h-10 rounded-full`, like the
  discount presets). Remaining balance stays the hero number
  (20px bold, "Balance due"), and the sticky bottom bar keeps the one
  primary CTA ("Complete payment · ₹X").
- Paid shares list in the "Payments so far" box (`rounded-2xl`,
  `bg-secondary/40`).

### Hold order (POS)

- Held orders live where the cart lives: a "Held" section in the cart
  panel or a chip row above the cart, using the same `Card` + row
  pattern as cart lines (name, time held, total, Resume button).
- Hold / Resume are `Button variant="outline"`; the held count is a
  `Badge variant="secondary"` on the cart header. Use the `warning`
  tone for a held order that has been waiting (with a time label, not
  colour alone).

### Table timer (tables)

- The timer already exists on tiles (`ElapsedTimer`). When the timer
  becomes a first-class feature, show it as a tabular-nums pill on the
  tile (like the KDS elapsed pill: `rounded-full px-3 py-1.5`,
  amber at the late threshold) and in the table's dropdown menu.
- Thresholds: use `--status-attention` (warning) for "seated a while"
  and `--status-danger` for "overdue" — via `StatusBadge` tones, not
  raw classes. The legend on the Tables page gains the new state.

### Manager-PIN prompts

- A PIN prompt is a `Dialog` (content `p-6 rounded-2xl`, overlay
  `bg-black/50`) with a clear title ("Manager approval needed"), one
  line saying *what* is being approved (e.g. "Discount of 20% on
  order #42"), a large PIN `Input` (`h-12 text-lg tabular-nums`,
  centred, `inputMode="numeric"`), and Approve / Cancel buttons.
  Errors (wrong PIN) inline under the field in `text-destructive`,
  never only in a toast.
- The trigger button that needs approval keeps its normal look; the
  dialog is where the authority is visible.

### AI sales forecast (dashboard / reports)

- Lives as a dashboard card next to `TrendChart` (same `Card p-6`,
  18px title with icon) or as a Reports catalogue entry — not a new
  page chrome.
- Forecast numbers use `StatCard` (compact) or the trend-chart
  pattern: a line chart with the forecast as a dashed line in
  `var(--chart-1)` and actuals solid. Confidence is a muted helper
  line ("Based on the last 30 days"), never a bare percentage.
- Empty state: `EmptyState` ("Not enough history yet — forecasts
  appear after 14 days of sales").

### Licence / activation screens (settings)

- A settings-area `Card` with `PageHeader` ("Licence" under Settings),
  status as a `StatusBadge` (`success` = active, `warning` = expiring
  soon, `danger` = expired), key facts as label/value rows (plan,
  seats, renews on), and one primary CTA ("Activate" / "Renew").
- The activation form is a normal settings form: `Label` above,
  `Input` (44px), helper text below, inline error. No custom
  full-screen layout — it lives inside the app shell like every other
  settings screen.

## What NOT to do

- Don't invent a new button size, radius, shadow, or status colour.
- Don't put a second summary of the bill anywhere — the checkout
  `BillSummary` is the one source of figures.
- Don't use colour alone for a status (add a label/dot/text).
- Don't shrink tap targets to fit more on screen — if a screen is
  crowded, it needs grouping (tabs, sections), not smaller controls.
- Don't touch the 7 AGPL licence/notice files, and don't remove the
  "Powered by Shibam Solutions" credit from the sidebar footer or the
  auth brand panel.
