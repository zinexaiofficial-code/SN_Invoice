import { getDbPool, initializeDatabase, readFallbackDb, writeFallbackDb } from '@/lib/db';
import {
  BillingEntity,
  Client,
  Service,
  Invoice,
  InvoiceItem,
  Cheque,
  ChequeType,
  BrandingSettings,
  MediaChannel,
} from '@/types';
import {
  INITIAL_BILLING_ENTITIES,
  INITIAL_CLIENTS,
  INITIAL_SERVICES,
  INITIAL_MEDIA_CHANNELS,
  INITIAL_INVOICES,
  INITIAL_BRANDING,
} from '@/lib/storage';

interface BootstrapData {
  billingEntities: BillingEntity[];
  clients: Client[];
  services: Service[];
  mediaChannels: MediaChannel[];
  invoices: Invoice[];
  cheques: Cheque[];
  branding: BrandingSettings;
}

// In-memory fallback cache for development/build when Postgres is not directly reachable
let localCache: BootstrapData | null = null;

function getFallbackData(): BootstrapData {
  if (localCache) return localCache;
  const disk = readFallbackDb();
  if (disk) {
    localCache = disk;
    return localCache!;
  }
  localCache = {
    billingEntities: [...INITIAL_BILLING_ENTITIES],
    clients: [...INITIAL_CLIENTS],
    services: [...INITIAL_SERVICES],
    mediaChannels: [...INITIAL_MEDIA_CHANNELS],
    invoices: [...INITIAL_INVOICES],
    cheques: [],
    branding: { ...INITIAL_BRANDING },
  };
  writeFallbackDb(localCache);
  return localCache!;
}

// -----------------------------------------------------------------------------
// BOOTSTRAP: Load all authoritative database records
// -----------------------------------------------------------------------------
export async function getBootstrapData(): Promise<BootstrapData> {
  const initialized = await initializeDatabase();
  const pool = getDbPool();

  if (!initialized || !pool) {
    return getFallbackData();
  }

  try {
    // 1. Billing Entities
    const entitiesRes = await pool.query('SELECT * FROM billing_entities WHERE is_archived = false ORDER BY created_at ASC');
    let billingEntities: BillingEntity[] = entitiesRes.rows.map(mapEntityRow);

    // Only seed initial entities on brand new empty database setup
    const totalEntitiesRes = await pool.query('SELECT COUNT(*) FROM billing_entities');
    const totalEntitiesCount = parseInt(totalEntitiesRes.rows[0].count, 10);
    if (totalEntitiesCount === 0) {
      for (const ent of INITIAL_BILLING_ENTITIES) {
        await saveBillingEntity(ent);
      }
      const recheck = await pool.query('SELECT * FROM billing_entities WHERE is_archived = false ORDER BY created_at ASC');
      billingEntities = recheck.rows.map(mapEntityRow);
    }

    // 2. Clients — Single Source of Truth from DB (NEVER auto-reseed deleted clients)
    const clientsRes = await pool.query('SELECT * FROM clients WHERE is_archived = false ORDER BY company_name ASC');
    let clients: Client[] = clientsRes.rows.map(mapClientRow);

    // 3. Services — Only seed on brand new empty database
    const servicesRes = await pool.query('SELECT * FROM services WHERE is_active = true ORDER BY name ASC');
    let services: Service[] = servicesRes.rows.map(mapServiceRow);
    const totalServicesRes = await pool.query('SELECT COUNT(*) FROM services');
    const totalServicesCount = parseInt(totalServicesRes.rows[0].count, 10);
    if (totalServicesCount === 0) {
      for (const s of INITIAL_SERVICES) {
        await saveService(s);
      }
      const recheck = await pool.query('SELECT * FROM services WHERE is_active = true ORDER BY name ASC');
      services = recheck.rows.map(mapServiceRow);
    }

    // 4. Media Channels — Only seed on brand new empty database
    const channelsRes = await pool.query('SELECT * FROM media_channels WHERE is_active = true ORDER BY name ASC');
    let mediaChannels: MediaChannel[] = channelsRes.rows.map(mapChannelRow);
    const totalChannelsRes = await pool.query('SELECT COUNT(*) FROM media_channels');
    const totalChannelsCount = parseInt(totalChannelsRes.rows[0].count, 10);
    if (totalChannelsCount === 0) {
      for (const mc of INITIAL_MEDIA_CHANNELS) {
        await saveMediaChannel(mc);
      }
      const recheck = await pool.query('SELECT * FROM media_channels WHERE is_active = true ORDER BY name ASC');
      mediaChannels = recheck.rows.map(mapChannelRow);
    }

    // 5. Invoices & Items — Single Source of Truth from DB (NEVER auto-reseed deleted invoices)
    const invoicesRes = await pool.query('SELECT * FROM invoices ORDER BY invoice_date DESC, created_at DESC');
    const itemsRes = await pool.query('SELECT * FROM invoice_items ORDER BY display_order ASC, created_at ASC');
    const paymentsRes = await pool.query('SELECT * FROM payments ORDER BY payment_date DESC');

    const itemsByInvoice: Record<string, InvoiceItem[]> = {};
    for (const r of itemsRes.rows) {
      if (!itemsByInvoice[r.invoice_id]) itemsByInvoice[r.invoice_id] = [];
      itemsByInvoice[r.invoice_id].push(mapItemRow(r));
    }

    const paymentsByInvoice: Record<string, any[]> = {};
    for (const p of paymentsRes.rows) {
      if (!paymentsByInvoice[p.invoice_id]) paymentsByInvoice[p.invoice_id] = [];
      paymentsByInvoice[p.invoice_id].push(mapPaymentRow(p));
    }

    let invoices: Invoice[] = invoicesRes.rows.map((row) =>
      mapInvoiceRow(row, itemsByInvoice[row.id] || [], paymentsByInvoice[row.id] || [])
    );

    // 6. Cheques
    const chequesRes = await pool.query('SELECT * FROM cheques ORDER BY cheque_date ASC, created_at DESC');
    const cheques: Cheque[] = chequesRes.rows.map(mapChequeRow);

    // 7. Branding
    const brandingRes = await pool.query('SELECT * FROM branding_settings WHERE id = $1', ['default']);
    let branding: BrandingSettings = brandingRes.rows[0] ? mapBrandingRow(brandingRes.rows[0]) : { ...INITIAL_BRANDING };

    return {
      billingEntities,
      clients,
      services,
      mediaChannels,
      invoices,
      cheques,
      branding,
    };
  } catch (err) {
    console.error('Failed to get bootstrap data from Postgres:', err);
    return getFallbackData();
  }
}

