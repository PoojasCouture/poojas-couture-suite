# Pooja's Couture — Shipping & Logistics Process
### The definitive process spec (built from Himanshu's walkthrough)
### This is the source of truth for building the logistics/vendor modules.

---

## 1. TWO INBOUND FLOWS (these are different — keep them separate)

### Flow A — Custom Orders (bespoke garments)
Individual, per-client. Each client's order ships as its own parcel. Never combined with another client.

### Flow B — Stock Replenishment (ready-made inventory)
Bulk parcels of ready-made goods (kurtas, bridal sneakers, dupattas, jewellery, purses) for the boutique. Not tied to any client.

---

## 2. CUSTOM ORDER FLOW (Flow A) — step by step

### 2.1 Making
- Garments are made from scratch by the tailor in their own workshop.
- Tailors: **Kaleem (Kaleem Tailoring)**, **Danish (Danish Tailoring)**.
- **Fabric:** acquired by the tailor, in consultation with Pooja. Tailor bears the fabric cost (it sits inside the tailor's charge — NOT a separate Pooja's Couture cost). Fabric movement is domestic India only — never shipped from Australia.

### 2.2 Routing rule
- **DEFAULT (all vendors — tailors AND menswear/sherwani) → via Shashank** (consolidator). Vendor ships pieces to Shashank domestically; he picks up / consolidates and ships internationally to Australia.
- **EXCEPTION — direct international by vendor:** RARE, urgent-only. When there is no time for Shashank to collect and forward, the vendor ships direct internationally themselves. Applies to any vendor when time-critical (most often menswear/sherwani).

### 2.3 Tailor → Shashank (domestic India leg)
- Tailor ships finished pieces to Shashank domestically.
- **Tailor records "shipped to Shashank" in their portal, WITH tracking number + details.**
- Shashank sees the piece as **incoming**.
- Shashank marks **"received"** when it physically arrives.
- **Cost:** tailor pays the domestic shipping and folds it into their invoice to Pooja's Couture → so it is **Pooja's Couture's cost**, inside what they pay the tailor.

### 2.4 Shashank consolidates — WITHIN ONE CLIENT'S ORDER
- Shashank holds the pieces of a single client's order until **all pieces of that client's order have arrived**.
- A client's order may be 1 or several pieces (e.g. lehenga + blouse from different tailors).
- **He does NOT combine different clients' orders into one shipment.** One client's order = one parcel.

### 2.5 Shashank → Australia (international leg)
- Once a client's order is complete at Shashank, he ships that client's parcel internationally to Australia.
- Shashank bills Pooja's Couture; his charge varies with the parcel (value/size/weight).
- **Cost:** Pooja's Couture's cost first, then billed onward to the client.

### 2.6 Client billing (custom orders)
- Client pays: **garment price** + **ACTUAL international shipping cost** (pass-through, on top).
- No markup on custom shipping — it is passed through at actuals as a separate charge.

---

## 3. STOCK FLOW (Flow B) — bulk replenishment

