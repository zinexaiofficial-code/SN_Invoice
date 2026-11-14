-- SN Invoice - Digital Signatures, Online Verification & Approvals Migration
-- Designed for Supabase PostgreSQL

-- 1. Upgrade billing_entities table with digital signature & verification configuration
ALTER TABLE public.billing_entities 
  ADD COLUMN IF NOT EXISTS signatory_email TEXT,
  ADD COLUMN IF NOT EXISTS signature_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_signature_image BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS verification_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS signature_image_url TEXT;

-- 2. Entity Signature Settings Table (Dedicated entity configuration for approvals & verification)
CREATE TABLE IF NOT EXISTS public.entity_signature_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES public.billing_entities(id) ON DELETE CASCADE,
  signatory_name TEXT NOT NULL,
  signatory_designation TEXT NOT NULL,
  signatory_email TEXT,
  signature_image_url TEXT,
  signature_enabled BOOLEAN NOT NULL DEFAULT true,
  display_signature_image BOOLEAN NOT NULL DEFAULT true,
  verification_enabled BOOLEAN NOT NULL DEFAULT true,
  show_qr_code BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id)
);

-- Enable RLS on entity_signature_settings
ALTER TABLE public.entity_signature_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of active entity signature settings"
  ON public.entity_signature_settings FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated admins to manage entity signature settings"
  ON public.entity_signature_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'owner')
    )
  );

-- 3. Upgrade invoices table with digital verification metadata
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS verification_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'valid' CHECK (verification_status IN ('valid', 'voided', 'superseded', 'revoked')),
  ADD COLUMN IF NOT EXISTS canonical_hash TEXT,
  ADD COLUMN IF NOT EXISTS approval_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_invoices_verification_token ON public.invoices(verification_token);

-- 4. Invoice Approvals Table (Audit trail of authorized issuance & digital approval)
CREATE TABLE IF NOT EXISTS public.invoice_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.billing_entities(id) ON DELETE RESTRICT,
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signatory_name_snapshot TEXT NOT NULL,
  signatory_designation_snapshot TEXT NOT NULL,
  signatory_email_snapshot TEXT,
  approval_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approval_timezone TEXT NOT NULL DEFAULT 'Asia/Colombo',
  invoice_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'voided', 'superseded')),
  approval_action TEXT NOT NULL DEFAULT 'issued_and_approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on invoice_approvals
ALTER TABLE public.invoice_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of approval metadata for verification"
  ON public.invoice_approvals FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated staff to create approval records"
  ON public.invoice_approvals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow admins to update approval records"
  ON public.invoice_approvals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE INDEX IF NOT EXISTS idx_invoice_approvals_invoice_id ON public.invoice_approvals(invoice_id);

-- 5. Invoice Verifications Table (Document integrity, verification reference & hash tracking)
CREATE TABLE IF NOT EXISTS public.invoice_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  verification_token TEXT NOT NULL UNIQUE,
  verification_token_hash TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'valid' CHECK (verification_status IN ('valid', 'voided', 'superseded', 'revoked')),
  issued_snapshot_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Enable RLS on invoice_verifications
ALTER TABLE public.invoice_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of invoice verifications"
  ON public.invoice_verifications FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated staff to insert invoice verifications"
  ON public.invoice_verifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_invoice_verifications_token ON public.invoice_verifications(verification_token);

-- 6. Initial Seed Configuration for Billing Entities
-- SN Advertising: Authorized Signatory Shafil Surantha
UPDATE public.billing_entities
SET 
  signatory_name = 'Shafil Surantha',
  signatory_designation = 'Authorized Signatory',
  signatory_email = 'snadvertising@hotmail.com',
  signature_image_url = '/signature-sample.png',
  signature_enabled = true,
  display_signature_image = true,
  verification_enabled = true,
  show_qr_code = true
WHERE id = 'e1111111-1111-1111-1111-111111111111';

INSERT INTO public.entity_signature_settings (
  entity_id,
  signatory_name,
  signatory_designation,
  signatory_email,
  signature_image_url,
  signature_enabled,
  display_signature_image,
  verification_enabled,
  show_qr_code
) VALUES (
  'e1111111-1111-1111-1111-111111111111',
  'Shafil Surantha',
  'Authorized Signatory',
  'snadvertising@hotmail.com',
  '/signature-sample.png',
  true,
  true,
  true,
  true
) ON CONFLICT (entity_id) DO UPDATE SET
  signatory_name = EXCLUDED.signatory_name,
  signatory_designation = EXCLUDED.signatory_designation,
  signatory_email = EXCLUDED.signatory_email,
  signature_image_url = EXCLUDED.signature_image_url,
  signature_enabled = EXCLUDED.signature_enabled,
  display_signature_image = EXCLUDED.display_signature_image,
  verification_enabled = EXCLUDED.verification_enabled,
  show_qr_code = EXCLUDED.show_qr_code,
  updated_at = NOW();

-- HARIPARA (PVT) LTD: Independent Authorized Signatory Settings
UPDATE public.billing_entities
SET 
  signatory_name = 'Authorized Officer',
  signatory_designation = 'Director of Operations',
  signatory_email = 'info@haripara.lk',
  signature_image_url = NULL,
  signature_enabled = true,
  display_signature_image = false,
  verification_enabled = true,
  show_qr_code = true
WHERE id = 'e2222222-2222-2222-2222-222222222222';

INSERT INTO public.entity_signature_settings (
  entity_id,
  signatory_name,
  signatory_designation,
  signatory_email,
  signature_image_url,
  signature_enabled,
  display_signature_image,
  verification_enabled,
  show_qr_code
) VALUES (
  'e2222222-2222-2222-2222-222222222222',
  'Authorized Officer',
  'Director of Operations',
  'info@haripara.lk',
  NULL,
  true,
  false,
  true,
  true
) ON CONFLICT (entity_id) DO UPDATE SET
  signatory_name = EXCLUDED.signatory_name,
  signatory_designation = EXCLUDED.signatory_designation,
  signatory_email = EXCLUDED.signatory_email,
  signature_image_url = EXCLUDED.signature_image_url,
  signature_enabled = EXCLUDED.signature_enabled,
  display_signature_image = EXCLUDED.display_signature_image,
  verification_enabled = EXCLUDED.verification_enabled,
  show_qr_code = EXCLUDED.show_qr_code,
  updated_at = NOW();

