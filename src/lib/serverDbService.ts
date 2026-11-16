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
  Vendor,
  ChequePrintTemplate,
  ChequePrinterProfile,
  ChequePrintJob,
} from '@/types';
import {
  DEFAULT_CHEQUE_TEMPLATES,
  DEFAULT_PRINTER_PROFILES,
} from '@/lib/chequeDefaults';
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
  vendors: Vendor[];
  branding: BrandingSettings;
}

// In-memory fallback cache for development/build when Postgres is not directly reachable
let localCache: BootstrapData | null = null;

function getFallbackData(): BootstrapData {
  if (localCache) return localCache;
  const disk = readFallbackDb();
  if (disk) {
    const data: BootstrapData = {
      ...disk,
      vendors: disk.vendors || [],
    };
    localCache = data;
    return data;
  }
  const defaultData: BootstrapData = {
    billingEntities: [...INITIAL_BILLING_ENTITIES],
    clients: [...INITIAL_CLIENTS],
    services: [...INITIAL_SERVICES],
    mediaChannels: [...INITIAL_MEDIA_CHANNELS],
    invoices: [...INITIAL_INVOICES],
    cheques: [],
    vendors: [],
    branding: { ...INITIAL_BRANDING },
  };
  localCache = defaultData;
  writeFallbackDb(defaultData);
  return defaultData;
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

    // 7. Vendors
    let vendors: Vendor[] = [];
    try {
      const vendorsRes = await pool.query('SELECT * FROM vendors WHERE is_active = true ORDER BY name ASC');
      vendors = vendorsRes.rows.map(mapVendorRow);
    } catch {
      vendors = [];
    }

    // 8. Branding
    const brandingRes = await pool.query('SELECT * FROM branding_settings WHERE id = $1', ['default']);
    let branding: BrandingSettings = brandingRes.rows[0] ? mapBrandingRow(brandingRes.rows[0]) : { ...INITIAL_BRANDING };

    return {
      billingEntities,
      clients,
      services,
      mediaChannels,
      invoices,
      cheques,
      vendors,
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
  const entityId = (entity.id && String(entity.id).trim()) || crypto.randomUUID();
  const entityWithId = { ...entity, id: entityId };

  if (!pool) {
    const data = getFallbackData();
    const idx = data.billingEntities.findIndex((e) => e.id === entityId);
    if (idx >= 0) data.billingEntities[idx] = entityWithId;
    else data.billingEntities.push(entityWithId);
    writeFallbackDb(data);
    return entityWithId;
  }

  const fullAddress = (entity.address && entity.address.trim()) || [
    entity.addressLine1,
    entity.addressLine2,
    entity.city,
    entity.postalCode,
    entity.country || 'Sri Lanka',
  ].filter(Boolean).join(', ');

  const query = `
    INSERT INTO billing_entities (
      id, name, legal_name, is_default, brn, vat_number, address, phone, email,
      logo_url, bank_name, bank_account_number, bank_branch, bank_account_name,
      invoice_prefix, invoice_next_number, payee_name, signatory_name, signatory_designation,
      signatory_email, signature_enabled, display_signature_image, verification_enabled,
      show_qr_code, signature_image_url, is_archived,
      address_line1, address_line2, city, postal_code, country, secondary_phone,
      website, swift_code, payment_instructions, primary_color, secondary_color,
      header_style, footer_text, starting_sequence, default_currency,
      default_payment_terms, default_due_days, default_invoice_template,
      invoice_notes, default_pdf_layout, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
      $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, NOW()
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
      invoice_next_number = GREATEST(EXCLUDED.invoice_next_number, EXCLUDED.starting_sequence),
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
      address_line1 = EXCLUDED.address_line1,
      address_line2 = EXCLUDED.address_line2,
      city = EXCLUDED.city,
      postal_code = EXCLUDED.postal_code,
      country = EXCLUDED.country,
      secondary_phone = EXCLUDED.secondary_phone,
      website = EXCLUDED.website,
      swift_code = EXCLUDED.swift_code,
      payment_instructions = EXCLUDED.payment_instructions,
      primary_color = EXCLUDED.primary_color,
      secondary_color = EXCLUDED.secondary_color,
      header_style = EXCLUDED.header_style,
      footer_text = EXCLUDED.footer_text,
      starting_sequence = EXCLUDED.starting_sequence,
      default_currency = EXCLUDED.default_currency,
      default_payment_terms = EXCLUDED.default_payment_terms,
      default_due_days = EXCLUDED.default_due_days,
      default_invoice_template = EXCLUDED.default_invoice_template,
      invoice_notes = EXCLUDED.invoice_notes,
      default_pdf_layout = EXCLUDED.default_pdf_layout,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    entityId,
    entity.name,
    entity.displayName || entity.name,
    Boolean((entity as any).isDefault),
    entity.brn || '',
    entity.vatNumber || '',
    fullAddress,
    entity.phone || '',
    entity.email || '',
    entity.logoUrl || '',
    entity.bankName || '',
    entity.accountNumber || '',
    entity.branch || '',
    entity.accountName || '',
    entity.prefix || 'INV',
    entity.currentSequence || entity.startingSequence || 1,
    entity.chequePayee || entity.name,
    entity.signatoryName || '',
    entity.signatoryDesignation || '',
    entity.signatoryEmail || '',
    entity.signatureEnabled !== false,
    entity.displaySignatureImage || false,
    entity.verificationEnabled !== false,
    entity.showQrCode !== false,
    entity.signatureImageUrl || entity.signatureUrl || '',
    entity.status === 'archived',
    entity.addressLine1 || '',
    entity.addressLine2 || '',
    entity.city || '',
    entity.postalCode || '',
    entity.country || 'Sri Lanka',
    entity.secondaryPhone || '',
    entity.website || '',
    entity.swiftCode || '',
    entity.paymentInstructions || '',
    entity.primaryColor || '#0f172a',
    entity.secondaryColor || '#059669',
    entity.headerStyle || 'classic',
    entity.footerText || '',
    entity.startingSequence || 1,
    entity.defaultCurrency || 'LKR',
    entity.defaultPaymentTerms || 'Immediate',
    entity.defaultDueDays || 7,
    entity.defaultInvoiceTemplate || 'standard',
    entity.invoiceNotes || '',
    entity.defaultPdfLayout ? JSON.stringify(entity.defaultPdfLayout) : null,
  ];

  const res = await pool.query(query, values);

  // Keep invoice billing entity snapshots in sync with authoritative entity updates
  try {
    const snapshot = {
      id: entityId,
      name: entity.name,
      displayName: entity.displayName || entity.name,
      address: fullAddress,
      addressLine1: entity.addressLine1 || '',
      addressLine2: entity.addressLine2 || '',
      city: entity.city || '',
      postalCode: entity.postalCode || '',
      country: entity.country || 'Sri Lanka',
      phone: entity.phone || '',
      secondaryPhone: entity.secondaryPhone || '',
      email: entity.email || '',
      website: entity.website || '',
      brn: entity.brn || '',
      vatNumber: entity.vatNumber || '',
      isVatRegistered: Boolean(entity.vatNumber || entity.isVatRegistered),
      bankName: entity.bankName || '',
      branch: entity.branch || '',
      accountName: entity.accountName || '',
      accountNumber: entity.accountNumber || '',
      swiftCode: entity.swiftCode || '',
      chequePayee: entity.chequePayee || entity.name,
      paymentInstructions: entity.paymentInstructions || '',
      logoUrl: entity.logoUrl || '',
      signatoryName: entity.signatoryName || '',
      signatoryDesignation: entity.signatoryDesignation || '',
      signatoryEmail: entity.signatoryEmail || '',
      signatureImageUrl: entity.signatureImageUrl || entity.signatureUrl || '',
      footerText: entity.footerText || '',
      prefix: entity.prefix || 'INV',
    };

    await pool.query(
      'UPDATE invoices SET billing_entity_snapshot = $1::jsonb, updated_at = NOW() WHERE billing_entity_id = $2',
      [JSON.stringify(snapshot), entityId]
    );
  } catch (syncErr) {
    console.warn('Failed to sync invoices billing_entity_snapshot:', syncErr);
  }

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
  const clientId = (client.id && String(client.id).trim()) || crypto.randomUUID();
  const clientCode = (client.code && String(client.code).trim()) || `CL-${clientId.slice(0, 6).toUpperCase()}`;
  const clientWithId = { ...client, id: clientId, code: clientCode };

  if (!pool) {
    const data = getFallbackData();
    const idx = data.clients.findIndex((c) => c.id === clientId);
    if (idx >= 0) data.clients[idx] = clientWithId;
    else data.clients.push(clientWithId);
    writeFallbackDb(data);
    return clientWithId;
  }

  // Validate Foreign Key for defaultBillingEntityId
  let validBillingEntityId: string | null = null;
  if (client.defaultBillingEntityId) {
    try {
      const eRes = await pool.query('SELECT 1 FROM billing_entities WHERE id = $1', [client.defaultBillingEntityId]);
      if (eRes.rows.length > 0) validBillingEntityId = client.defaultBillingEntityId;
    } catch {}
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
    clientId,
    clientCode,
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
    validBillingEntityId,
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
  const serviceId = (service.id && String(service.id).trim()) || crypto.randomUUID();
  const serviceWithId = { ...service, id: serviceId };

  if (!pool) {
    const data = getFallbackData();
    const idx = data.services.findIndex((s) => s.id === serviceId);
    if (idx >= 0) data.services[idx] = serviceWithId;
    else data.services.push(serviceWithId);
    writeFallbackDb(data);
    return serviceWithId;
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
    serviceId,
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
  const invoiceId = (invoice.id && String(invoice.id).trim()) || crypto.randomUUID();
  const invoiceNumber = (invoice.invoiceNumber && String(invoice.invoiceNumber).trim()) || `INV-${Date.now().toString().slice(-6)}`;
  const invoiceWithId = { ...invoice, id: invoiceId, invoiceNumber };

  if (!pool) {
    const data = getFallbackData();
    const idx = data.invoices.findIndex((i) => i.id === invoiceId);
    if (idx >= 0) data.invoices[idx] = invoiceWithId;
    else data.invoices.push(invoiceWithId);
    writeFallbackDb(data);
    return invoiceWithId;
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
      invoiceId,
      invoiceNumber,
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
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);

    for (let i = 0; i < (invoice.items || []).length; i++) {
      const it = invoice.items[i];
      const itAmount = Number(it.lineTotal || (it as any).amount) || (Number(it.quantity) * Number(it.unitPrice)) || 0;
      const itemId = (it.id && it.id.trim() && it.id !== 'item-init' && !it.id.startsWith('item-init') && it.id.length > 8)
        ? it.id.trim()
        : `item-${invoiceId}-${i}-${crypto.randomUUID().slice(0, 8)}`;

      await client.query(
        `INSERT INTO invoice_items (
          id, invoice_id, service_id, service_name, description, quantity, unit_price,
          amount, service_period, advertising_period, media_channel, reference_type,
          reference_number, show_reference_in_description, show_service_period, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          itemId,
          invoiceId,
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
    const numPart = parseInt(invoiceNumber.replace(/\D/g, ''), 10);
    if (!isNaN(numPart) && invoice.billingEntityId) {
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
      id: invoiceId,
      invoiceNumber,
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

export async function deleteInvoice(id: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) return false;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
    await client.query('DELETE FROM payments WHERE invoice_id = $1', [id]);
    await client.query('UPDATE cheques SET invoice_id = NULL WHERE invoice_id = $1', [id]);
    const res = await client.query('DELETE FROM invoices WHERE id = $1', [id]);
    await client.query('COMMIT');
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to delete invoice:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteInvoicesBatch(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  const pool = getDbPool();
  if (!pool) return false;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM invoice_items WHERE invoice_id = ANY($1::text[])', [ids]);
    await client.query('DELETE FROM payments WHERE invoice_id = ANY($1::text[])', [ids]);
    await client.query('UPDATE cheques SET invoice_id = NULL WHERE invoice_id = ANY($1::text[])', [ids]);
    const res = await client.query('DELETE FROM invoices WHERE id = ANY($1::text[])', [ids]);
    await client.query('COMMIT');
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to batch delete invoices:', err);
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
  const chequeId = (cheque.id && String(cheque.id).trim()) || crypto.randomUUID();
  const chequeNumber = (cheque.chequeNumber && String(cheque.chequeNumber).trim()) || `CHQ-${Date.now().toString().slice(-6)}`;
  const bank = (cheque.drawerBank && String(cheque.drawerBank).trim()) ||
               ((cheque as any).bankName && String((cheque as any).bankName).trim()) ||
               ((cheque as any).bank && String((cheque as any).bank).trim()) ||
               'General Bank';

  const chequeWithId: Cheque = {
    ...cheque,
    id: chequeId,
    chequeNumber,
    drawerBank: bank,
  };

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

  let validVendorId: string | null = null;
  if (cheque.vendorId) {
    try {
      const vRes = await pool.query('SELECT 1 FROM vendors WHERE id = $1', [cheque.vendorId]);
      if (vRes.rows.length > 0) validVendorId = cheque.vendorId;
    } catch {}
  }

  // If this is an outgoing cheque with a payee name, auto-ensure it exists in vendors directory
  if (cheque.type === 'outgoing' && cheque.payerOrPayeeName && cheque.payerOrPayeeName.trim()) {
    try {
      const vName = cheque.payerOrPayeeName.trim();
      const existingVendor = await pool.query('SELECT id FROM vendors WHERE LOWER(name) = LOWER($1)', [vName]);
      if (existingVendor.rows.length > 0) {
        validVendorId = existingVendor.rows[0].id;
      } else {
        const newVId = crypto.randomUUID();
        await pool.query(
          'INSERT INTO vendors (id, name, default_bank, default_branch, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, true, NOW(), NOW()) ON CONFLICT (id) DO NOTHING',
          [newVId, vName, cheque.drawerBank || '', cheque.branch || '']
        );
        validVendorId = newVId;
      }
    } catch (vErr) {
      console.warn('Auto vendor sync non-fatal warning:', vErr);
    }
  }

  const query = `
    INSERT INTO cheques (
      id, cheque_number, bank_name, bank_branch, amount, issue_date, cheque_date,
      client_id, billing_entity_id, invoice_id, payee_name, status, drawer_name,
      notes, image_url, reminders_enabled, reminder_days_before, last_reminder_sent_at,
      cleared_date, bounced_date, bounced_reason, type, vendor_id,
      purpose_of_payment, bill_reference, bank_account_id, image_back_url, expected_action_date,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
      $24, $25, $26, $27, $28, NOW()
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
      vendor_id = EXCLUDED.vendor_id,
      purpose_of_payment = EXCLUDED.purpose_of_payment,
      bill_reference = EXCLUDED.bill_reference,
      bank_account_id = EXCLUDED.bank_account_id,
      image_back_url = EXCLUDED.image_back_url,
      expected_action_date = EXCLUDED.expected_action_date,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    chequeId,
    chequeNumber,
    bank,
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
    validVendorId,
    cheque.purposeOfPayment || (cheque as any).purpose || '',
    cheque.billReference || (cheque as any).billRef || '',
    cheque.bankAccountId || '',
    cheque.imageBackUrl || '',
    cheque.expectedActionDate || cheque.chequeDate || new Date().toISOString().split('T')[0],
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
// VENDORS / SUPPLIERS
// -----------------------------------------------------------------------------
export async function getAllVendors(): Promise<Vendor[]> {
  const pool = getDbPool();
  if (!pool) return (getFallbackData() as any).vendors || [];

  try {
    const res = await pool.query('SELECT * FROM vendors WHERE is_active = true ORDER BY name ASC');
    return res.rows.map(mapVendorRow);
  } catch (err) {
    console.error('Error fetching vendors:', err);
    return (getFallbackData() as any).vendors || [];
  }
}

export async function saveVendor(vendor: Partial<Vendor>): Promise<Vendor> {
  const pool = getDbPool();
  const vendorId = (vendor.id && String(vendor.id).trim()) || crypto.randomUUID();
  const name = (vendor.name && String(vendor.name).trim()) || 'Unnamed Vendor';

  const vendorWithId: Vendor = {
    id: vendorId,
    name,
    contactPerson: vendor.contactPerson || '',
    email: vendor.email || '',
    phone: vendor.phone || '',
    address: vendor.address || '',
    taxNumber: vendor.taxNumber || '',
    defaultBank: vendor.defaultBank || '',
    defaultBranch: vendor.defaultBranch || '',
    defaultAccountNo: vendor.defaultAccountNo || '',
    notes: vendor.notes || '',
    isActive: vendor.isActive !== false,
    createdAt: vendor.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!pool) {
    const data = getFallbackData() as any;
    if (!data.vendors) data.vendors = [];
    const idx = data.vendors.findIndex((v: any) => v.id === vendorId);
    if (idx >= 0) data.vendors[idx] = vendorWithId;
    else data.vendors.push(vendorWithId);
    writeFallbackDb(data);
    return vendorWithId;
  }

  const query = `
    INSERT INTO vendors (
      id, name, contact_person, email, phone, address, tax_number,
      default_bank, default_branch, default_account_no, notes, is_active, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      contact_person = EXCLUDED.contact_person,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address,
      tax_number = EXCLUDED.tax_number,
      default_bank = EXCLUDED.default_bank,
      default_branch = EXCLUDED.default_branch,
      default_account_no = EXCLUDED.default_account_no,
      notes = EXCLUDED.notes,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    vendorId,
    name,
    vendor.contactPerson || '',
    vendor.email || '',
    vendor.phone || '',
    vendor.address || '',
    vendor.taxNumber || '',
    vendor.defaultBank || '',
    vendor.defaultBranch || '',
    vendor.defaultAccountNo || '',
    vendor.notes || '',
    vendor.isActive !== false,
  ];

  const res = await pool.query(query, values);
  return mapVendorRow(res.rows[0]);
}

export async function deleteVendor(id: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) {
    const data = getFallbackData() as any;
    if (data.vendors) {
      data.vendors = data.vendors.filter((v: any) => v.id !== id);
      writeFallbackDb(data);
    }
    return true;
  }

  try {
    const res = await pool.query('UPDATE vendors SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.error('Failed to delete vendor:', err);
    throw err;
  }
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
  const addressLine1 = r.address_line1 || (r.address ? r.address.split(',')[0]?.trim() : '');
  let defaultPdfLayout: any = undefined;
  if (r.default_pdf_layout) {
    try {
      defaultPdfLayout = typeof r.default_pdf_layout === 'string' ? JSON.parse(r.default_pdf_layout) : r.default_pdf_layout;
    } catch {}
  }

  return {
    id: r.id,
    name: r.name,
    displayName: r.legal_name || r.name,
    address: r.address || '',
    addressLine1,
    addressLine2: r.address_line2 || '',
    city: r.city || '',
    postalCode: r.postal_code || '',
    country: r.country || 'Sri Lanka',
    phone: r.phone || '',
    secondaryPhone: r.secondary_phone || '',
    email: r.email || '',
    website: r.website || '',
    brn: r.brn || '',
    vatNumber: r.vat_number || '',
    isVatRegistered: Boolean(r.vat_number),
    logoUrl: r.logo_url || '',
    bankName: r.bank_name || '',
    accountNumber: r.bank_account_number || '',
    branch: r.bank_branch || '',
    accountName: r.bank_account_name || '',
    swiftCode: r.swift_code || '',
    chequePayee: r.payee_name || r.name,
    paymentInstructions: r.payment_instructions || '',
    prefix: r.invoice_prefix || 'INV',
    startingSequence: r.starting_sequence || 1,
    currentSequence: r.invoice_next_number || 1,
    defaultCurrency: r.default_currency || 'LKR',
    defaultPaymentTerms: r.default_payment_terms || 'Immediate',
    defaultDueDays: r.default_due_days || 7,
    defaultInvoiceTemplate: r.default_invoice_template || 'standard',
    invoiceNotes: r.invoice_notes || '',
    primaryColor: r.primary_color || '#0f172a',
    secondaryColor: r.secondary_color || '#059669',
    headerStyle: r.header_style || 'classic',
    footerText: r.footer_text || '',
    defaultPdfLayout,
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
    expectedActionDate: r.expected_action_date
      ? new Date(r.expected_action_date).toISOString().split('T')[0]
      : (r.cheque_date ? new Date(r.cheque_date).toISOString().split('T')[0] : ''),
    payerOrPayeeName: r.payee_name || r.drawer_name || '',
    clientId: r.client_id || '',
    vendorId: r.vendor_id || '',
    billingEntityId: r.billing_entity_id || '',
    bankAccountId: r.bank_account_id || '',
    status: r.status || 'pending',
    purposeOfPayment: r.purpose_of_payment || '',
    billReference: r.bill_reference || '',
    notes: r.notes || '',
    imageFrontUrl: r.image_url || '',
    imageBackUrl: r.image_back_url || '',
    statusHistory: [],
    reminders: [],
    isReminderEnabled: r.reminders_enabled !== false,
    attachments: [],
    invoiceAllocations: [],
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapVendorRow(r: any): Vendor {
  return {
    id: r.id,
    name: r.name || '',
    contactPerson: r.contact_person || '',
    email: r.email || '',
    phone: r.phone || '',
    address: r.address || '',
    taxNumber: r.tax_number || '',
    defaultBank: r.default_bank || '',
    defaultBranch: r.default_branch || '',
    defaultAccountNo: r.default_account_no || '',
    notes: r.notes || '',
    isActive: r.is_active !== false,
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

// -----------------------------------------------------------------------------
// CHEQUE PRINT TEMPLATES & PRINTER PROFILES
// -----------------------------------------------------------------------------

function mapChequeTemplateRow(r: any): ChequePrintTemplate {
  const fields = typeof r.fields === 'string' ? JSON.parse(r.fields) : (r.fields || {});

  // Sanitize amountWords suffix to prevent duplicate "Rupees Only" from historical rows
  if (fields.amountWords && typeof fields.amountWords.suffix === 'string') {
    if (fields.amountWords.suffix.includes('Rupees Only')) {
      fields.amountWords.suffix = ' ***';
    }
  }

  // Populate crossing defaults if missing
  if (fields.crossing) {
    fields.crossing = {
      ...fields.crossing,
      text: fields.crossing.text || 'A/C PAYEE ONLY',
      angle: Number(fields.crossing.angle) || 0,
      showLines: fields.crossing.showLines ?? true,
      lineColor: fields.crossing.lineColor || fields.crossing.textColor || '#B3262D',
      textColor: fields.crossing.textColor || '#B3262D',
      lineThickness: Number(fields.crossing.lineThickness) || 0.35,
      lineLength: Number(fields.crossing.lineLength) || Number(fields.crossing.width) || 34,
      lineSpacing: Number(fields.crossing.lineSpacing) || 7.5,
      textLineGap: Number(fields.crossing.textLineGap) || 1.0,
      isVisible: Boolean(fields.crossing.isVisible),
    };
  }

  return {
    id: r.id,
    bankName: r.bank_name,
    templateName: r.template_name,
    chequeWidth: Number(r.cheque_width) || 178,
    chequeHeight: Number(r.cheque_height) || 89,
    a4Orientation: r.a4_orientation || 'landscape',
    a4Rotation: (Number(r.a4_rotation) || 0) as any,
    chequeRotation: (Number(r.cheque_rotation) || 0) as any,
    feedDirection: r.feed_direction || 'top',
    chequeX: Number(r.cheque_x) ?? 10,
    chequeY: Number(r.cheque_y) ?? 10,
    fields,
    isDefault: Boolean(r.is_default),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapPrinterProfileRow(r: any): ChequePrinterProfile {
  return {
    id: r.id,
    name: r.name,
    offsetX: Number(r.offset_x) || 0,
    offsetY: Number(r.offset_y) || 0,
    rotationCorrection: (Number(r.rotation_correction) || 0) as any,
    feedNotes: r.feed_notes || '',
    isDefault: Boolean(r.is_default),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function getAllChequeTemplates(): Promise<ChequePrintTemplate[]> {
  const pool = getDbPool();
  if (!pool) return [...DEFAULT_CHEQUE_TEMPLATES];

  try {
    const res = await pool.query('SELECT * FROM cheque_print_templates ORDER BY is_default DESC, bank_name ASC');
    if (res.rows.length === 0) {
      // Seed default templates if empty
      for (const tpl of DEFAULT_CHEQUE_TEMPLATES) {
        await saveChequeTemplate(tpl);
      }
      const recheck = await pool.query('SELECT * FROM cheque_print_templates ORDER BY is_default DESC, bank_name ASC');
      return recheck.rows.map(mapChequeTemplateRow);
    }
    return res.rows.map(mapChequeTemplateRow);
  } catch (err) {
    console.error('Error fetching cheque templates:', err);
    return [...DEFAULT_CHEQUE_TEMPLATES];
  }
}

export async function saveChequeTemplate(tpl: ChequePrintTemplate): Promise<ChequePrintTemplate> {
  const pool = getDbPool();
  const templateId = tpl.id || `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const templateWithId = { ...tpl, id: templateId };

  if (!pool) return templateWithId;

  const query = `
    INSERT INTO cheque_print_templates (
      id, bank_name, template_name, cheque_width, cheque_height,
      a4_orientation, a4_rotation, cheque_rotation, feed_direction,
      cheque_x, cheque_y, fields, is_default, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    ON CONFLICT (id) DO UPDATE SET
      bank_name = EXCLUDED.bank_name,
      template_name = EXCLUDED.template_name,
      cheque_width = EXCLUDED.cheque_width,
      cheque_height = EXCLUDED.cheque_height,
      a4_orientation = EXCLUDED.a4_orientation,
      a4_rotation = EXCLUDED.a4_rotation,
      cheque_rotation = EXCLUDED.cheque_rotation,
      feed_direction = EXCLUDED.feed_direction,
      cheque_x = EXCLUDED.cheque_x,
      cheque_y = EXCLUDED.cheque_y,
      fields = EXCLUDED.fields,
      is_default = EXCLUDED.is_default,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    templateId,
    tpl.bankName || 'General Bank',
    tpl.templateName || 'Default Cheque Layout',
    Number(tpl.chequeWidth) || 178,
    Number(tpl.chequeHeight) || 89,
    tpl.a4Orientation || 'landscape',
    Number(tpl.a4Rotation) || 0,
    Number(tpl.chequeRotation) || 0,
    tpl.feedDirection || 'top',
    Number(tpl.chequeX) ?? 10,
    Number(tpl.chequeY) ?? 10,
    JSON.stringify(tpl.fields || {}),
    Boolean(tpl.isDefault),
  ];

  const res = await pool.query(query, values);
  return mapChequeTemplateRow(res.rows[0]);
}

export async function deleteChequeTemplate(id: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) return false;
  const res = await pool.query('DELETE FROM cheque_print_templates WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function getAllChequePrinterProfiles(): Promise<ChequePrinterProfile[]> {
  const pool = getDbPool();
  if (!pool) return [...DEFAULT_PRINTER_PROFILES];

  try {
    const res = await pool.query('SELECT * FROM cheque_printer_profiles ORDER BY is_default DESC, name ASC');
    if (res.rows.length === 0) {
      for (const prn of DEFAULT_PRINTER_PROFILES) {
        await saveChequePrinterProfile(prn);
      }
      const recheck = await pool.query('SELECT * FROM cheque_printer_profiles ORDER BY is_default DESC, name ASC');
      return recheck.rows.map(mapPrinterProfileRow);
    }
    return res.rows.map(mapPrinterProfileRow);
  } catch (err) {
    console.error('Error fetching printer profiles:', err);
    return [...DEFAULT_PRINTER_PROFILES];
  }
}

export async function saveChequePrinterProfile(prn: ChequePrinterProfile): Promise<ChequePrinterProfile> {
  const pool = getDbPool();
  const profileId = prn.id || `prn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const profileWithId = { ...prn, id: profileId };

  if (!pool) return profileWithId;

  const query = `
    INSERT INTO cheque_printer_profiles (
      id, name, offset_x, offset_y, rotation_correction, feed_notes, is_default, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      offset_x = EXCLUDED.offset_x,
      offset_y = EXCLUDED.offset_y,
      rotation_correction = EXCLUDED.rotation_correction,
      feed_notes = EXCLUDED.feed_notes,
      is_default = EXCLUDED.is_default,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    profileId,
    prn.name || 'Printer Profile',
    Number(prn.offsetX) || 0,
    Number(prn.offsetY) || 0,
    Number(prn.rotationCorrection) || 0,
    prn.feedNotes || '',
    Boolean(prn.isDefault),
  ];

  const res = await pool.query(query, values);
  return mapPrinterProfileRow(res.rows[0]);
}

export async function deleteChequePrinterProfile(id: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) return false;
  const res = await pool.query('DELETE FROM cheque_printer_profiles WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function recordChequePrintJob(job: Partial<ChequePrintJob>): Promise<ChequePrintJob> {
  const pool = getDbPool();
  const jobId = job.id || `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  if (!pool) {
    return {
      id: jobId,
      chequeId: job.chequeId,
      templateId: job.templateId,
      printerProfileId: job.printerProfileId,
      printType: job.printType || 'final',
      printedAt: now,
      settingsSnapshot: job.settingsSnapshot,
    };
  }

  const query = `
    INSERT INTO cheque_print_jobs (
      id, cheque_id, template_id, printer_profile_id, print_type, printed_at, settings_snapshot
    ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    RETURNING *;
  `;

  const values = [
    jobId,
    job.chequeId || null,
    job.templateId || null,
    job.printerProfileId || null,
    job.printType || 'final',
    JSON.stringify(job.settingsSnapshot || {}),
  ];

  const res = await pool.query(query, values);
  const row = res.rows[0];
  return {
    id: row.id,
    chequeId: row.cheque_id,
    templateId: row.template_id,
    printerProfileId: row.printer_profile_id,
    printType: row.print_type,
    printedAt: new Date(row.printed_at).toISOString(),
    settingsSnapshot: typeof row.settings_snapshot === 'string' ? JSON.parse(row.settings_snapshot) : (row.settings_snapshot || {}),
  };
}

export async function getChequePrintJobs(chequeId?: string): Promise<ChequePrintJob[]> {
  const pool = getDbPool();
  if (!pool) return [];

  try {
    const query = chequeId
      ? 'SELECT * FROM cheque_print_jobs WHERE cheque_id = $1 ORDER BY printed_at DESC LIMIT 50'
      : 'SELECT * FROM cheque_print_jobs ORDER BY printed_at DESC LIMIT 50';
    const params = chequeId ? [chequeId] : [];
    const res = await pool.query(query, params);
    return res.rows.map((row) => ({
      id: row.id,
      chequeId: row.cheque_id,
      templateId: row.template_id,
      printerProfileId: row.printer_profile_id,
      printType: row.print_type,
      printedAt: new Date(row.printed_at).toISOString(),
      settingsSnapshot: typeof row.settings_snapshot === 'string' ? JSON.parse(row.settings_snapshot) : (row.settings_snapshot || {}),
    }));
  } catch (err) {
    console.error('Error fetching print jobs:', err);
    return [];
  }
}
