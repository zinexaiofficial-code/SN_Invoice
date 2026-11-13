-- SN Invoice - Multi-Entity Architecture Upgrade Migration
-- Designed for Supabase PostgreSQL

-- 1. Upgrade billing_entities table with rich entity metadata
ALTER TABLE public.billing_entities 
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Kelaniya',
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Sri Lanka',
  ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS brn TEXT,
  ADD COLUMN IF NOT EXISTS is_vat_registered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS swift_code TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#059669',
  ADD COLUMN IF NOT EXISTS header_style TEXT DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS footer_text TEXT,
  ADD COLUMN IF NOT EXISTS starting_sequence INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_sequence INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'LKR',
  ADD COLUMN IF NOT EXISTS default_payment_terms TEXT DEFAULT 'Immediate',
  ADD COLUMN IF NOT EXISTS default_due_days INT DEFAULT 7,
  ADD COLUMN IF NOT EXISTS default_invoice_template TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS signatory_name TEXT,
  ADD COLUMN IF NOT EXISTS signatory_designation TEXT,
  ADD COLUMN IF NOT EXISTS invoice_notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived'));

-- 2. Entity Bank Accounts Table (Support multiple bank accounts per billing entity)
CREATE TABLE IF NOT EXISTS public.entity_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES public.billing_entities(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  swift_code TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on entity_bank_accounts
ALTER TABLE public.entity_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read entity bank accounts"
  ON public.entity_bank_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow owners and admins to manage entity bank accounts"
  ON public.entity_bank_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'owner')
    )
  );

-- 3. Upgrade initial seed data for SN Advertising and HARIPARA (PVT) LTD
UPDATE public.billing_entities
SET 
  display_name = 'SN Advertising',
  brn = 'PV-89241',
  is_vat_registered = false,
  vat_number = NULL,
  logo_url = '/logo.png',
  signatory_name = 'S. Nawagamuwa',
  signatory_designation = 'Managing Director',
  footer_text = 'Thank you for partnering with SN Advertising — Colombo, Sri Lanka',
  prefix = 'SN',
  starting_sequence = 23460,
  current_sequence = 23467,
  status = 'active'
WHERE id = 'e1111111-1111-1111-1111-111111111111';

UPDATE public.billing_entities
SET 
  display_name = 'HARIPARA (PVT) LTD',
  brn = 'PV-104928',
  is_vat_registered = true,
  vat_number = '114094498-7000',
  email = 'info@haripara.lk',
  website = 'www.haripara.lk',
  bank_name = 'Commercial Bank of Ceylon',
  branch = 'Kelaniya Branch',
  account_name = 'HARIPARA (PVT) LTD',
  account_number = '10002938475',
  swift_code = 'CCEYLKX',
  cheque_payee = 'HARIPARA(PVT)LTD',
  payment_instructions = 'Cheques should be drawn in favour of HARIPARA(PVT)LTD. and crossed "ACCOUNT PAYEE" only. Electronic transfers to Commercial Bank of Ceylon, Kelaniya Branch, A/C: 10002938475.',
  logo_url = '',
  signatory_name = 'Authorized Officer',
  signatory_designation = 'Director of Operations',
  footer_text = 'Official IRD Registered Tax Invoice — HARIPARA (PVT) LTD',
  prefix = 'HRP',
  starting_sequence = 1,
  current_sequence = 3,
  status = 'active'
WHERE id = 'e2222222-2222-2222-2222-222222222222';

