-- SN Invoice - Complete Database Schema Migration
-- Designed for Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'owner', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BILLING ENTITIES
CREATE TABLE IF NOT EXISTS public.billing_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  bank_name TEXT,
  branch TEXT,
  account_name TEXT,
  account_number TEXT,
  cheque_payee TEXT NOT NULL,
  vat_number TEXT,
  payment_instructions TEXT,
  prefix TEXT NOT NULL DEFAULT 'SN',
  signature_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  contact_person TEXT,
  mobile TEXT,
  whatsapp TEXT,
  email TEXT,
  vat_number TEXT,
  brn TEXT,
  default_vat_preference BOOLEAN NOT NULL DEFAULT false,
  default_billing_entity_id UUID REFERENCES public.billing_entities(id) ON DELETE SET NULL,
  default_payment_terms TEXT DEFAULT 'Immediate',
  default_advance_percentage NUMERIC(5, 2) DEFAULT 0,
  default_note TEXT,
  internal_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SERVICES
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  default_description TEXT,
  default_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  vat_applicable BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CLIENT SERVICES (Special Pricing per Client)
CREATE TABLE IF NOT EXISTS public.client_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  special_price NUMERIC(12, 2) NOT NULL,
  custom_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, service_id)
);

-- 6. INVOICE TEMPLATES
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INVOICE NUMBER SEQUENCES (Collision-safe running numbers)
CREATE TABLE IF NOT EXISTS public.invoice_number_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prefix TEXT NOT NULL DEFAULT 'SN',
  year INT NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prefix, year)
);

-- 8. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  billing_entity_id UUID NOT NULL REFERENCES public.billing_entities(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES public.invoice_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'void')),
  
  -- Date Dimensions
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  issued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  service_period_start DATE,
  service_period_end DATE,
  service_period_text TEXT,
  
  -- Reference fields
  product TEXT,
  reg_no TEXT,
  your_ref TEXT,
  
  -- Financials
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  vat_applicable BOOLEAN NOT NULL DEFAULT false,
  vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  vat_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  
  -- Advance & Notes
  advance_percentage NUMERIC(5, 2) DEFAULT 0.00,
  advance_amount NUMERIC(12, 2) DEFAULT 0.00,
  special_notes TEXT,
  payment_instructions TEXT,
  
  -- Sent & Payment Tracking
  sent_status TEXT NOT NULL DEFAULT 'not_sent' CHECK (sent_status IN ('not_sent', 'sent', 'delivery_confirmed')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'overdue', 'voided')),
  total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  
  -- Immutability Snapshots
  client_snapshot JSONB NOT NULL,
  billing_snapshot JSONB NOT NULL,
  
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  description TEXT NOT NULL,
  service_period TEXT,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sort_order INT NOT NULL DEFAULT 0
);

-- 10. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque')),
  transaction_ref TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. INVOICE SHARE HISTORY