// -----------------------------------------------------------------------------
// BILLING ENTITIES
// -----------------------------------------------------------------------------
export async function getAllBillingEntities(): Promise<BillingEntity[]> {
  const pool = getDbPool();
  if (!pool) return getFallbackData().billingEntities;

  try {
    const res = await pool.query('SELECT * FROM billing_entities WHERE is_archived = false ORDER BY created_at ASC');
    return res.rows.map(mapEntityRow);
  } catch (err) {
    console.error('Error fetching billing entities:', err);
    return getFallbackData().billingEntities;
  }
}

export async function saveBillingEntity(entity: BillingEntity): Promise<BillingEntity> {
  const pool = getDbPool();
  if (!pool) {
    const data = getFallbackData();
    const idx = data.billingEntities.findIndex((e) => e.id === entity.id);
    if (idx >= 0) data.billingEntities[idx] = entity;
    else data.billingEntities.push(entity);
    writeFallbackDb(data);
    return entity;
  }

  const query = `
    INSERT INTO billing_entities (
      id, name, legal_name, is_default, brn, vat_number, address, phone, email,
      logo_url, bank_name, bank_account_number, bank_branch, bank_account_name,
      invoice_prefix, invoice_next_number, payee_name, signatory_name, signatory_designation,
      signatory_email, signature_enabled, display_signature_image, verification_enabled,
      show_qr_code, signature_image_url, is_archived, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      legal_name = EXCLUDED.legal_name,
      is_default = EXCLUDED.is_default,
      brn = EXCLUDED.brn,
      vat_number = EXCLUDED.vat_number,
      address = EXCLUDED.address,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      logo_url = EXCLUDED.logo_url,
      bank_name = EXCLUDED.bank_name,
      bank_account_number = EXCLUDED.bank_account_number,
      bank_branch = EXCLUDED.bank_branch,
      bank_account_name = EXCLUDED.bank_account_name,
      invoice_prefix = EXCLUDED.invoice_prefix,
      invoice_next_number = EXCLUDED.invoice_next_number,
      payee_name = EXCLUDED.payee_name,
      signatory_name = EXCLUDED.signatory_name,
      signatory_designation = EXCLUDED.signatory_designation,
      signatory_email = EXCLUDED.signatory_email,
      signature_enabled = EXCLUDED.signature_enabled,
      display_signature_image = EXCLUDED.display_signature_image,
      verification_enabled = EXCLUDED.verification_enabled,
      show_qr_code = EXCLUDED.show_qr_code,
      signature_image_url = EXCLUDED.signature_image_url,
      is_archived = EXCLUDED.is_archived,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    entity.id,
    entity.name,
    entity.displayName || entity.name,
    Boolean((entity as any).isDefault),
    entity.brn || '',
    entity.vatNumber || '',
    entity.address || '',
    entity.phone || '',
    entity.email || '',
    entity.logoUrl || '',
    entity.bankName || '',
    entity.accountNumber || '',
    entity.branch || '',
    entity.accountName || '',
    entity.prefix || 'INV',
    entity.currentSequence || 1,
    entity.chequePayee || entity.name,
    entity.signatoryName || '',
    entity.signatoryDesignation || '',
    entity.signatoryEmail || '',
    entity.signatureEnabled !== false,
    entity.displaySignatureImage || false,
    entity.verificationEnabled !== false,
    entity.showQrCode !== false,
    entity.signatureImageUrl || '',
    entity.status === 'archived',
  ];

  const res = await pool.query(query, values);
  return mapEntityRow(res.rows[0]);
}

export async function archiveBillingEntity(id: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) return false;
  const res = await pool.query('UPDATE billing_entities SET is_archived = true, updated_at = NOW() WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function deleteBillingEntity(id: string): Promise<{ success: boolean; message?: string }> {
  const pool = getDbPool();
  if (!pool) return { success: false, message: 'Database unavailable' };
  const check = await pool.query('SELECT COUNT(*) FROM invoices WHERE billing_entity_id = $1', [id]);
  const count = parseInt(check.rows[0].count, 10);
  if (count > 0) {
    await pool.query('UPDATE billing_entities SET is_archived = true, updated_at = NOW() WHERE id = $1', [id]);
    return { success: true, message: 'Entity has invoices and was safely archived to preserve financial records.' };
  }
  const res = await pool.query('DELETE FROM billing_entities WHERE id = $1', [id]);
  return { success: (res.rowCount ?? 0) > 0 };
}

// -----------------------------------------------------------------------------
// CLIENTS
// -----------------------------------------------------------------------------
export async function getAllClients(): Promise<Client[]> {
  const pool = getDbPool();
  if (!pool) return getFallbackData().clients;

  try {
    const res = await pool.query('SELECT * FROM clients WHERE is_archived = false ORDER BY company_name ASC');
    return res.rows.map(mapClientRow);
  } catch (err) {
    console.error('Error fetching clients:', err);
    return getFallbackData().clients;
  }
}

export async function saveClient(client: Client): Promise<Client> {
  const pool = getDbPool();
  if (!pool) {
    const data = getFallbackData();
    const idx = data.clients.findIndex((c) => c.id === client.id);
    if (idx >= 0) data.clients[idx] = client;
    else data.clients.push(client);
    writeFallbackDb(data);
    return client;
  }

  const query = `
    INSERT INTO clients (
      id, client_code, company_name, contact_person, email, phone, whatsapp_number,
      address, vat_number, brn, default_payment_terms, default_vat_preference,
      default_billing_entity_id, default_advance_percentage, notes, is_archived, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      client_code = EXCLUDED.client_code,
      company_name = EXCLUDED.company_name,
      contact_person = EXCLUDED.contact_person,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      whatsapp_number = EXCLUDED.whatsapp_number,
      address = EXCLUDED.address,
      vat_number = EXCLUDED.vat_number,
      brn = EXCLUDED.brn,
      default_payment_terms = EXCLUDED.default_payment_terms,
      default_vat_preference = EXCLUDED.default_vat_preference,
      default_billing_entity_id = EXCLUDED.default_billing_entity_id,
      default_advance_percentage = EXCLUDED.default_advance_percentage,
      notes = EXCLUDED.notes,
      is_archived = EXCLUDED.is_archived,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    client.id,
    client.code || client.id.slice(0, 8),
    client.name,
    client.contactPerson || '',
    client.email || '',
    client.mobile || '',
    client.whatsapp || '',
    client.address || '',
    client.vatNumber || '',
    client.brn || '',
    client.defaultPaymentTerms || 'Payment on Delivery',
    client.defaultVatPreference ? 'true' : 'false',
    client.defaultBillingEntityId || null,
    client.defaultAdvancePercentage || 0,
    client.defaultNote || client.internalNotes || '',
    !client.isActive,
  ];

  const res = await pool.query(query, values);
  return mapClientRow(res.rows[0]);
}

