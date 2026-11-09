# SN Invoice — Smart Invoice Management System

Professional, production-ready Progressive Web Application (PWA) developed for **SN Advertising** (Kelaniya, Sri Lanka).

Built to replace manual Excel-based billing with an automated, secure, and resilient digital system for advertising campaigns, radio sponsorships, video productions, and custom media services.

---

## 🌟 Key Features

1. **Client Management (Create Once, Reuse)**:
   - Complete profiles: Client name, unique client code (auto-generated or custom), full billing address, contacts (WhatsApp/Mobile/Email), VAT number, BRN.
   - Default preferences auto-populate on every future invoice (VAT preference, billing entity, payment terms, advance %, default notes).
   - Dedicated client history page with **month-wise invoice summary** (e.g. August 2026: 1 invoice, September 2026: 2 invoices, October 2026: 0 invoices).

2. **Step-by-Step Invoice Creation & Live Calculations**:
   - Collision-safe running invoice numbers (continuing sequence `23467` or custom prefix).
   - Live decimal math: `Subtotal = sum(Line Totals)`, `VAT (18%) = Subtotal * 0.18`, `Grand Total = Subtotal + VAT`.
   - Advance payments calculation (e.g. 75% advance note and amount).
   - Instant client snapshot & billing snapshot captured at time of issue to ensure historical immutability.

3. **Multiple Invoice Templates (Section 7)**:
   - **Template 1 — Standard Advertising Invoice**: Replicates the original SN Advertising letterhead layout and typography from the Excel samples.
   - **Template 2 — VAT Tax Invoice**: Compliant with Sri Lanka IRD tax guidelines showing issuer VAT (`114094498-7000`) and client VAT numbers.
   - **Template 3 — Sponsorship Invoice**: Designed for radio and broadcast packages (Run FM, Ridam FM) highlighting broadcasting periods and program slots.
   - **Template 4 — Custom Commercial Invoice**: Modern corporate invoice for multi-line production contracts.
   - Switch between templates in 1 click without retyping invoice details.

4. **Monthly Invoice History (CORE FEATURE)**:
   - Dedicated `/history` route with 3 distinct date modes:
     1. **Issued in Month**: Filter by `invoice_date` / `issued_at`.
     2. **Sent in Month**: Filter by actual `sent_at` timestamp.
     3. **Services for Month**: Filter by service period (e.g. `OCT - NOV 2026`).
   - Client and Month combination filtering (e.g. Client: Chamara Motors, Month: September 2026).
   - Monthly summary KPI bar: Invoices Issued, Invoices Sent, Total Invoiced, Total Paid, Outstanding Balance, Active Clients Billed.

5. **Sent Status & Dispatch Tracking**:
   - Statuses: `Not Sent`, `Sent`, `Delivery Confirmed`.
   - 1-Click WhatsApp integration with formatted message and invoice link.
   - Email compose link and manual "Mark as Sent" confirmation with timestamp audit trail.

6. **Payment & Receivables Tracking**:
   - Payment statuses: `Unpaid`, `Partially Paid`, `Paid`, `Overdue`, `Voided`.
   - Record payment modal supporting Cash, Bank Transfer, and Cheques with transaction references.
   - Overpayment protection and automatic outstanding balance updates.

7. **One-Time Logo & Signature Settings**:
   - High-resolution official SN Advertising logo persistent in branding.
   - Multiple billing entities: **SN Advertising** (Seylan Bank Kadawatha) and **HARIPARA (PVT) LTD** (Commercial Bank Kelaniya, VAT: `114094498-7000`).

8. **PWA (Progressive Web Application)**:
   - Installable on desktop, Android, and iOS.
   - Offline fallback screen (`offline.html`) and static asset service worker caching.
   - Responsive mobile navigation with center "+ New Invoice" quick action.

---

## 🧪 Verified Test Scenarios (From Real Excel Files)

The system is pre-seeded with and verified against all three Excel test cases:

| Scenario | Client | Service Description | Period | Subtotal (LKR) | VAT (18%) | Grand Total (LKR) | Advance / Notes | Billing Entity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Test A** | Araliya Lands and Homes (Pvt) Ltd | Video Campaign with Presenter (3 Clips) | 2026-08-12 | 125,000.00 | None (0%) | **125,000.00** | 75% Advance (Rs. 93,750) | SN Advertising (Seylan Bank) |
| **Test B** | CHAMARA MOTORS AND STICKERS CENTER | SPONSER SHIP PACKEGE ON RUN FM | OCT - NOV 2026 | 300,000.00 | 54,000.00 (18%) | **354,000.00** | Client VAT: `100958996-7000` | HARIPARA (PVT) LTD |
| **Test C** | CHAMARA MOTORS AND STICKERS CENTER | SPONSER SHIP PACKEGE ON RIDAM FM EVENING SHOW | OCT - NOV 2026 | 200,000.00 | None (0%) | **200,000.00** | Non-VAT Radio Show | HARIPARA (PVT) LTD |

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 App Router, TypeScript, React 18
- **Styling**: Tailwind CSS with custom Deep Navy & Emerald theme
- **Icons**: Lucide React
- **UI Components**: Radix UI primitives
- **Database**: Supabase PostgreSQL with full 14-table migration schema
- **Export**: SheetJS (XLSX) for Excel / CSV analytics reports
- **Deployment**: Vercel ready

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional for Local Demo)
Copy the example environment file:
```bash
cp .env.example .env.local
```
To connect to live Supabase:
1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL script found in `supabase/migrations/20261109000000_init_sn_invoice.sql` in the Supabase SQL Editor.
3. Paste your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` into `.env.local`.

*Note: SN Invoice includes a built-in offline-first storage adapter with pre-seeded data, meaning the app works fully out of the box even before configuring Supabase!*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 📦 Database Architecture (14 Tables)

All tables, relationships, indexes, and collision-safe sequence functions are defined in:
`supabase/migrations/20261109000000_init_sn_invoice.sql`

1. `profiles`: User accounts and roles (`admin`, `staff`).
2. `clients`: Permanent advertiser records.
3. `billing_entities`: Issuing companies (SN Advertising, HARIPARA (PVT) LTD).
4. `services`: Advertising services catalog.
5. `client_services`: Special client pricing.
6. `invoice_templates`: Supported layouts (`standard`, `vat`, `sponsorship`, `custom`).
7. `invoice_number_sequences`: Collision-safe sequence generator.
8. `invoices`: Master invoice records with immutable client & billing snapshots.
9. `invoice_items`: Repeatable service rows with period, quantity, price.
10. `payments`: Payment ledger with method, date, reference.
11. `invoice_share_history`: WhatsApp, Email, and manual dispatch logs.
12. `branding_settings`: Logo, letterhead, and tax rates.
13. `app_settings`: System configurations.
14. `audit_logs`: Transactional audit history.