CREATE TABLE IF NOT EXISTS public.invoice_share_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'manual', 'download')),
  recipient TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivery_confirmed', 'failed')),
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- 12. BRANDING SETTINGS
CREATE TABLE IF NOT EXISTS public.branding_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL DEFAULT 'SN Advertising',
  logo_url TEXT,
  letterhead_url TEXT,
  signature_url TEXT,
  phone TEXT DEFAULT '+94 11 772 8282 / +94 77 400 0004',
  email TEXT DEFAULT 'snadvertising@hotmail.com',
  address TEXT DEFAULT '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
  default_currency TEXT NOT NULL DEFAULT 'LKR',
  default_vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. APP SETTINGS
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES for high performance queries
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_at ON public.invoices(sent_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON public.invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_status ON public.invoices(sent_status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_date ON public.invoices(client_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_share_history_invoice_id ON public.invoice_share_history(invoice_id);

-- FUNCTION: Collision-safe next running invoice number
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_prefix TEXT, p_year INT)
RETURNS TEXT AS $$
DECLARE
  v_next_val INT;
  v_formatted TEXT;
BEGIN
  INSERT INTO public.invoice_number_sequences (prefix, year, last_number, updated_at)
  VALUES (p_prefix, p_year, 23467, NOW())
  ON CONFLICT (prefix, year)
  DO UPDATE SET last_number = public.invoice_number_sequences.last_number + 1, updated_at = NOW()
  RETURNING last_number INTO v_next_val;
  
  -- If continuing legacy running number (e.g. 23467)
  IF p_prefix = 'LEGACY' THEN
    RETURN v_next_val::TEXT;
  ELSE
    RETURN p_prefix || '-' || p_year::TEXT || '-' || LPAD(v_next_val::TEXT, 5, '0');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SEED DATA
-- Billing Entities
INSERT INTO public.billing_entities (id, name, address, phone, email, bank_name, branch, account_name, account_number, cheque_payee, vat_number, payment_instructions, prefix)
VALUES
(
  'e1111111-1111-1111-1111-111111111111',
  'SN Advertising',
  '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
  '+94 11 772 8282 / +94 77 400 0004 / +94 77 462 6262',
  'snadvertising@hotmail.com',
  'Seylan Bank',
  'Kadawatha Branch',
  'SN Advertising',
  '028013149867001',
  'SN ADVERTISING',
  NULL,
  'Cheques should be drawn in favour of SN ADVERTISING. and crossed "ACCOUNT PAYEE" only. Bank transfers may be made to SN Advertising, Account No. 028013149867001, Seylan Bank – Kadawatha Branch.',
  'SN'
),
(
  'e2222222-2222-2222-2222-222222222222',
  'HARIPARA (PVT) LTD',
  '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
  '+94 11 772 8282 / +94 77 400 0004',
  'snadvertising@hotmail.com',
  'Commercial Bank',
  'Kelaniya Branch',
  'HARIPARA (PVT) LTD',
  '10002938475',
  'HARIPARA(PVT)LTD',
  '114094498-7000',
  'Cheques should be drawn in favour of HARIPARA(PVT)LTD. and crossed "ACCOUNT PAYEE" only.',
  'HRP'
)
ON CONFLICT DO NOTHING;

-- Invoice Templates
INSERT INTO public.invoice_templates (id, key, name, description, is_active, is_default)
VALUES
('t1111111-1111-1111-1111-111111111111', 'standard', 'Standard Advertising Invoice', 'Original SN Advertising classic letterhead and clean advertising layout', true, true),
('t2222222-2222-2222-2222-222222222222', 'vat', 'VAT Invoice', 'Tax invoice compliant with Sri Lanka IRD VAT requirements displaying issuer and client VAT registration numbers', true, false),
('t3333333-3333-3333-3333-333333333333', 'sponsorship', 'Sponsorship Invoice', 'Optimized for radio and media channel sponsorships with broadcasting period and program slots', true, false),
('t4444444-4444-4444-4444-444444444444', 'custom', 'Custom Commercial Invoice', 'Modern layout supporting comprehensive project scopes and multiple line items', true, false)
ON CONFLICT (key) DO NOTHING;

-- Services Catalog
INSERT INTO public.services (id, name, default_description, default_price, vat_applicable)
VALUES
('s1111111-1111-1111-1111-111111111111', 'Video Campaign with Presenter (3 Clips)', 'Video Campaign with Presenter (3 Clips)', 125000.00, false),
('s2222222-2222-2222-2222-222222222222', 'Sponsorship Package on Run FM', 'Sponsorship package on Run FM broadcasting service', 300000.00, true),
('s3333333-3333-3333-3333-333333333333', 'Sponsorship Package on Ridam FM Evening Show', 'Sponsorship package on Ridam FM Evening Show broadcasting slot', 200000.00, false),
('s4444444-4444-4444-4444-444444444444', 'Social Media Advertising Campaign', 'Monthly digital paid campaign management across Facebook, Instagram, and TikTok', 75000.00, false),
('s5555555-5555-5555-5555-555555555555', 'Sticker Advertising & Vehicle Branding', 'Commercial vehicle and fleet sticker branding, printing, and installation', 85000.00, false),
('s6666666-6666-6666-6666-666666666666', 'Video Production & Editing', 'Scripting, filming, voiceover, color grading, and final high-definition render', 150000.00, false)
ON CONFLICT DO NOTHING;

-- Default Clients
INSERT INTO public.clients (id, name, code, address, contact_person, mobile, whatsapp, email, vat_number, default_vat_preference, default_billing_entity_id, default_advance_percentage, default_note)
VALUES
(
  'c1111111-1111-1111-1111-111111111111',
  'Araliya Lands and Homes (Pvt) Ltd',
  'ARL-001',
  'Kadawatha 11850',
  'Marketing Director',
  '+94 77 123 4567',
  '+94 77 123 4567',
  'info@araliyaland.lk',
  NULL,
  false,
  'e1111111-1111-1111-1111-111111111111',
  75.00,
  '75% Advance Payment to Proceed with Work'
),
(
  'c2222222-2222-2222-2222-222222222222',
  'CHAMARA MOTORS AND STICKERS CENTER',
  'CHM-001',
  '31, Kandy Road Kirillwala, Kadawatha',
  'Mr. Chamara',
  '+94 77 987 6543',
  '+94 77 987 6543',
  'chamara.motors@gmail.com',
  '100958996 - 7000',
  true,
  'e2222222-2222-2222-2222-222222222222',
  0.00,
  NULL
)
ON CONFLICT (code) DO NOTHING;

-- Branding Settings
INSERT INTO public.branding_settings (id, business_name, logo_url, phone, email, address, default_currency, default_vat_rate)
VALUES
(
  'b1111111-1111-1111-1111-111111111111',
  'SN Advertising',
  '/logo.png',
  '+94 11 772 8282 / +94 77 400 0004 / +94 77 462 6262',
  'snadvertising@hotmail.com',
  '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
  'LKR',
  18.00
)
ON CONFLICT DO NOTHING;