export async function archiveClient(id: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) return false;
  const res = await pool.query('UPDATE clients SET is_archived = true, updated_at = NOW() WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function deleteClient(id: string): Promise<{ success: boolean; message?: string }> {
  const pool = getDbPool();
  if (!pool) return { success: false, message: 'Database unavailable' };
  const check = await pool.query('SELECT COUNT(*) FROM invoices WHERE client_id = $1', [id]);
  const count = parseInt(check.rows[0].count, 10);
  if (count > 0) {
    await pool.query('UPDATE clients SET is_archived = true, updated_at = NOW() WHERE id = $1', [id]);
    return { success: true, message: 'Client has invoices and was safely archived to preserve audit history.' };
  }
  const res = await pool.query('DELETE FROM clients WHERE id = $1', [id]);
  return { success: (res.rowCount ?? 0) > 0 };
}

// -----------------------------------------------------------------------------
// SERVICES
// -----------------------------------------------------------------------------
export async function getAllServices(): Promise<Service[]> {
  const pool = getDbPool();
  if (!pool) return getFallbackData().services;

  try {
    const res = await pool.query('SELECT * FROM services WHERE is_active = true ORDER BY name ASC');
    return res.rows.map(mapServiceRow);
  } catch (err) {
    console.error('Error fetching services:', err);
    return getFallbackData().services;
  }
}

