# Pooja's Couture Suite — Architecture

**Status:** living document, reflects verified state as of 23 Sep 2026 (git commit `3346e5e` at time of writing). Re-verify against the actual repo before trusting a specific claim in an old copy of this file — code changes faster than documentation.

---

## 1. Stack

- **Frontend:** vanilla JavaScript, no framework, no build step. Each portal is a single HTML shell plus one or more `.js` module files loaded as plain `<script>` tags.
- **Backend:** Supabase (Postgres + Auth + Storage + RLS). Project ID: `sgzbuipldbjfbhtatwjc`.
- **Serverless functions:** Cloudflare Pages Functions, under `functions/api/*.js`. Routing is by exact file path — `functions/api/x.js` is reachable, `functions/x.js` is not.
- **Hosting:** Cloudflare Pages, auto-deploy from the `main` branch of `PoojasCouture/poojas-couture-suite` on GitHub.
- **Icons:** a PNG asset set under `assets/`, used across tab bars and action buttons via a shared CSS convention (`.tab-btn-icon`, `.btn-icon`) — see `docs/DESIGN.md`.

## 2. Repo layout

```
index.html, css/app.css, js/*.js       — main app (Sales, Stock, Accounting, HRM, Admin, Settings)
shipping/                              — Logistics portal (own index.html + app.js)
tailor/                                — Karigar Workstation (own index.html + app.js)
ai-team/                               — AI Team portal (own index.html + app.js)
functions/api/                         — Cloudflare Pages Functions (server-side)
assets/                                — shared icon PNGs, used by all portals
docs/                                  — this documentation set, plus source-of-work reference material
```

Each of the four portals loads its own `app.js`, but all four share: `js/store.js` (data layer), `js/access.js` (access control), `css/app.css` (styling), `js/theme.js` (light/dark), `assets/*.png` (icons).

## 3. Data layer — `js/store.js`

Single generic data-access module used by every portal. Key behaviors:
- `Store.COLLECTIONS.*` maps a logical name (e.g. `CLIENTS`) to a real Supabase table (`clients`).
- Automatic camelCase (JS) ↔ snake_case (Postgres) field conversion via `appToRow()` / `rowToApp()` — write `consultationStatus` in JS, it lands in `consultation_status` in the database, no manual mapping needed per call site.
- In-memory cache per collection, refreshed on write.

**Do not hand-roll a separate camelCase/snake_case mapping in a new module** — this already exists and is the reason a whole class of "server error on every write" bugs (documented in earlier sessions) stopped recurring once callers were switched to it.

## 4. Access control — `js/access.js` (centralized, fixed 13 Sep 2026)

`window.AccessControl.getRoleAccess(role, hasCrmPerm, hasSocialCrmPerm)` is the single source of truth for "which role can open which portal/tab." Loaded and called from all four portals (`js/app.js`, `shipping/app.js`, `tailor/app.js`, `ai-team/app.js`) — confirmed by direct grep, not assumed.

