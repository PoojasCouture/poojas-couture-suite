# Pooja's Couture Suite — Design System

**Status:** documents conventions actually established in the codebase as of 23 Sep 2026 — this is a reference, not a spec written in advance. When a new pattern is introduced, add it here in the same session, or it becomes exactly the kind of undocumented convention this file exists to prevent.

---

## 1. Colour tokens (`css/app.css` `:root`)

Dark theme (default):
- `--pc-gold: #ECB676` — the single accent colour, used consistently for active states, hover glows, primary buttons. Do not introduce a second accent colour without strong reason — this app deliberately uses one accent on a neutral base.
- `--pc-bg-dark: #0B0B12`, `--pc-bg-card: #16161F`

Light theme (auto-switches 7am–6pm, see `js/theme.js`):
- `--pc-bg-dark: #F0EDE8`, `--pc-bg-card: #FFFFFF`, `--pc-gold: #A4652F` (a darker gold, for contrast on a light background — same brand colour, different value, not a different colour)

Category-tint chip backgrounds also exist (`.stat-card-icon.gold/.green/.blue/.purple/.red/.amber`) for KPI card icons — pick by semantic meaning (green = success/money-in, red = danger/overdue, blue = informational, purple = analytics/rate), not arbitrarily.

## 2. Typography

- `--font-display: 'Playfair Display', Georgia, 'Times New Roman', serif` — used for page headings and gate-screen titles. **This is a deliberate brand choice for a bridal couture business, not an accident** — do not "fix" this to a sans-serif under a generic anti-serif design rule; it's correct for this brand.
- Gate-screen headings use a fluid, clamp()-based font-size (`clamp(1.15rem, 1.6vw + 1rem, 1.85rem)`) rather than a fixed value, so both the text and any inline icon (sized in `em`, scales with it) adapt across screen sizes without manual re-tuning.

## 3. Spacing scale

`--sp-1: 4px`, `--sp-2: 8px`, `--sp-3: 12px`, `--sp-4: 16px`, `--sp-6: 24px`, `--sp-8: 40px`.

**Note the gap: there is no `--sp-5`.** `.mb-5` and similar `-5` utility classes do not exist and silently do nothing if used — this caused a real, live bug (zero visible gap below several KPI card rows) before being caught and fixed. When in doubt, grep `css/app.css` for the exact utility class before using it in new markup; don't assume a number in the middle of an existing sequence exists.

Valid margin/gap utilities confirmed in the stylesheet: `-1, -2, -3, -4, -6, -8`. No `-5` or `-7`.

## 4. Icon system

A shared PNG asset set under `assets/`, numbered and named descriptively (e.g. `21_thread_spool.png`, `29_money_cash.png`). Two button conventions consume it:

- **`.tab-btn-icon`** — 48×48px button, 28×28px icon, used for the shared main-app tab bars (Sales, HRM, Admin, Accounting). Hover: lift + gold border + glow. Active: gold ring. `:active`: `scale(0.96)` press feedback. Tooltip via `data-tooltip` attribute, styled dark chip with gold border.
- **`.btn-icon`** — 42×42px button, 28×28px icon, used for action-button rows (Stock & Inventory, and the universal `title`-attribute tooltip that applies to every `.btn-icon` app-wide via a single CSS rule, no per-instance HTML needed). Same hover lift/glow/border treatment as `.tab-btn-icon`, added later in the same session to match.

**Not every tab bar uses `.tab-btn-icon`.** The Shipping portal's own top-level Orders/Inventory/KPI tabs are a separate hand-rolled `tabStyle()` function (pill buttons with visible text labels, not icon-only chips) — see Architecture doc §9. When doing an icon or styling sweep, explicitly check for portal-specific implementations like this one; a grep for the shared class name will miss it entirely.

When no icon in the asset set fits a concept's actual meaning (checked: no "sync/refresh", no "notification bell"), the honest choice is to leave the item as-is or flag it for a purpose-made asset — not force a semantically-wrong icon onto it just to "finish" a conversion sweep.

## 5. KPI stat-card pattern

Established structure, used across Overview Dashboard, Stock & Inventory, Sales Dashboard's Pipeline and Consultations tabs, Accounting:

```html
<div class="d-grid gap-4 mb-6 animate-fade-in" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
  <div class="stat-card">
    <div class="stat-card-header"><span class="stat-card-icon <color>"><img src="assets/X.png" ...></span></div>
    <div class="stat-card-value">...</div>
    <div class="stat-card-label">...</div>
  </div>
  ...
</div>
```

`gap-4` and `mb-6` are the confirmed-correct values (see §3 on the `-5` trap). Where a card is meant to filter the content below it when clicked (see the Consultations tab), add a `data-*` target attribute and a click handler that toggles a gold `border` directly on the card plus re-renders the filtered view — clicking an already-active card should clear the filter, not require a separate "clear" control.

## 6. Loading states

Skeleton placeholders, not spinners or plain text — reuse the existing `.skeleton` class (shimmer animation via CSS `background-position` + `@keyframes shimmer`, already defined) with a `.skeleton-block` sizing modifier, laid out to roughly match the real content's shape. Do not introduce a new shimmer animation; compose with what exists.

## 7. Error and confirmation messaging

- **Never show a raw JS/Supabase error message to the user.** Log the real error via `console.error()` for debugging, show a plain action-based message instead (e.g. "Delete failed. Please try again." not "Delete failed: Failed to fetch").
- **Confirmation dialogs name the specific item and state the consequence plainly**, with the button labeled by the action itself (`Delete`, not `OK`). Existing pattern: `App.showConfirm({ title, text: 'Delete "X"? This cannot be undone.', confirmText: 'Delete', onConfirm })`.
- **Every write action needs immediate visible confirmation** — a toast plus a refreshed view. A silent successful write with no on-screen change is a bug even if the database write succeeded.

## 8. Responsive/fluid sizing

Prefer `clamp()` for anything that previously required manually re-tuning a fixed value on request ("make it bigger") — see the gate-screen heading in §2. A fixed value that has already been bumped once on request is a signal to make it fluid instead of bumping it again.