export async function saveService(service: Service): Promise<Service> {
  const pool = getDbPool();
  if (!pool) {
    const data = getFallbackData();
    const idx = data.services.findIndex((s) => s.id === service.id);
    if (idx >= 0) data.services[idx] = service;
    else data.services.push(service);
    writeFallbackDb(data);
    return service;
  }

  const query = `
    INSERT INTO services (
      id, name, category, media_channel, default_description, default_price,
      subject_to_vat, default_reference_type, default_reference_number, is_active, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      media_channel = EXCLUDED.media_channel,
      default_description = EXCLUDED.default_description,
      default_price = EXCLUDED.default_price,
      subject_to_vat = EXCLUDED.subject_to_vat,
      default_reference_type = EXCLUDED.default_reference_type,
      default_reference_number = EXCLUDED.default_reference_number,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    service.id,
    service.name,
    service.category || '',
    service.defaultMediaChannel || '',
    service.defaultDescription || '',
    service.defaultPrice || 0,
    service.vatApplicable !== false,
    service.defaultReferenceType || '',
    '',
    service.isActive !== false,
  ];

  const res = await pool.query(query, values);
  return mapServiceRow(res.rows[0]);
}

export async function deleteService(id: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) return false;
  const res = await pool.query('UPDATE services SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

// -----------------------------------------------------------------------------
// MEDIA CHANNELS
// -----------------------------------------------------------------------------
export async function getAllMediaChannels(): Promise<MediaChannel[]> {
  const pool = getDbPool();
  if (!pool) return getFallbackData().mediaChannels;

  try {
    const res = await pool.query('SELECT * FROM media_channels WHERE is_active = true ORDER BY name ASC');
    return res.rows.map(mapChannelRow);
  } catch (err) {
    console.error('Error fetching channels:', err);
    return getFallbackData().mediaChannels;
  }
}

export async function saveMediaChannel(channel: MediaChannel): Promise<MediaChannel> {
  const pool = getDbPool();
  if (!pool) {
    const data = getFallbackData();
    const idx = data.mediaChannels.findIndex((c) => c.name.toLowerCase() === channel.name.toLowerCase());
    if (idx >= 0) data.mediaChannels[idx] = channel;
    else data.mediaChannels.push(channel);
    writeFallbackDb(data);
    return channel;
  }

  const query = `
    INSERT INTO media_channels (id, name, category, is_active)
    VALUES ($1, $2, $3, true)
    ON CONFLICT (name) DO UPDATE SET
      category = EXCLUDED.category,
      is_active = true
    RETURNING *;
  `;
  const res = await pool.query(query, [channel.id || `mc-${Date.now()}`, channel.name, channel.type || 'other']);
  return mapChannelRow(res.rows[0]);
}

// -----------------------------------------------------------------------------
// INVOICES & TRANSACTIONS
// -----------------------------------------------------------------------------
export async function getAllInvoices(): Promise<Invoice[]> {
  const pool = getDbPool();
  if (!pool) return getFallbackData().invoices;

  try {
    const invoicesRes = await pool.query('SELECT * FROM invoices ORDER BY invoice_date DESC, created_at DESC');
    const itemsRes = await pool.query('SELECT * FROM invoice_items ORDER BY display_order ASC, created_at ASC');
    const paymentsRes = await pool.query('SELECT * FROM payments ORDER BY payment_date DESC');

    const itemsByInvoice: Record<string, InvoiceItem[]> = {};
    for (const r of itemsRes.rows) {
      if (!itemsByInvoice[r.invoice_id]) itemsByInvoice[r.invoice_id] = [];
      itemsByInvoice[r.invoice_id].push(mapItemRow(r));
    }

    const paymentsByInvoice: Record<string, any[]> = {};
    for (const p of paymentsRes.rows) {
      if (!paymentsByInvoice[p.invoice_id]) paymentsByInvoice[p.invoice_id] = [];
      paymentsByInvoice[p.invoice_id].push(mapPaymentRow(p));
    }

    return invoicesRes.rows.map((row) =>
      mapInvoiceRow(row, itemsByInvoice[row.id] || [], paymentsByInvoice[row.id] || [])
    );
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return getFallbackData().invoices;
  }
}

export async function saveInvoice(invoice: Invoice): Promise<Invoice> {
  const pool = getDbPool();
  if (!pool) {
    const data = getFallbackData();
    const idx = data.invoices.findIndex((i) => i.id === invoice.id);
    if (idx >= 0) data.invoices[idx] = invoice;
    else data.invoices.push(invoice);
    writeFallbackDb(data);
    return invoice;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Dynamically calculate accurate financial totals
    const subtotal = (invoice.items || []).reduce((acc, it) => acc + (Number(it.lineTotal || (it as any).amount) || (Number(it.quantity) * Number(it.unitPrice)) || 0), 0);
    const isVat = Boolean(invoice.vatApplicable || (invoice as any).subjectToVat);
    const vatRate = isVat ? (invoice.vatRate || 18) : 0;
    const vatAmount = isVat ? Math.round(subtotal * (vatRate / 100)) : 0;
    const grandTotal = subtotal + vatAmount;
    const paidAmount = (invoice.payments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || invoice.totalPaid || (invoice as any).paidAmount || 0;
    const outstandingBalance = Math.max(0, grandTotal - paidAmount);

    // 1. Upsert Invoice Master Record
    const invQuery = `
      INSERT INTO invoices (
        id, invoice_number, client_id, billing_entity_id, template_key, status,
        payment_status, invoice_date, due_date, sent_at, sent_channel, delivery_confirmed,
        delivery_confirmed_at, subject_to_vat, vat_rate, subtotal, vat_amount, grand_total,
        paid_amount, outstanding_balance, advance_percentage, advance_amount, notes,
        client_snapshot, billing_entity_snapshot, verification_token, verification_status,
        approval_snapshot, pdf_layout, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        invoice_number = EXCLUDED.invoice_number,
        client_id = EXCLUDED.client_id,
        billing_entity_id = EXCLUDED.billing_entity_id,
        template_key = EXCLUDED.template_key,
        status = EXCLUDED.status,
        payment_status = EXCLUDED.payment_status,
        invoice_date = EXCLUDED.invoice_date,
        due_date = EXCLUDED.due_date,
        sent_at = EXCLUDED.sent_at,
        sent_channel = EXCLUDED.sent_channel,
        delivery_confirmed = EXCLUDED.delivery_confirmed,
        delivery_confirmed_at = EXCLUDED.delivery_confirmed_at,
        subject_to_vat = EXCLUDED.subject_to_vat,
        vat_rate = EXCLUDED.vat_rate,
        subtotal = EXCLUDED.subtotal,
        vat_amount = EXCLUDED.vat_amount,
        grand_total = EXCLUDED.grand_total,
        paid_amount = EXCLUDED.paid_amount,
        outstanding_balance = EXCLUDED.outstanding_balance,
        advance_percentage = EXCLUDED.advance_percentage,
        advance_amount = EXCLUDED.advance_amount,
        notes = EXCLUDED.notes,
        client_snapshot = EXCLUDED.client_snapshot,
        billing_entity_snapshot = EXCLUDED.billing_entity_snapshot,
        verification_token = EXCLUDED.verification_token,
        verification_status = EXCLUDED.verification_status,
        approval_snapshot = EXCLUDED.approval_snapshot,
        pdf_layout = EXCLUDED.pdf_layout,
        updated_at = NOW()
      RETURNING *;
    `;

    const invValues = [
      invoice.id,
      invoice.invoiceNumber,
      invoice.clientId,
      invoice.billingEntityId,
      invoice.templateKey || 'standard',
      invoice.status || 'draft',
      invoice.paymentStatus || 'unpaid',
      invoice.invoiceDate || new Date().toISOString().split('T')[0],
      invoice.dueDate || new Date().toISOString().split('T')[0],
      invoice.sentAt || null,
      (invoice as any).sentChannel || null,
      Boolean((invoice as any).deliveryConfirmed || invoice.sentStatus === 'delivery_confirmed'),
      (invoice as any).deliveryConfirmedAt || null,
      isVat,
      vatRate,
      subtotal,
      vatAmount,
      grandTotal,
      paidAmount,
      outstandingBalance,
      invoice.advancePercentage || 0,
      invoice.advanceAmount || 0,
      invoice.specialNotes || (invoice as any).notes || '',
      JSON.stringify(invoice.clientSnapshot || {}),
      JSON.stringify(invoice.billingSnapshot || (invoice as any).billingEntitySnapshot || {}),
      invoice.verificationToken || null,
      invoice.verificationStatus || 'valid',
      invoice.approval ? JSON.stringify(invoice.approval) : (invoice as any).approvalSnapshot ? JSON.stringify((invoice as any).approvalSnapshot) : null,
      invoice.pdfLayout ? JSON.stringify(invoice.pdfLayout) : null,
    ];

    await client.query(invQuery, invValues);

    // 2. Delete and recreate line items atomically
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoice.id]);

    for (let i = 0; i < (invoice.items || []).length; i++) {
      const it = invoice.items[i];
      const itAmount = Number(it.lineTotal || (it as any).amount) || (Number(it.quantity) * Number(it.unitPrice)) || 0;
      await client.query(
        `INSERT INTO invoice_items (
          id, invoice_id, service_id, service_name, description, quantity, unit_price,
          amount, service_period, advertising_period, media_channel, reference_type,
          reference_number, show_reference_in_description, show_service_period, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          it.id || `item-${invoice.id}-${i}`,
          invoice.id,
          it.serviceId || null,
          it.serviceName,
          it.description || '',
          it.quantity || 1,
          it.unitPrice || 0,
          itAmount,
          it.servicePeriod || (it as any).advertisingPeriod || '',
          (it as any).advertisingPeriod || '',
          it.mediaChannel || '',
          it.referenceType || '',
          it.referenceNumber || '',
          (it as any).showReferenceInDescription || false,
          (it as any).showServicePeriod !== false,
          i,
        ]
      );
    }

    // 3. Update sequence on the billing entity
    const numPart = parseInt(invoice.invoiceNumber.replace(/\D/g, ''), 10);
    if (!isNaN(numPart)) {
      await client.query(
        `UPDATE billing_entities
         SET invoice_next_number = GREATEST(invoice_next_number, $1 + 1)
         WHERE id = $2`,
        [numPart, invoice.billingEntityId]
      );
    }

    await client.query('COMMIT');

    return {
      ...invoice,
      subtotal,
      vatAmount,
      grandTotal,
      totalPaid: paidAmount,
      outstandingBalance,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to save invoice transactionally:', err);
    throw err;
  } finally {
    client.release();
  }
}

