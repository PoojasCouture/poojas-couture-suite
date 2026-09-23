# Pooja's Couture Suite — Database Schema & Relationships

**Status:** pulled directly from live Supabase schema (project `sgzbuipldbjfbhtatwjc`) on 23 Sep 2026 via `list_tables`. This is ground truth at time of writing — re-query rather than trust an old copy of this file when precision matters (a column count, a constraint, an RLS policy).

30 tables total, all in the `public` schema, all with RLS enabled.

---

## 1. Core business entities

### `clients` (76 rows)
The central entity. Every other domain hangs off this table via `client_id`.
- Identity: `name`, `email`, `phone`, `type` (Bride/Family/Other), `tags[]`
- Pre-order consultation fields (added in an earlier session, unused in UI until the Consultations tab was built 18 Sep 2026): `source`, `appointment_type`, `who_for`, `budget`, `event_type`, `event_date`, `appointment_date`, `design_reference_path`
- `consultation_status` (added 18 Sep 2026): NULL = regular client, not a pre-order lead. Values: New / Quote Sent / Follow-up Required / Converted / Not Proceeding.
- Referenced by: `appointments`, `orders`, `order_projects`, `invoices`, `sales`, `emails`, `order_communications`, `client_agreements`, `client_changes`.

### `orders` (0 rows at time of writing)
One row per garment/order line. Very wide table — beyond the obvious fields (`client_id`, `title`, `price`, `status`, `deadline`), it carries the full production/shipping/measurement detail for a single garment: shipping/customs fields (`domestic_tracking`, `hs_code`, `customs_value`, `incoterms`...), design fields (`design_notes`, `embroidery_details`, `colour_ref`...), and ~18 individual measurement fields (`m_bust`, `m_waist`, `m_lehenga_length`, etc.) captured per garment, not per client — correct, since measurements can differ between garments for the same person over time.
- Can belong to an `order_projects` row (multi-garment family order) via `project_id`, or stand alone.
- Referenced by: `invoices`, `order_tailors`, `sale_items`, `client_changes`, `photo_requests`, `job_photos`, `order_communications`, `intake_documents`, `client_agreements`.

### `order_projects` (0 rows)
A multi-garment order for one event (e.g. a wedding with several looks/people) — see the 9-garment Sanjana & Rishi order referenced in early handoffs. Has its own invoice via `project_id` on `invoices`.

### `appointments` (95 rows)
Scheduled meetings — TidyCal-synced (`tidycal_id`, unique) plus manually created. `client_id` is nullable: **as of 23 Sep 2026, 94 of 95 rows either had no client link at all, or were only linked during a manual backfill that day** — most TidyCal bookings arrive as a raw name+email capture in `notes` (`Email: x | Phone: y | Source: TidyCal`), not a proper client record, until someone runs "Create Client from this booking" or the row gets matched during a consultation-pipeline backfill.

### `invoices` (0 rows)
Can attach to an `order_id`, a `sale_id`, or a `project_id` — three different possible parents, not always all three. `items` and `milestones` are JSONB, not normalized tables. See Architecture doc §6 for the hard DB constraints enforced on this table.

### `sales` / `sale_items`
Retail/ready-made sales (Stock & Inventory), distinct from custom `orders`. A `sale_item` can reference a `product_id`, an `order_id`, or neither.

## 2. Inventory & production

### `products` (3 rows)
Ready-made stock. Self-referencing via `parent_product_id` (an accessory belonging to a set). Linked to `vendors` and `shipments`. `model_photo_url` (added 23 Sep 2026, nullable) holds an AI-generated photo of a model wearing the garment — separate from `photo_url` (the plain garment shot) — see Architecture doc §6 for the real per-call cost behind it.

### `vendors` (1 row)
Karigar/tailor/supplier records. Has its own `app_role` (tailor portal login) and `permissions` JSONB — same shape as `employees.permissions`, worth keeping in sync if the permission model changes on one side.

