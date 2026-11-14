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
    `);

    // 2. Clients
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        client_code TEXT UNIQUE,
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