// -----------------------------------------------------------------------------
// CHEQUES
// -----------------------------------------------------------------------------
export async function getAllCheques(): Promise<Cheque[]> {
  const pool = getDbPool();
  if (!pool) return getFallbackData().cheques;

  try {
    const res = await pool.query('SELECT * FROM cheques ORDER BY cheque_date ASC, created_at DESC');
    return res.rows.map(mapChequeRow);
  } catch (err) {
    console.error('Error fetching cheques:', err);
    return getFallbackData().cheques;
  }
}

export async function saveCheque(cheque: Cheque): Promise<Cheque> {
  const pool = getDbPool();
  const chequeId = cheque.id || `chq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const chequeWithId = { ...cheque, id: chequeId };

  if (!pool) {
    const data = getFallbackData();
    const idx = data.cheques.findIndex((c) => c.id === chequeId);
    if (idx >= 0) data.cheques[idx] = chequeWithId;
    else data.cheques.push(chequeWithId);
    writeFallbackDb(data);
    return chequeWithId;
  }

  // Validate Foreign Keys to ensure references exist in PostgreSQL
  let validClientId: string | null = null;
  if (cheque.clientId) {
    try {
      const cRes = await pool.query('SELECT 1 FROM clients WHERE id = $1', [cheque.clientId]);
      if (cRes.rows.length > 0) validClientId = cheque.clientId;
    } catch {}
  }

  let validEntityId: string | null = null;
  if (cheque.billingEntityId) {
    try {
      const eRes = await pool.query('SELECT 1 FROM billing_entities WHERE id = $1', [cheque.billingEntityId]);
      if (eRes.rows.length > 0) validEntityId = cheque.billingEntityId;
    } catch {}
  }

  let validInvoiceId: string | null = null;
  const invId = (cheque as any).invoiceId;
  if (invId) {
    try {
      const iRes = await pool.query('SELECT 1 FROM invoices WHERE id = $1', [invId]);
      if (iRes.rows.length > 0) validInvoiceId = invId;
    } catch {}
  }

  const query = `
    INSERT INTO cheques (
      id, cheque_number, bank_name, bank_branch, amount, issue_date, cheque_date,
      client_id, billing_entity_id, invoice_id, payee_name, status, drawer_name,
      notes, image_url, reminders_enabled, reminder_days_before, last_reminder_sent_at,
      cleared_date, bounced_date, bounced_reason, type, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      cheque_number = EXCLUDED.cheque_number,
      bank_name = EXCLUDED.bank_name,
      bank_branch = EXCLUDED.bank_branch,
      amount = EXCLUDED.amount,
      issue_date = EXCLUDED.issue_date,
      cheque_date = EXCLUDED.cheque_date,
      client_id = EXCLUDED.client_id,
      billing_entity_id = EXCLUDED.billing_entity_id,
      invoice_id = EXCLUDED.invoice_id,
      payee_name = EXCLUDED.payee_name,
      status = EXCLUDED.status,
      drawer_name = EXCLUDED.drawer_name,
      notes = EXCLUDED.notes,
      image_url = EXCLUDED.image_url,
      reminders_enabled = EXCLUDED.reminders_enabled,
      reminder_days_before = EXCLUDED.reminder_days_before,
      last_reminder_sent_at = EXCLUDED.last_reminder_sent_at,
      cleared_date = EXCLUDED.cleared_date,
      bounced_date = EXCLUDED.bounced_date,
      bounced_reason = EXCLUDED.bounced_reason,
      type = EXCLUDED.type,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    chequeId,
    cheque.chequeNumber,
    cheque.drawerBank || (cheque as any).bankName || '',
    cheque.branch || (cheque as any).bankBranch || '',
    Number(cheque.amount) || 0,
    cheque.receivedOrIssuedDate || (cheque as any).issueDate || new Date().toISOString().split('T')[0],
    cheque.chequeDate || new Date().toISOString().split('T')[0],
    validClientId,
    validEntityId,
    validInvoiceId,
    cheque.payerOrPayeeName || (cheque as any).payeeName || '',
    cheque.status || 'pending',
    (cheque as any).drawerName || cheque.payerOrPayeeName || '',
    cheque.notes || '',
    cheque.imageFrontUrl || (cheque as any).imageUrl || '',
    (cheque as any).remindersEnabled !== false,
    (cheque as any).reminderDaysBefore || 3,
    (cheque as any).lastReminderSentAt || null,
    cheque.actualClearanceDate || (cheque as any).clearedDate || null,
    (cheque as any).bouncedDate || null,
    (cheque as any).bouncedReason || '',
    cheque.type || 'incoming',
  ];

  const res = await pool.query(query, values);
  return mapChequeRow(res.rows[0]);
}

