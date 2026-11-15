-- Migration: Add detailed address and entity configuration columns to billing_entities
-- Allows distinct persistence of address_line1, address_line2, city, postal_code, country, and configuration

ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Sri Lanka';
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS swift_code TEXT;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0f172a';
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#059669';
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS header_style TEXT DEFAULT 'classic';
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS footer_text TEXT;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS starting_sequence INTEGER DEFAULT 1;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'LKR';
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS default_payment_terms TEXT DEFAULT 'Immediate';
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS default_due_days INTEGER DEFAULT 7;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS default_invoice_template TEXT DEFAULT 'standard';
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS invoice_notes TEXT;
ALTER TABLE public.billing_entities ADD COLUMN IF NOT EXISTS default_pdf_layout JSONB;