### `order_tailors`
Per-order production task assignment to a vendor, with its own shipped/received tracking fields (a lighter-weight duplicate of some fields also on `orders` — `domestic_tracking`, `shipped_to_shashank` vs `orders.shipped_to_shashank_date`. Check both when debugging a shipping-status issue; they are not automatically kept in sync by a DB constraint).

### `shipments`, `stock_parcels` / `stock_parcel_items`
Two separate shipment concepts: `shipments` (per-order international shipping) vs `stock_parcels` (bulk incoming stock parcels for ready-made inventory). Don't conflate them — different tables, different purpose, no FK between them.

## 3. Staff & HR

### `employees` (0 rows)
Login identity for internal staff. `app_role` (admin/operations/tailor/social_crm/...) drives access via `js/access.js`. `permissions` JSONB drives finer-grained CRM/social CRM scoping. `needs_password_rehash` is a one-off migration flag, not a feature — see its column comment for exact mechanics.

### `attendance`, `leaves`, `payroll`
Standard HR tables, all FK'd to `employees.id`.

## 4. Communication & documents

### `emails`, `order_communications`
Two different logging tables for outbound client email — `emails` is simpler (client-level), `order_communications` is order-scoped and includes `photo_urls`. Check which one a given feature actually writes to before assuming "the email log" means one specific table.

### `intake_documents`
Uploaded reference documents (PDF/image/Word) for an order or invoice, with AI-extraction status tracking (`uploaded` → `extracting` → `extracted` → `applied`/`failed`). Cannot extract from Word docs — see Requirements doc §4.

### `client_agreements`
E-signature-style agreement records with a unique `token`, client + Pooja signature fields. **RLS was fixed (added real policies) in an earlier session but the table still has zero code wiring it up to an actual feature as of 23 Sep 2026** — the policies exist so the table is safely usable whenever this feature actually gets built, not because it's live yet.

### `client_changes`
Change-order log — a garment/price/timeline change requested after an order was placed, linked to `client_id` and optionally `order_id`/`project_id`.

## 5. Photos

### `photo_requests`, `job_photos`
Request/fulfil workflow: Pooja requests photos on an order (`photo_requests`), karigar uploads land in `job_photos` linked back to the request. `job_photos` can also link to a `shipment_id` directly (Shashank's shipping-photo use case) without going through a request.

## 6. System / config

### `settings` (single row, `id = 1` enforced by a CHECK constraint)
Company details used across invoices/reports: name, ABN, address, GST registration, currency, super rate.

### `audit_logs` (816 rows)
Flat action log, no FKs — `user_name`/`category`/`action`/`details` as plain text.

### `shipping_rules`
Per-country default shipping rate + tax rate. **Historically had RLS enabled with zero policies (found and fixed in an earlier session)** — same bug class as `client_agreements` originally had. If a new table shows up empty/inaccessible from the app despite having rows, check policy count before assuming it's a JS bug.

### `google_contacts_tokens`
OAuth refresh token storage for the unfinished Google Contacts import feature — see Requirements doc §4.

### `ai_team_projects`
Backing store for the AI Team portal — `agents_involved[]`, `contributions` JSONB, no FKs to the rest of the schema (self-contained).

### `borrowers` / `product_checkouts`
Item-lending tracking (products borrowed for shoots), FK'd to `products`.

## 7. Cross-cutting notes for future schema work

- **Nullable `client_id` is the norm, not the exception**, on `appointments`, `orders`, `invoices`, `sales` — always handle the unlinked case in UI code, don't assume a row has a resolvable client.
- **RLS zero-policy is a recurring historical bug class in this project** (`shipping_rules`, `client_agreements` both hit it). When a table's data genuinely exists but the app can't see/write it, check `pg_policy` before debugging JS.
- **JSONB is used for genuinely variable-shape data** (`invoices.items`, `invoices.milestones`, `ai_team_projects.contributions`, `employees.permissions`) — don't normalize these into new tables without a real reason; they're JSONB by design, not by oversight.
