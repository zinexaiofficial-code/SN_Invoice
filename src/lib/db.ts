import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

// Database Connection URL
const connectionString = process.env.DATABASE_URL || '';

let pool: Pool | null = null;
let isDbInitialized = false;

// Return a persistent pool if DATABASE_URL is configured
export function getDbPool(): Pool | null {
  if (pool) return pool;
  if (!connectionString) {
    return null;
  }

  try {
    const isSslRequired = connectionString.includes('sslmode=require') || connectionString.includes('supabase.co');
    pool = new Pool({
      connectionString,
      ssl: isSslRequired ? { rejectUnauthorized: false } : undefined,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });

    return pool;
  } catch (err) {
    console.error('Failed to create PostgreSQL pool:', err);
    return null;
  }
}

// Fallback JSON-based persistent file path for environments without active Postgres (e.g. Next.js build step)
function getFallbackDbPath(): string {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'sn_invoice_persistent_db.json');
}

export function readFallbackDb(): any {
  const filePath = getFallbackDbPath();
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  return null;
}

export function writeFallbackDb(data: any): void {
  const filePath = getFallbackDbPath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write fallback database:', err);
  }
}

// Automatic Schema Initialization & Migration
export async function initializeDatabase(): Promise<boolean> {
  if (isDbInitialized) return true;
  const p = getDbPool();
  if (!p) {
    console.warn('DATABASE_URL not set. Running in resilient persistent file mode.');
    return false;
  }

  let client: PoolClient | null = null;
  try {
    client = await p.connect();
    await client.query('BEGIN');

    // 1. Billing Entities
    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        legal_name TEXT,
        is_default BOOLEAN DEFAULT false,
        brn TEXT,
        vat_number TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        logo_url TEXT,
        bank_name TEXT,
        bank_account_number TEXT,
        bank_branch TEXT,
        bank_account_name TEXT,
        invoice_prefix TEXT DEFAULT 'INV',
        invoice_next_number INTEGER DEFAULT 1,
        payee_name TEXT,
        signatory_name TEXT,
        signatory_designation TEXT,
        signatory_email TEXT,
        signature_enabled BOOLEAN DEFAULT true,
        display_signature_image BOOLEAN DEFAULT true,
        verification_enabled BOOLEAN DEFAULT true,
        show_qr_code BOOLEAN DEFAULT true,
        signature_image_url TEXT,
        is_archived BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS address_line1 TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS address_line2 TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS city TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS postal_code TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS country TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS website TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS swift_code TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS primary_color TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS secondary_color TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS header_style TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS footer_text TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS starting_sequence INTEGER DEFAULT 1;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'LKR';
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS default_payment_terms TEXT DEFAULT 'Immediate';
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS default_due_days INTEGER DEFAULT 7;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS default_invoice_template TEXT DEFAULT 'standard';
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS invoice_notes TEXT;
      ALTER TABLE billing_entities ADD COLUMN IF NOT EXISTS default_pdf_layout JSONB;
    `);

    // 2. Clients
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        client_code TEXT,
        company_name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        whatsapp_number TEXT,
        address TEXT,
        vat_number TEXT,
        brn TEXT,
        default_payment_terms TEXT DEFAULT 'Payment on Delivery',
        default_vat_preference TEXT DEFAULT 'standard',
        default_billing_entity_id TEXT,
        default_advance_percentage NUMERIC DEFAULT 0,
        notes TEXT,
        is_archived BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_code_key;
    `);

    // 3. Services
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        media_channel TEXT,
        default_description TEXT,
        default_price NUMERIC DEFAULT 0,
        subject_to_vat BOOLEAN DEFAULT true,
        default_reference_type TEXT,
        default_reference_number TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Media Channels
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_channels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Invoices
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT NOT NULL UNIQUE,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        billing_entity_id TEXT NOT NULL REFERENCES billing_entities(id) ON DELETE RESTRICT,
        template_key TEXT DEFAULT 'standard',
        status TEXT DEFAULT 'draft',
        payment_status TEXT DEFAULT 'unpaid',
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        sent_at TIMESTAMPTZ,
        sent_channel TEXT,
        delivery_confirmed BOOLEAN DEFAULT false,
        delivery_confirmed_at TIMESTAMPTZ,
        subject_to_vat BOOLEAN DEFAULT false,
        vat_rate NUMERIC DEFAULT 18,
        subtotal NUMERIC DEFAULT 0,
        vat_amount NUMERIC DEFAULT 0,
        grand_total NUMERIC DEFAULT 0,
        paid_amount NUMERIC DEFAULT 0,
        outstanding_balance NUMERIC DEFAULT 0,
        advance_percentage NUMERIC DEFAULT 0,
        advance_amount NUMERIC DEFAULT 0,
        notes TEXT,
        client_snapshot JSONB,
        billing_entity_snapshot JSONB,
        verification_token TEXT UNIQUE,
        verification_status TEXT DEFAULT 'valid',
        approval_snapshot JSONB,
        pdf_layout JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 6. Invoice Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        service_id TEXT,
        service_name TEXT NOT NULL,
        description TEXT,
        quantity NUMERIC NOT NULL DEFAULT 1,
        unit_price NUMERIC NOT NULL DEFAULT 0,
        amount NUMERIC NOT NULL DEFAULT 0,
        service_period TEXT,
        advertising_period TEXT,
        media_channel TEXT,
        reference_type TEXT,
        reference_number TEXT,
        show_reference_in_description BOOLEAN DEFAULT false,
        show_service_period BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 7. Payments
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        payment_date DATE NOT NULL,
        payment_method TEXT NOT NULL,
        reference TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 8. Cheques
    await client.query(`
      CREATE TABLE IF NOT EXISTS cheques (
        id TEXT PRIMARY KEY,
        cheque_number TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        bank_branch TEXT,
        amount NUMERIC NOT NULL,
        issue_date DATE NOT NULL,
        cheque_date DATE NOT NULL,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        billing_entity_id TEXT REFERENCES billing_entities(id) ON DELETE SET NULL,
        invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
        payee_name TEXT,
        status TEXT DEFAULT 'pending',
        drawer_name TEXT,
        notes TEXT,
        image_url TEXT,
        reminders_enabled BOOLEAN DEFAULT true,
        reminder_days_before INTEGER DEFAULT 3,
        last_reminder_sent_at TIMESTAMPTZ,
        cleared_date DATE,
        bounced_date DATE,
        bounced_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE cheques ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'incoming';
      ALTER TABLE cheques ADD COLUMN IF NOT EXISTS vendor_id TEXT;
      ALTER TABLE cheques ADD COLUMN IF NOT EXISTS purpose_of_payment TEXT;
      ALTER TABLE cheques ADD COLUMN IF NOT EXISTS bill_reference TEXT;
      ALTER TABLE cheques ADD COLUMN IF NOT EXISTS bank_account_id TEXT;
      ALTER TABLE cheques ADD COLUMN IF NOT EXISTS image_back_url TEXT;
      ALTER TABLE cheques ADD COLUMN IF NOT EXISTS expected_action_date DATE;
    `);

    // 8b. Vendors / Suppliers Directory
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        tax_number TEXT,
        default_bank TEXT,
        default_branch TEXT,
        default_account_no TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      -- Auto-seed vendors from distinct outgoing cheques if not existing
      INSERT INTO vendors (id, name, is_active, created_at, updated_at)
      SELECT gen_random_uuid()::text, payee_name, true, NOW(), NOW()
      FROM cheques
      WHERE type = 'outgoing' AND payee_name IS NOT NULL AND TRIM(payee_name) != ''
        AND NOT EXISTS (SELECT 1 FROM vendors v WHERE LOWER(v.name) = LOWER(cheques.payee_name))
      GROUP BY payee_name;
    `);

    // 9. Branding Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS branding_settings (
        id TEXT PRIMARY KEY DEFAULT 'default',
        company_name TEXT NOT NULL DEFAULT 'SN Advertising',
        tagline TEXT,
        logo_url TEXT,
        primary_color TEXT DEFAULT '#0B1D3A',
        secondary_color TEXT DEFAULT '#10B981',
        font_family TEXT DEFAULT 'Inter',
        invoice_header_note TEXT,
        invoice_footer_note TEXT,
        vat_registration_number TEXT,
        brn_number TEXT,
        default_vat_rate NUMERIC DEFAULT 18,
        default_currency TEXT DEFAULT 'LKR',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 10. Cheque Print Templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS cheque_print_templates (
        id TEXT PRIMARY KEY,
        bank_name TEXT NOT NULL,
        template_name TEXT NOT NULL,
        cheque_width NUMERIC NOT NULL DEFAULT 178,
        cheque_height NUMERIC NOT NULL DEFAULT 89,
        a4_orientation TEXT NOT NULL DEFAULT 'landscape',
        a4_rotation INTEGER NOT NULL DEFAULT 0,
        cheque_rotation INTEGER NOT NULL DEFAULT 0,
        feed_direction TEXT NOT NULL DEFAULT 'top',
        cheque_x NUMERIC NOT NULL DEFAULT 10,
        cheque_y NUMERIC NOT NULL DEFAULT 10,
        fields JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 11. Cheque Printer Profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS cheque_printer_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        offset_x NUMERIC NOT NULL DEFAULT 0,
        offset_y NUMERIC NOT NULL DEFAULT 0,
        rotation_correction INTEGER NOT NULL DEFAULT 0,
        feed_notes TEXT DEFAULT '',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 12. Cheque Print Jobs
    await client.query(`
      CREATE TABLE IF NOT EXISTS cheque_print_jobs (
        id TEXT PRIMARY KEY,
        cheque_id TEXT,
        template_id TEXT,
        printer_profile_id TEXT,
        print_type TEXT NOT NULL DEFAULT 'final',
        printed_at TIMESTAMPTZ DEFAULT NOW(),
        settings_snapshot JSONB DEFAULT '{}'::jsonb
      );
    `);

    // Invoices additions for media schedules
    await client.query(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS media_schedule_id TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS media_schedule_number TEXT;
    `);

    // 13. Media Schedules
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_schedules (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        schedule_number TEXT NOT NULL UNIQUE,
        billing_entity_id TEXT NOT NULL REFERENCES billing_entities(id) ON DELETE RESTRICT,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        media_channel_id TEXT,
        media_channel_name TEXT NOT NULL,
        media_type TEXT DEFAULT 'tv',
        campaign_name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status TEXT DEFAULT 'draft',
        pricing_mode TEXT DEFAULT 'package',
        total_spots INTEGER DEFAULT 0,
        package_amount NUMERIC DEFAULT 0,
        rate_per_spot NUMERIC DEFAULT 0,
        gross_amount NUMERIC DEFAULT 0,
        discount_amount NUMERIC DEFAULT 0,
        tax_applicable BOOLEAN DEFAULT false,
        tax_rate NUMERIC DEFAULT 0,
        tax_amount NUMERIC DEFAULT 0,
        net_total NUMERIC DEFAULT 0,
        currency TEXT DEFAULT 'LKR',
        special_notes TEXT,
        terms_and_conditions TEXT,
        pdf_orientation TEXT DEFAULT 'landscape',
        pdf_paper_size TEXT DEFAULT 'A4',
        pdf_template_settings JSONB,
        converted_to_invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
        converted_to_invoice_number TEXT,
        converted_at TIMESTAMPTZ,
        client_snapshot JSONB,
        billing_entity_snapshot JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_media_schedules_client ON media_schedules(client_id);
      CREATE INDEX IF NOT EXISTS idx_media_schedules_entity ON media_schedules(billing_entity_id);
      CREATE INDEX IF NOT EXISTS idx_media_schedules_status ON media_schedules(status);
    `);

    // 14. Media Schedule Items (Programmes)
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_schedule_items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        schedule_id TEXT NOT NULL REFERENCES media_schedules(id) ON DELETE CASCADE,
        programme_name TEXT NOT NULL,
        time_slot TEXT,
        duration TEXT,
        ad_type TEXT,
        rate_per_spot NUMERIC DEFAULT 0,
        total_spots INTEGER DEFAULT 0,
        total_amount NUMERIC DEFAULT 0,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_media_schedule_items_sched ON media_schedule_items(schedule_id);
    `);

    // 15. Media Schedule Allocations (Daily Spots)
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_schedule_allocations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        schedule_id TEXT NOT NULL REFERENCES media_schedules(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL REFERENCES media_schedule_items(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        spots INTEGER NOT NULL DEFAULT 0,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_schedule_item_date UNIQUE(item_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_media_schedule_alloc_sched ON media_schedule_allocations(schedule_id);
      CREATE INDEX IF NOT EXISTS idx_media_schedule_alloc_item ON media_schedule_allocations(item_id);
    `);

    // 16. Media Schedule Templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS media_schedule_templates (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        billing_entity_id TEXT REFERENCES billing_entities(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        orientation TEXT DEFAULT 'landscape',
        paper_size TEXT DEFAULT 'A4',
        settings JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 17. Suppliers
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        supplier_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'tv',
        business_address TEXT,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        tax_number TEXT,
        bank_name TEXT,
        branch TEXT,
        account_name TEXT,
        account_number TEXT,
        swift_code TEXT,
        payment_terms TEXT DEFAULT 'Net 30',
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
      CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
    `);

    // 18. Supplier Channels Link
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_channels (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        channel_name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_supplier_channel UNIQUE(supplier_id, channel_name)
      );
      CREATE INDEX IF NOT EXISTS idx_supplier_channels_supp ON supplier_channels(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_channels_chan ON supplier_channels(channel_name);
    `);

    // 19. Supplier Payables
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_payables (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        payable_reference TEXT NOT NULL UNIQUE,
        billing_entity_id TEXT NOT NULL REFERENCES billing_entities(id) ON DELETE RESTRICT,
        supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
        schedule_id TEXT REFERENCES media_schedules(id) ON DELETE SET NULL,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        broadcast_channel TEXT,
        campaign_name TEXT,
        supplier_bill_number TEXT,
        bill_date DATE NOT NULL,
        due_date DATE NOT NULL,
        description TEXT,
        subtotal NUMERIC NOT NULL DEFAULT 0,
        discount NUMERIC DEFAULT 0,
        tax_applicable BOOLEAN DEFAULT false,
        tax_rate NUMERIC DEFAULT 0,
        tax_amount NUMERIC DEFAULT 0,
        total_amount NUMERIC NOT NULL DEFAULT 0,
        total_paid NUMERIC NOT NULL DEFAULT 0,
        outstanding_amount NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'unpaid',
        notes TEXT,
        attachment_url TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_supplier_payables_entity ON supplier_payables(billing_entity_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_payables_supplier ON supplier_payables(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_payables_schedule ON supplier_payables(schedule_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_payables_status ON supplier_payables(status);
      CREATE INDEX IF NOT EXISTS idx_supplier_payables_due_date ON supplier_payables(due_date);
    `);

    // 20. Supplier Payment Transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_payment_transactions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        payable_id TEXT NOT NULL REFERENCES supplier_payables(id) ON DELETE CASCADE,
        payment_reference TEXT NOT NULL,
        payment_date DATE NOT NULL,
        amount NUMERIC NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
        reference_number TEXT,
        cheque_id TEXT REFERENCES cheques(id) ON DELETE SET NULL,
        bank_account_info TEXT,
        receipt_url TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'posted',
        recorded_by TEXT,
        void_reason TEXT,
        voided_at TIMESTAMPTZ,
        voided_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_supplier_pmts_payable ON supplier_payment_transactions(payable_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_pmts_cheque ON supplier_payment_transactions(cheque_id);
      CREATE INDEX IF NOT EXISTS idx_supplier_pmts_date ON supplier_payment_transactions(payment_date);
    `);

    await client.query('COMMIT');
    isDbInitialized = true;
    console.log('✅ PostgreSQL Schema Verified & Initialized successfully.');
    return true;
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Error during database schema migration:', err);
    return false;
  } finally {
    if (client) client.release();
  }
}
