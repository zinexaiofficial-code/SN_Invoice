-- ==============================================================================
-- SN INVOICE — OPTIONAL SERVICE PERIOD & VAT DISPLAY CONTROL MIGRATION
-- Migration Version: 20261113020000_optional_service_period_and_vat_display.sql
-- Description: Adds columns to invoices table for optional invoice-level service period
--              and independent VAT display control (MODE A vs MODE B).
-- ==============================================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS include_service_period BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS service_period_start DATE,
  ADD COLUMN IF NOT EXISTS service_period_end DATE,
  ADD COLUMN IF NOT EXISTS taxable_base NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS show_vat_separately BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.invoices.include_service_period IS 'Whether to display the invoice-level service period on the PDF';
COMMENT ON COLUMN public.invoices.service_period_start IS 'Service period start date';
COMMENT ON COLUMN public.invoices.service_period_end IS 'Service period end date';
COMMENT ON COLUMN public.invoices.show_vat_separately IS 'When TRUE (MODE A): show VAT as separate line. When FALSE (MODE B): Total (Including VAT) without separate line';
COMMENT ON COLUMN public.invoices.taxable_base IS 'Taxable base subtotal on which VAT was computed';