- **Source:** Shashank, from India — mainly **Mumbai, Surat, or Ghaziabad**.
- Comes in as a **bulk parcel** of ready-made goods.
- **Cost:** the bulk parcel's shipping cost is **distributed across the garments in that parcel** → becomes part of each item's **landed cost**.
- (Pricing note: Pooja's Couture applies a ~150% markup, i.e. cost x2.5, when setting retail price. This equals the bridal-industry-standard 2.5-3x markup / ~50-60% gross margin. It is a pricing decision for Pooja & Himanshu, NOT a shipping rule the system computes.)
- Not tied to any client. This is inventory replenishment.

---

## 4. SANKET HAS TWO DISTINCT JOBS (his portal must handle both)
1. **Custom-order logistics:** receive pieces from tailors (with tracking), consolidate per client's order, ship each client's parcel internationally, record cost.
2. **Stock replenishment:** send bulk parcels of ready-made stock from India; the parcel's shipping cost is distributed across the items as landed cost.

---

## 5. COST OWNERSHIP MAP (summary)

| Leg | Who bears it | Notes |
|---|---|---|
| Fabric | Tailor (inside their charge) | Domestic India only; chosen with Pooja |
| Tailor making charge | Pooja's Couture | Paid to tailor |
| Domestic shipping (tailor→Shashank) | Pooja's Couture | Folded into tailor's invoice |
| International (Shashank→Australia, custom) | Pooja's Couture → billed to client at ACTUAL | Pass-through, separate line |
| Direct vendor international (rare/urgent) | Pooja's Couture | Vendor ships, bills PC |
| Bulk stock shipping | Pooja's Couture | Distributed across items as landed cost |

---

## 6. WHAT THIS MEANS FOR THE BUILD (Stage 2 scope)

### Tailor portal — ADD
- A **"Ship to Shashank"** action on each finished piece: enter **tracking number + details**, mark as shipped.

### Shashank / Logistics portal — BUILD
- **Incoming view:** pieces tailors have shipped to him (with tracking), grouped **by client order**; shows which pieces have arrived vs still in transit.
- **"Mark received"** per piece.
- **Per-client-order consolidation:** see when a client's order is complete (all pieces received) → ready to ship.
- **"Ship parcel"** action per client order: record international shipment (carrier, tracking, **cost**). One parcel = one client order. NO cross-client combining.
- **Stock replenishment view:** create a bulk stock parcel (source city: Mumbai/Surat/Ghaziabad), list items + quantities, enter total parcel shipping cost → system distributes cost across items as landed cost.

### Invoicing / cost reconciliation — LATER
- Custom order client invoice = garment price + actual international shipping (separate line).
- Vendor invoice reconciliation: tailor's invoice = making charge + domestic shipping (+ fabric).
- Stock landed cost = item cost + (parcel shipping / items in parcel).

---

## 7. OPEN ITEMS (decide before/while building)
- Exact fields Shashank needs per shipment (carrier list? tracking format? customs value?).
International shipments require specific documentation and tracking details to pass customs clearance and ensure accurate transit. To avoid delays, ensure these three categories of information are provided.
1. Carrier & Tracking Information
The carrier processes your shipment using a waybill or shipping label, which requires standard data fields generated by the courier:
    •	Carrier Name: e.g., Australia Post, DHL Express, FedEx, UPS.
    •	Tracking Format: Couriers use unique alphanumeric string patterns (e.g., DHL uses a 10-digit number, while Australia Post typically starts with two letters followed by 13 digits and ends with AU).
    •	Sender & Receiver Details: Full names, complete physical addresses, phone numbers, and email addresses of both parties.
    •	Shipment Weight & Dimensions: Gross weight and dimensional weight for carriage fee calculations.
    •	Service Type: e.g., Document, Non-Document/Merchandise.
2. Customs Valuation
Customs authorities require the exact financial and structural breakdown of your goods to assess duties, taxes, and quarantine risks. This is typically submitted on a Commercial Invoice or Customs Declaration.
    •	Customs Value: The total transaction value (actual price paid or payable), including shipping and insurance costs up to the port of entry.
    •	Currency: Specify the currency used for the goods (e.g., AUD, USD).
    •	Country of Origin: The specific country where the goods were manufactured.
3. Exact Commodity Fields
Every individual item in a shipment must be cataloged precisely. Vague terms like "samples" or "parts" are subject to rejection. 
    •	Goods Description: Clear, plain-English explanation of what the item is and what it is made of.
    •	Harmonized System (HS) Code: Standardized numerical method of classifying traded products used to calculate duties.
    •	Quantity & Unit of Measure: Number of units and respective unit values.
    •	Total Line Value: The subtotal per item line.
    •	Incoterms: Standardized commercial terms (e.g., DAP, FOB) that clarify who pays for the shipping and liability.
- Whether stock landed-cost distribution is by item count, weight, or value (currently: "distributed across garments" — assume by count unless told otherwise).
- DONE: Logistics person renamed Sanket -> Shashank Patil across the app (build task).
- How the direct-vendor rare/urgent route is recorded (low priority — rare).
