# Pooja's Couture Suite — Requirements (PRD)

**Status:** living document, reflects what is actually built as of 23 Sep 2026 — not aspirational. Update this file whenever a feature is added, removed, or its scope changes.

---

## 1. What this system is

An internal enterprise-management suite for Pooja's Couture, a Sydney-based bridal and occasion-wear couture boutique with an offshore (India-based) karigar/vendor production pipeline. One Supabase backend, one Cloudflare Pages deployment, five separate front-end portals sharing the same database and access-control logic.

## 2. Portals and who uses them

| Portal | Path | Primary users | Purpose |
|---|---|---|---|
| Main app | `/` | Pooja (admin), operations staff, social CRM staff | Full business management — sales, inventory, accounting, HR, admin |
| Tailor (Karigar) Workstation | `/tailor/` | Karigar/vendor staff in India | View assigned production tasks, upload progress photos, mark shipped |
| Shipping & Logistics | `/shipping/` | Shashank (India logistics hub) | Receive from karigars, dispatch internationally, payment gate, delivery clearance |
| AI Team | `/ai-team/` | Admin, operations | Internal AI-assisted project/task collaboration tool |
| Boutique gate screens | shared across all above | anyone hitting a portal while logged out | Session-expired / not-signed-in landing, redirects to main login |

## 3. Main app — modules and their actual scope

### Overview Dashboard
Landing page after login. KPI summary (Active Brides, Active Custom Orders, Outstanding Invoices, Upcoming Consultations), upcoming consultations/fittings table (next 7 days), Live Operations Alerts (overdue order deadlines).

### Sales Dashboard (CRM)
Tabs, in display order: **Sales** (default landing tab) → **Clients** → **Consultations** → **Email** → **Pipeline** → **Projects** → **Journey**.

- **Sales**: revenue KPIs, Pipeline Health tiles, Revenue by Garment Type, Top Clients by Lifetime Value, Deadlines (next 30 days) — all clickable through to underlying records.
- **Clients**: full client roster, profile modal, change log per client.
- **Consultations** *(added 18 Sep 2026)*: pre-order lead pipeline built on top of the appointments table. Every scheduled appointment can carry a linked client with a `consultation_status` (New / Quote Sent / Follow-up Required / Converted / Not Proceeding). KPI cards for Total Leads / New / Converted / Conversion Rate, each clickable as a table filter. "New Consultation" intake form optionally books the appointment in the same step. "Convert to Order" action opens the order form pre-selecting that client.
- **Email**: Email Centre — branded HTML templates, per-order communication threads. **Known limitation:** still on `localStorage`, not Supabase — device-local, not synced across staff. Queued for migration, not yet done.
- **Pipeline** (internal tab key: `orders`): garment-level order pipeline by status (New → In Production → shipped/received → Delivered/Completed), with Active/Completed sub-filtering.
- **Projects**: multi-garment family orders (e.g. a wedding with several looks/people), each with its own sub-orders, shared invoice, garment-level tracking.
- **Journey**: per-client visual timeline from consultation through delivery, with garment-level breakdown for multi-garment clients.

### Stock & Inventory
Ready-made product catalog (bridal sets, accessories), vendor management, borrower/checkout tracking for items lent for shoots, sale recording, shade card colour pickers (Manish + Neelam thread cards, transcribed codes with interpolated approximate hex — **not individually colour-verified**, physical card is the source of truth for actual production).

**AI photo intake** (product-photo-intake.js): upload a garment photo, Claude analyzes it and pre-fills Category/Title/Description. Never touches price/cost/quantity — those aren't visible in a photo.

**AI model-photo generation** *(added 23 Sep 2026)*: once a garment photo exists, "Generate Model Photo" calls Google's Gemini API (gemini-3.1-flash-image / "Nano Banana 2") to produce a photo of a model (male/female) wearing that exact garment, stored alongside the product. **Genuinely new recurring cost** — every call spends real money against the business's own Gemini API billing, unlike the rest of this app. Admin/operations only, never triggered automatically.

### Accounting & Finance
Invoicing (database-enforced: hard constraints on `total = subtotal + gst + shipping`, `amount_paid <= total`, no negatives), expense logging, GST tracking, financial reports.

### Human Capital (HRM)
Employee records, attendance, leave requests, payroll processing, performance tracking.

### Social CRM Studio
Restricted-scope CRM view for social-media staff (`social_crm` / previously `social_crm_limited`, now removed — see Architecture doc).

### Admin Center
User management (create/reset password), audit log viewer, system diagnostics/metrics.

### Boutique Settings
Company details (name, ABN, address), GST registration, currency, superannuation rate — used across invoices and reports.

## 4. Known limitations (intentional, not bugs)

- Shade card hex values are interpolated approximations, not per-code verified — confirm against the physical card before cutting fabric/thread.
- Document intake (PDF/image auto-extraction) cannot read `.docx` — Word docs attach as reference only.
- Email Centre is `localStorage`-based, not yet migrated to Supabase.
- Google Contacts import (`google_contacts_tokens` table, `functions/api/google-contacts-*.js`) has backend infrastructure but the picker UI (`showGoogleContactsPickerModal`) never got wired to a working status check — treat as unfinished, not to be relied on.
- Contact form webhook (`contact-form-lead.js`, connects poojascouture.com's "Reach Us" page to the CRM) has a long-standing field-name-mismatch bug, unresolved pending diagnostic info from the live site.

## 5. Change process

Any change to scope (new tab, new module, new portal) should update this document in the same commit/session as the code change — not as a separate cleanup pass later.
