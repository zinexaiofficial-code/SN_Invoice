-- ==============================================================================
-- SN INVOICE — CHEQUE MANAGEMENT & SMART REMINDER MODULE MIGRATION
-- Migration Version: 20261113010000_cheque_management.sql
-- Description: Creates tables for incoming & outgoing cheques, status history,
--              invoice allocations, automated reminder alerts, and notification preferences.
-- ==============================================================================

-- 1. CHEQUES TABLE
CREATE TABLE IF NOT EXISTS public.cheques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing')),
  cheque_number TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'LKR',
  cheque_date DATE NOT NULL,
  received_or_issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_action_date DATE NOT NULL,
  actual_clearance_date DATE,
  
  -- Banking Details
  drawer_bank TEXT NOT NULL,
  branch TEXT,
  bank_account_id TEXT,
  bank_account_number TEXT,
  payer_or_payee_name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  supplier_name TEXT,
  
  -- Billing Entity Reference
  billing_entity_id UUID NOT NULL REFERENCES public.billing_entities(id) ON DELETE RESTRICT,
  
  -- Status & Alert States
  status TEXT NOT NULL DEFAULT 'received',
  alert_state TEXT NOT NULL DEFAULT 'normal',
  
  -- References & Notes
  purpose_of_payment TEXT,
  bill_reference TEXT,
  notes TEXT,
  
  -- Cheque Attachments (Front & Back URLs)
  image_front_url TEXT,
  image_back_url TEXT,
  
  -- Reminder Config
  is_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Returned Cheque Specifics
  follow_up_date DATE,
  return_reason TEXT,
  bank_charges NUMERIC(10, 2) DEFAULT 0,
  replacement_cheque_ref TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for high-performance dashboard and register queries
CREATE INDEX IF NOT EXISTS idx_cheques_entity ON public.cheques(billing_entity_id);
CREATE INDEX IF NOT EXISTS idx_cheques_type ON public.cheques(type);
CREATE INDEX IF NOT EXISTS idx_cheques_status ON public.cheques(status);
CREATE INDEX IF NOT EXISTS idx_cheques_action_date ON public.cheques(expected_action_date);
CREATE INDEX IF NOT EXISTS idx_cheques_number ON public.cheques(cheque_number);

-- 2. CHEQUE INVOICE ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.cheque_invoice_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cheque_id UUID NOT NULL REFERENCES public.cheques(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  allocated_amount NUMERIC(14, 2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cheque_alloc_cheque_id ON public.cheque_invoice_allocations(cheque_id);
CREATE INDEX IF NOT EXISTS idx_cheque_alloc_invoice_id ON public.cheque_invoice_allocations(invoice_id);

-- 3. CHEQUE STATUS HISTORY (AUDIT TRAIL) TABLE
CREATE TABLE IF NOT EXISTS public.cheque_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cheque_id UUID NOT NULL REFERENCES public.cheques(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by TEXT,
  notes TEXT,
  return_reason TEXT,
  bank_charges NUMERIC(10, 2),
  follow_up_date DATE,
  replacement_cheque_ref TEXT
);

CREATE INDEX IF NOT EXISTS idx_cheque_history_cheque ON public.cheque_status_history(cheque_id);

-- 4. CHEQUE REMINDERS TABLE
CREATE TABLE IF NOT EXISTS public.cheque_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cheque_id UUID NOT NULL REFERENCES public.cheques(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  reminder_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  snoozed_until TIMESTAMPTZ,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cheque_reminders_date ON public.cheque_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_cheque_reminders_status ON public.cheque_reminders(is_dismissed, is_read);

-- 5. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_entity_id UUID REFERENCES public.billing_entities(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_recipient TEXT NOT NULL DEFAULT 'snadvertising@hotmail.com',
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  daily_summary_time TEXT NOT NULL DEFAULT '08:30',
  alert_on_overdue BOOLEAN NOT NULL DEFAULT TRUE,
  alert_on_returned BOOLEAN NOT NULL DEFAULT TRUE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Colombo',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheque_invoice_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheque_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheque_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full read/write access
CREATE POLICY "Allow authenticated read/write cheques"
  ON public.cheques FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write allocations"
  ON public.cheque_invoice_allocations FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write history"
  ON public.cheque_status_history FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write reminders"
  ON public.cheque_reminders FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read/write notification_preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
