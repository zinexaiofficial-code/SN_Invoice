-- ==============================================================================
-- SN INVOICE — PRODUCTION PERSISTENCE & ROW LEVEL SECURITY FIX
-- Migration Version: 20261114030000_enable_app_persistence_and_rls.sql
-- Enables reliable read/write operations for invoices, clients, billing entities,
-- cheques, and services from the application frontend and server.
-- ==============================================================================

-- 1. Ensure ID columns on invoices and invoice_items accept flexible text/uuid keys
ALTER TABLE public.invoices ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.invoice_items ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.invoice_items ALTER COLUMN invoice_id TYPE TEXT;

-- 2. Enable RLS on core tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- 3. Invoices Policies
DROP POLICY IF EXISTS "Allow public read of invoices" ON public.invoices;
CREATE POLICY "Allow public read of invoices"
  ON public.invoices FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert of invoices" ON public.invoices;
CREATE POLICY "Allow insert of invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update of invoices" ON public.invoices;
CREATE POLICY "Allow update of invoices"
  ON public.invoices FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete of invoices" ON public.invoices;
CREATE POLICY "Allow delete of invoices"
  ON public.invoices FOR DELETE
  USING (true);

-- 4. Invoice Items Policies
DROP POLICY IF EXISTS "Allow public read of invoice_items" ON public.invoice_items;
CREATE POLICY "Allow public read of invoice_items"
  ON public.invoice_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert of invoice_items" ON public.invoice_items;
CREATE POLICY "Allow insert of invoice_items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update of invoice_items" ON public.invoice_items;
CREATE POLICY "Allow update of invoice_items"
  ON public.invoice_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete of invoice_items" ON public.invoice_items;
CREATE POLICY "Allow delete of invoice_items"
  ON public.invoice_items FOR DELETE
  USING (true);

-- 5. Clients Policies
DROP POLICY IF EXISTS "Allow public read of clients" ON public.clients;
CREATE POLICY "Allow public read of clients"
  ON public.clients FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert of clients" ON public.clients;
CREATE POLICY "Allow insert of clients"
  ON public.clients FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update of clients" ON public.clients;
CREATE POLICY "Allow update of clients"
  ON public.clients FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 6. Billing Entities Policies
DROP POLICY IF EXISTS "Allow public read of billing_entities" ON public.billing_entities;
CREATE POLICY "Allow public read of billing_entities"
  ON public.billing_entities FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert of billing_entities" ON public.billing_entities;
CREATE POLICY "Allow insert of billing_entities"
  ON public.billing_entities FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update of billing_entities" ON public.billing_entities;
CREATE POLICY "Allow update of billing_entities"
  ON public.billing_entities FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 7. Services Policies
DROP POLICY IF EXISTS "Allow public read of services" ON public.services;
CREATE POLICY "Allow public read of services"
  ON public.services FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert of services" ON public.services;
CREATE POLICY "Allow insert of services"
  ON public.services FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update of services" ON public.services;
CREATE POLICY "Allow update of services"
  ON public.services FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 8. Branding Settings Policies
DROP POLICY IF EXISTS "Allow public read of branding_settings" ON public.branding_settings;
CREATE POLICY "Allow public read of branding_settings"
  ON public.branding_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow update of branding_settings" ON public.branding_settings;
CREATE POLICY "Allow update of branding_settings"
  ON public.branding_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

