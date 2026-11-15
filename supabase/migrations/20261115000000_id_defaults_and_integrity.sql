-- ==============================================================================
-- SN INVOICE — ID DEFAULTS & REFERENTIAL INTEGRITY REPAIR
-- Migration Version: 20261115000000_id_defaults_and_integrity.sql
-- Enables automatic UUID generation for all primary keys when records are created
-- without an explicit ID.
-- ==============================================================================

ALTER TABLE public.clients ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.billing_entities ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.services ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.media_channels ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.invoices ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.invoice_items ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.payments ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.cheques ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.cheque_print_templates ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.cheque_printer_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.cheque_print_jobs ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