This replaced an earlier state (documented in an August 2026 handoff) where the same logic was hand-duplicated in at least 5 separate places (Supabase RLS, `landingRouteFor()`, two different ACCESS maps in the main app, and `ai-team/app.js`'s own `ALLOWED_ROLES`) — a role change required touching all five, and missing even one produced a confusing partial-failure bug. **This is the reference example for what "logic in the center" means for this codebase**, and the standard other duplicated logic should be measured against.

## 5. Known duplicated logic — not yet centralized

These have not had the same treatment as access control. Flagging them here rather than fixing them blind — each needs its own scoped session with a real before/after diff, per this project's "surgical changes only" rule.

- **Invoice math**: `js/invoicing.js` (272 lines, client-side) and `functions/api/invoicing.js` (614 lines, server-side) both contain invoice calculation logic. The server-side version is the authoritative one (enforced by DB constraints — see §6), but verify the client-side copy hasn't drifted before assuming both agree.
- **GST/rounding logic**: historically fixed in `crm.js`'s order/invoice functions directly (see 23 Jul 2026 handoff — shipping GST and Milestone-1 rounding bugs). Worth checking whether this duplicates anything in `js/invoicing.js` now that the latter exists.

## 6. Third-party AI integrations and their cost model

Everything else in this app runs on Supabase/Cloudflare's existing infrastructure with no per-action cost. Two exceptions, both used deliberately and sparingly:

- **`ANTHROPIC_API_KEY`** (Claude, vision only — understands an image, does not generate one): used by `product-photo-intake.js` to pre-fill Category/Title/Description from a garment photo, and by `ai-team.js`.
- **`GEMINI_API_KEY`** (Google Gemini, `gemini-3.1-flash-image` / "Nano Banana 2" — genuine image *generation*): used by `generate-model-photo.js` to produce a photo of a model wearing an uploaded garment. **This is the one place in the app where a single button click spends real, ongoing money** against the business's own Gemini API billing. Standard tier chosen deliberately over the cheaper Lite tier — Lite trades away garment fidelity for speed/cost, which matters more here than the small price difference, since the whole point of a boutique's product photo is showing real fabric/embroidery detail.

Both keys are set as Cloudflare Pages environment variables (Settings → Environment variables, encrypted), never in the codebase. Both endpoints gate to admin/operations only, and Gemini's endpoint additionally never fires automatically — explicit click only, given the cost.

## 7. Database-enforced business rules

Not every rule lives in application code — some are hard Postgres constraints on the `invoices` table, deliberately, so they can't be bypassed by a client-side bug or a devtools edit:
- `total = subtotal + gst_total + shipping` (exact, zero tolerance)
- `amount_paid <= total` (exact)
- No negative values anywhere on the table
- Milestone JSON amounts must sum to `total` (small tolerance here, intentionally — milestone JSON comes from JS float math before storage, not from a `numeric` column)

## 8. Confirmed dead code (found in 23 Sep 2026 audit, not yet removed)

Business logic, not deleted without a decision — see `js/crm.js` and `js/products.js`:
- `sendEmail()` in `crm.js` — fully-built EmailJS sender, zero call sites. Likely superseded by the newer templated Email-to-Client flow.
- `_fetchGoogleContactsStatus()` in `products.js` — calls `/api/google-contacts-status`, zero call sites. Sits beside `showGoogleContactsPickerModal()`, which never actually calls it — the Google Contacts import feature is scaffolded but unfinished (see Requirements doc §4).

## 9. Deployment mechanics that matter

- **Cache-busting is manual, not automatic.** Every `.js`/`.css` file has a `?v=YYYYMMDDx` query string on every `<script>`/`<link>` tag that loads it, across every HTML file that loads that same file. Bump it on every content change, in every file that references it, or browsers serve the stale cached version indefinitely. This has caused real, repeated bugs across many sessions — including within the same session that first added a feature.
- **Cloudflare Pages Functions route by exact path.** `functions/api/x.js`, not `functions/x.js`.
- **GitHub raw CDN has intermittent outages** — a fetch that 404s across every file, including previously-working ones, in the same short window is very likely a transient CDN issue, not a real repo problem. Re-verify with a fresh clone before concluding otherwise.
- **PAT policy**: a fresh GitHub PAT is provided per session, injected via `git remote set-url` immediately before push, stripped immediately after, sandbox clone deleted. Treat every PAT as single-session; do not assume one from an earlier session still works.

## 10. Portal-specific tab implementations — not all shared

Not every tab bar in this app uses the same component. The main app's Sales/HRM/Admin/Accounting tabs use the shared `.tab-btn-icon` class; **the Shipping portal's own top-level Orders/Inventory/KPI tabs are a separate, hand-rolled `tabStyle()` function** (pill buttons, inline styles) — this is why an icon-conversion sweep of the shared component missed it entirely in an earlier session. When doing an app-wide sweep of any kind, check for portal-specific implementations like this rather than assuming every tab bar shares one component.