export async function deleteCheque(id: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) return false;
  const res = await pool.query('DELETE FROM cheques WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

// -----------------------------------------------------------------------------
// BRANDING SETTINGS
// -----------------------------------------------------------------------------
export async function getBrandingSettings(): Promise<BrandingSettings> {
  const pool = getDbPool();
  if (!pool) return getFallbackData().branding;

  try {
    const res = await pool.query('SELECT * FROM branding_settings WHERE id = $1', ['default']);
    if (res.rows[0]) return mapBrandingRow(res.rows[0]);
    return { ...INITIAL_BRANDING };
  } catch (err) {
    console.error('Error fetching branding settings:', err);
    return getFallbackData().branding;
  }
}

export async function saveBrandingSettings(branding: BrandingSettings): Promise<BrandingSettings> {
  const pool = getDbPool();
  if (!pool) {
    const data = getFallbackData();
    data.branding = branding;
    writeFallbackDb(data);
    return branding;
  }

  const query = `
    INSERT INTO branding_settings (
      id, company_name, tagline, logo_url, primary_color, secondary_color,
      font_family, invoice_header_note, invoice_footer_note, vat_registration_number,
      brn_number, default_vat_rate, default_currency, updated_at
    ) VALUES (
      'default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      tagline = EXCLUDED.tagline,
      logo_url = EXCLUDED.logo_url,
      primary_color = EXCLUDED.primary_color,
      secondary_color = EXCLUDED.secondary_color,
      font_family = EXCLUDED.font_family,
      invoice_header_note = EXCLUDED.invoice_header_note,
      invoice_footer_note = EXCLUDED.invoice_footer_note,
      vat_registration_number = EXCLUDED.vat_registration_number,
      brn_number = EXCLUDED.brn_number,
      default_vat_rate = EXCLUDED.default_vat_rate,
      default_currency = EXCLUDED.default_currency,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    branding.businessName || (branding as any).companyName || 'SN Advertising',
    (branding as any).tagline || '',
    branding.logoUrl || '',
    '#0B1D3A',
    '#10B981',
    'Inter',
    '',
    '',
    '',
    '',
    branding.defaultVatRate || 18,
    branding.defaultCurrency || 'LKR',
  ];

  const res = await pool.query(query, values);
  return mapBrandingRow(res.rows[0]);
}

// -----------------------------------------------------------------------------
// SAFE BROWSER MIGRATION ENGINE
// -----------------------------------------------------------------------------
export async function migrateFromBrowser(data: {
  billingEntities?: BillingEntity[];
  clients?: Client[];
  services?: Service[];
  mediaChannels?: MediaChannel[];
  invoices?: Invoice[];
  cheques?: Cheque[];
  branding?: BrandingSettings;
}): Promise<{ success: boolean; importedCounts: Record<string, number> }> {
  const counts = { entities: 0, clients: 0, services: 0, channels: 0, invoices: 0, cheques: 0 };

  if (data.billingEntities) {
    for (const ent of data.billingEntities) {
      await saveBillingEntity(ent);
      counts.entities++;
    }
  }

  if (data.clients) {
    for (const cl of data.clients) {
      await saveClient(cl);
      counts.clients++;
    }
  }

  if (data.services) {
    for (const s of data.services) {
      await saveService(s);
      counts.services++;
    }
  }

  if (data.mediaChannels) {
    for (const mc of data.mediaChannels) {
      await saveMediaChannel(mc);
      counts.channels++;
    }
  }

  if (data.invoices) {
    for (const inv of data.invoices) {
      await saveInvoice(inv);
      counts.invoices++;
    }
  }

  if (data.cheques) {
    for (const ch of data.cheques) {
      await saveCheque(ch);
      counts.cheques++;
    }
  }

  if (data.branding) {
    await saveBrandingSettings(data.branding);
  }

  return { success: true, importedCounts: counts };
}

// -----------------------------------------------------------------------------
// ROW MAPPERS (Row -> Domain Model)
// -----------------------------------------------------------------------------
function mapEntityRow(r: any): BillingEntity {
  return {
    id: r.id,
    name: r.name,
    displayName: r.legal_name || r.name,
    address: r.address || '',
    phone: r.phone || '',
    email: r.email || '',
    brn: r.brn || '',
    vatNumber: r.vat_number || '',
    isVatRegistered: Boolean(r.vat_number),
    logoUrl: r.logo_url || '',
    bankName: r.bank_name || '',
    accountNumber: r.bank_account_number || '',
    branch: r.bank_branch || '',
    accountName: r.bank_account_name || '',
    chequePayee: r.payee_name || r.name,
    prefix: r.invoice_prefix || 'INV',
    currentSequence: r.invoice_next_number || 1,
    signatoryName: r.signatory_name || '',
    signatoryDesignation: r.signatory_designation || '',
    signatoryEmail: r.signatory_email || '',
    signatureEnabled: r.signature_enabled !== false,
    displaySignatureImage: r.display_signature_image || false,
    verificationEnabled: r.verification_enabled !== false,
    showQrCode: r.show_qr_code !== false,
    signatureImageUrl: r.signature_image_url || '',
    status: r.is_archived ? 'archived' : 'active',
    isActive: !r.is_archived,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapClientRow(r: any): Client {
  return {
    id: r.id,
    name: r.company_name || r.name,
    code: r.client_code || r.code || r.id.slice(0, 8),
    contactPerson: r.contact_person || '',
    email: r.email || '',
    mobile: r.phone || r.mobile || '',
    whatsapp: r.whatsapp_number || r.whatsapp || '',
    address: r.address || '',
    vatNumber: r.vat_number || undefined,
    brn: r.brn || undefined,
    defaultPaymentTerms: r.default_payment_terms || 'Payment on Delivery',
    defaultVatPreference: Boolean(r.default_vat_preference === 'true' || r.default_vat_preference === true),
    defaultBillingEntityId: r.default_billing_entity_id || undefined,
    defaultAdvancePercentage: Number(r.default_advance_percentage) || 0,
    defaultNote: r.notes || '',
    internalNotes: r.notes || '',
    isActive: !r.is_archived,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapServiceRow(r: any): Service {
  return {
    id: r.id,
    name: r.name,
    category: r.category as any,
    defaultMediaChannel: r.media_channel || '',
    defaultDescription: r.default_description || '',
    defaultPrice: Number(r.default_price) || 0,
    vatApplicable: r.subject_to_vat !== false,
    defaultReferenceType: (r.default_reference_type as any) || undefined,
    isActive: r.is_active !== false,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapChannelRow(r: any): MediaChannel {
  return {
    id: r.id,
    name: r.name,
    type: (r.category as any) || 'radio',
  };
}

function mapInvoiceRow(r: any, items: InvoiceItem[], payments: any[]): Invoice {
  const subtotal = Number(r.subtotal) || 0;
  const vatApplicable = Boolean(r.subject_to_vat);
  const vatRate = Number(r.vat_rate) || 18;
  const vatAmount = Number(r.vat_amount) || 0;
  const grandTotal = Number(r.grand_total) || 0;
  const totalPaid = Number(r.paid_amount) || 0;
  const outstandingBalance = Number(r.outstanding_balance) || 0;

  return {
    id: r.id,
    invoiceNumber: r.invoice_number,
    clientId: r.client_id,
    billingEntityId: r.billing_entity_id,
    templateKey: r.template_key || 'standard',
    status: r.status || 'draft',
    sentStatus: (r.sent_at ? (r.delivery_confirmed ? 'delivery_confirmed' : 'sent') : 'not_sent') as any,
    paymentStatus: r.payment_status || 'unpaid',
    invoiceDate: r.invoice_date ? new Date(r.invoice_date).toISOString().split('T')[0] : '',
    dueDate: r.due_date ? new Date(r.due_date).toISOString().split('T')[0] : undefined,
    sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : undefined,
    subtotal,
    vatApplicable,
    vatRate,
    vatAmount,
    grandTotal,
    totalPaid,
    outstandingBalance,
    advancePercentage: Number(r.advance_percentage) || 0,
    advanceAmount: Number(r.advance_amount) || 0,
    specialNotes: r.notes || '',
    clientSnapshot: r.client_snapshot || ({} as any),
    billingSnapshot: r.billing_entity_snapshot || ({} as any),
    verificationToken: r.verification_token || undefined,
    verificationStatus: r.verification_status || 'valid',
    approval: r.approval_snapshot || undefined,
    pdfLayout: r.pdf_layout || undefined,
    items,
    payments,
    shareHistory: [],
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapItemRow(r: any): InvoiceItem {
  return {
    id: r.id,
    invoiceId: r.invoice_id,
    serviceId: r.service_id || undefined,
    serviceName: r.service_name,
    category: r.category as any,
    mediaChannel: r.media_channel || '',
    referenceType: (r.reference_type as any) || undefined,
    referenceNumber: r.reference_number || '',
    description: r.description || '',
    servicePeriod: r.service_period || '',
    quantity: Number(r.quantity) || 1,
    unitPrice: Number(r.unit_price) || 0,
    lineTotal: Number(r.amount) || (Number(r.quantity) * Number(r.unit_price)) || 0,
    sortOrder: r.display_order || 0,
  };
}

function mapPaymentRow(r: any): any {
  return {
    id: r.id,
    invoiceId: r.invoice_id,
    amount: Number(r.amount) || 0,
    paymentDate: r.payment_date ? new Date(r.payment_date).toISOString().split('T')[0] : '',
    paymentMethod: r.payment_method,
    reference: r.reference || '',
    notes: r.notes || '',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapChequeRow(r: any): Cheque {
  return {
    id: r.id,
    type: (r.type || 'incoming') as ChequeType,
    chequeNumber: r.cheque_number,
    drawerBank: r.bank_name || '',
    branch: r.bank_branch || '',
    amount: Number(r.amount) || 0,
    currency: 'LKR',
    chequeDate: r.cheque_date ? new Date(r.cheque_date).toISOString().split('T')[0] : '',
    receivedOrIssuedDate: r.issue_date ? new Date(r.issue_date).toISOString().split('T')[0] : '',
    expectedActionDate: r.cheque_date ? new Date(r.cheque_date).toISOString().split('T')[0] : '',
    payerOrPayeeName: r.payee_name || r.drawer_name || '',
    clientId: r.client_id || '',
    billingEntityId: r.billing_entity_id || '',
    status: r.status || 'pending',
    statusHistory: [],
    reminders: [],
    isReminderEnabled: r.reminders_enabled !== false,
    notes: r.notes || '',
    imageFrontUrl: r.image_url || '',
    attachments: [],
    invoiceAllocations: [],
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapBrandingRow(r: any): BrandingSettings {
  return {
    id: r.id || 'default',
    businessName: r.company_name || 'SN Advertising',
    logoUrl: r.logo_url || '/logo.png',
    phone: '+94 11 772 8282',
    email: 'snadvertising@hotmail.com',
    address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
    defaultCurrency: r.default_currency || 'LKR',
    defaultVatRate: Number(r.default_vat_rate) || 18,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}
