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
  MediaSchedule,
  MediaScheduleItem,
  MediaScheduleAllocation,
  MediaType,
  MediaScheduleStatus,
  MediaPricingMode,
  MediaPdfOrientation,
  MediaPdfPaperSize,
  Supplier,
  SupplierType,
  SupplierStatus,
  SupplierPayable,
  SupplierPaymentStatus,
  SupplierPaymentMethod,
  SupplierPaymentTransaction,
  SupplierTransactionStatus,
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
  mediaSchedules?: MediaSchedule[];
  suppliers?: Supplier[];
  supplierPayables?: SupplierPayable[];
}

/**
 * Timezone-safe SQL date formatter.
 * Prevents UTC conversion from shifting dates backwards by 1 day in local timezones (e.g. UTC+05:30).
 */
export function formatDbDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.split('T')[0];
  }
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(val).split('T')[0];
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

    // 9. Media Schedules
    let mediaSchedules: MediaSchedule[] = [];
    try {
      mediaSchedules = await getAllMediaSchedules();
    } catch (e) {
      console.error('Failed to get media schedules in bootstrap:', e);
      mediaSchedules = [];
    }

    // 10. Suppliers & Supplier Payables
    let suppliers: Supplier[] = [];
    let supplierPayables: SupplierPayable[] = [];
    try {
      suppliers = await getAllSuppliers();
      supplierPayables = await getAllSupplierPayables();
    } catch (e) {
      console.error('Failed to get suppliers/payables in bootstrap:', e);
      suppliers = [];
      supplierPayables = [];
    }

    return {
      billingEntities,
      clients,
      services,
      mediaChannels,
      invoices,
      cheques,
      vendors,
      branding,
      mediaSchedules,
      suppliers,
      supplierPayables,
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
        approval_snapshot, pdf_layout, media_schedule_id, media_schedule_number, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, NOW()
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
        media_schedule_id = EXCLUDED.media_schedule_id,
        media_schedule_number = EXCLUDED.media_schedule_number,
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
      invoice.mediaScheduleId || null,
      invoice.mediaScheduleNumber || null,
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
  return deleteInvoicesBatch([id]);
}

export async function deleteInvoicesBatch(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  const pool = getDbPool();
  if (!pool) return false;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if any invoice has recorded payments
    const pmtCheck = await client.query('SELECT COUNT(*) FROM payments WHERE invoice_id = ANY($1::text[])', [ids]);
    const pmtCount = Number(pmtCheck.rows[0]?.count) || 0;
    if (pmtCount > 0) {
      throw new Error(`Cannot delete invoice(s): ${pmtCount} recorded payment(s) exist. Please remove or reverse payments before deleting.`);
    }

    // Detach linked media schedules safely
    await client.query(
      `UPDATE media_schedules 
       SET status = 'confirmed', converted_to_invoice_id = NULL, converted_to_invoice_number = NULL, updated_at = NOW() 
       WHERE converted_to_invoice_id = ANY($1::text[])`,
      [ids]
    );

    await client.query('DELETE FROM invoice_items WHERE invoice_id = ANY($1::text[])', [ids]);
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
    invoiceDate: formatDbDate(r.invoice_date),
    dueDate: r.due_date ? formatDbDate(r.due_date) : undefined,
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
    mediaScheduleId: r.media_schedule_id || undefined,
    mediaScheduleNumber: r.media_schedule_number || undefined,
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
    paymentDate: formatDbDate(r.payment_date),
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
    chequeDate: formatDbDate(r.cheque_date),
    receivedOrIssuedDate: formatDbDate(r.issue_date),
    expectedActionDate: r.expected_action_date
      ? formatDbDate(r.expected_action_date)
      : (r.cheque_date ? formatDbDate(r.cheque_date) : ''),
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

// -----------------------------------------------------------------------------
// MEDIA SCHEDULING MANAGEMENT MODULE
// -----------------------------------------------------------------------------

function mapMediaScheduleRow(r: any, items: MediaScheduleItem[] = []): MediaSchedule {
  return {
    id: r.id,
    scheduleNumber: r.schedule_number,
    billingEntityId: r.billing_entity_id,
    clientId: r.client_id,
    mediaChannelId: r.media_channel_id || undefined,
    mediaChannelName: r.media_channel_name,
    mediaType: (r.media_type || 'tv') as MediaType,
    campaignName: r.campaign_name,
    startDate: formatDbDate(r.start_date),
    endDate: formatDbDate(r.end_date),
    status: (r.status || 'draft') as MediaScheduleStatus,
    pricingMode: (r.pricing_mode || 'package') as MediaPricingMode,
    totalSpots: Number(r.total_spots) || 0,
    packageAmount: Number(r.package_amount) || 0,
    ratePerSpot: Number(r.rate_per_spot) || 0,
    grossAmount: Number(r.gross_amount) || 0,
    discountAmount: Number(r.discount_amount) || 0,
    taxApplicable: Boolean(r.tax_applicable),
    taxRate: Number(r.tax_rate) || 0,
    taxAmount: Number(r.tax_amount) || 0,
    netTotal: Number(r.net_total) || 0,
    currency: r.currency || 'LKR',
    specialNotes: r.special_notes || '',
    termsAndConditions: r.terms_and_conditions || '',
    pdfOrientation: (r.pdf_orientation || 'landscape') as MediaPdfOrientation,
    pdfPaperSize: (r.pdf_paper_size || 'A4') as MediaPdfPaperSize,
    pdfTemplateSettings: typeof r.pdf_template_settings === 'string' ? JSON.parse(r.pdf_template_settings) : (r.pdf_template_settings || {}),
    convertedToInvoiceId: r.converted_to_invoice_id || undefined,
    convertedToInvoiceNumber: r.converted_to_invoice_number || undefined,
    convertedAt: r.converted_at ? new Date(r.converted_at).toISOString() : undefined,
    clientSnapshot: typeof r.client_snapshot === 'string' ? JSON.parse(r.client_snapshot) : (r.client_snapshot || undefined),
    billingEntitySnapshot: typeof r.billing_entity_snapshot === 'string' ? JSON.parse(r.billing_entity_snapshot) : (r.billing_entity_snapshot || undefined),
    items,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function getAllMediaSchedules(): Promise<MediaSchedule[]> {
  const pool = getDbPool();
  if (!pool) return (getFallbackData() as any).mediaSchedules || [];

  try {
    const schedulesRes = await pool.query('SELECT * FROM media_schedules ORDER BY start_date DESC, created_at DESC');
    const itemsRes = await pool.query('SELECT * FROM media_schedule_items ORDER BY display_order ASC, created_at ASC');
    const allocsRes = await pool.query('SELECT * FROM media_schedule_allocations ORDER BY date ASC');

    const allocsByItem: Record<string, Record<string, number>> = {};
    for (const a of allocsRes.rows) {
      if (!allocsByItem[a.item_id]) allocsByItem[a.item_id] = {};
      const d = formatDbDate(a.date);
      if (d) allocsByItem[a.item_id][d] = Number(a.spots) || 0;
    }

    const itemsBySchedule: Record<string, MediaScheduleItem[]> = {};
    for (const it of itemsRes.rows) {
      if (!itemsBySchedule[it.schedule_id]) itemsBySchedule[it.schedule_id] = [];
      const allocs = allocsByItem[it.id] || {};
      const spotSum = Object.values(allocs).reduce((sum, n) => sum + n, 0);
      const totalSpots = it.total_spots || spotSum;
      itemsBySchedule[it.schedule_id].push({
        id: it.id,
        scheduleId: it.schedule_id,
        programmeName: it.programme_name,
        timeSlot: it.time_slot || '',
        duration: it.duration || '',
        adType: it.ad_type || 'Spot',
        ratePerSpot: Number(it.rate_per_spot) || 0,
        totalSpots,
        totalAmount: Number(it.total_amount) || (totalSpots * (Number(it.rate_per_spot) || 0)),
        displayOrder: it.display_order || 0,
        allocations: allocs,
      });
    }

    return schedulesRes.rows.map((row) =>
      mapMediaScheduleRow(row, itemsBySchedule[row.id] || [])
    );
  } catch (err) {
    console.error('Error fetching media schedules:', err);
    return [];
  }
}

export async function getMediaScheduleById(id: string): Promise<MediaSchedule | null> {
  const pool = getDbPool();
  if (!pool) {
    const list = (getFallbackData() as any).mediaSchedules || [];
    return list.find((s: any) => s.id === id) || null;
  }

  try {
    const schedRes = await pool.query('SELECT * FROM media_schedules WHERE id = $1', [id]);
    if (!schedRes.rows.length) return null;

    const itemsRes = await pool.query('SELECT * FROM media_schedule_items WHERE schedule_id = $1 ORDER BY display_order ASC, created_at ASC', [id]);
    const allocsRes = await pool.query('SELECT * FROM media_schedule_allocations WHERE schedule_id = $1 ORDER BY date ASC', [id]);

    const allocsByItem: Record<string, Record<string, number>> = {};
    for (const a of allocsRes.rows) {
      if (!allocsByItem[a.item_id]) allocsByItem[a.item_id] = {};
      const d = formatDbDate(a.date);
      if (d) allocsByItem[a.item_id][d] = Number(a.spots) || 0;
    }

    const items: MediaScheduleItem[] = itemsRes.rows.map((it) => {
      const allocs = allocsByItem[it.id] || {};
      const spotSum = Object.values(allocs).reduce((sum, n) => sum + n, 0);
      const totalSpots = it.total_spots || spotSum;
      return {
        id: it.id,
        scheduleId: it.schedule_id,
        programmeName: it.programme_name,
        timeSlot: it.time_slot || '',
        duration: it.duration || '',
        adType: it.ad_type || 'Spot',
        ratePerSpot: Number(it.rate_per_spot) || 0,
        totalSpots,
        totalAmount: Number(it.total_amount) || (totalSpots * (Number(it.rate_per_spot) || 0)),
        displayOrder: it.display_order || 0,
        allocations: allocs,
      };
    });

    return mapMediaScheduleRow(schedRes.rows[0], items);
  } catch (err) {
    console.error('Error fetching media schedule by id:', err);
    return null;
  }
}

export async function saveMediaSchedule(schedule: MediaSchedule): Promise<MediaSchedule> {
  const pool = getDbPool();
  const scheduleId = (schedule.id && String(schedule.id).trim()) || crypto.randomUUID();

  // Calculate spots and amounts
  const items = (schedule.items || []).map((it, idx) => {
    const allocs = it.allocations || {};
    const totalSpots = Object.values(allocs).reduce((sum, n) => sum + (Number(n) || 0), 0) || it.totalSpots || 0;
    const rate = Number(it.ratePerSpot) || 0;
    const totalAmount = it.totalAmount || (totalSpots * rate);
    return {
      ...it,
      id: it.id || crypto.randomUUID(),
      scheduleId,
      totalSpots,
      totalAmount,
      displayOrder: it.displayOrder ?? idx,
      allocations: allocs,
    };
  });

  const grandTotalSpots = items.reduce((acc, it) => acc + it.totalSpots, 0);

  let grossAmount = 0;
  if (schedule.pricingMode === 'package') {
    grossAmount = Number(schedule.packageAmount) || Number(schedule.grossAmount) || 0;
  } else if (schedule.pricingMode === 'spot_rate') {
    grossAmount = items.reduce((acc, it) => acc + (it.totalAmount || (it.totalSpots * (it.ratePerSpot || schedule.ratePerSpot || 0))), 0);
  } else {
    grossAmount = 0;
  }

  const discountAmount = Number(schedule.discountAmount) || 0;
  const taxableBase = Math.max(0, grossAmount - discountAmount);
  const taxApplicable = Boolean(schedule.taxApplicable);
  const taxRate = taxApplicable ? (Number(schedule.taxRate) || 18) : 0;
  const taxAmount = taxApplicable ? Math.round(taxableBase * (taxRate / 100)) : 0;
  const netTotal = taxableBase + taxAmount;

  if (!pool) {
    const data = getFallbackData() as any;
    if (!data.mediaSchedules) data.mediaSchedules = [];
    const updated: MediaSchedule = {
      ...schedule,
      id: scheduleId,
      totalSpots: grandTotalSpots,
      grossAmount,
      taxAmount,
      netTotal,
      items,
      updatedAt: new Date().toISOString(),
    };
    const idx = data.mediaSchedules.findIndex((s: any) => s.id === scheduleId);
    if (idx >= 0) data.mediaSchedules[idx] = updated;
    else data.mediaSchedules.push(updated);
    writeFallbackDb(data);
    return updated;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure schedule number exists and does not conflict
    let scheduleNumber = schedule.scheduleNumber?.trim();
    const existingIdRes = await client.query('SELECT id, schedule_number FROM media_schedules WHERE id = $1', [scheduleId]);
    const isExistingRecord = existingIdRes.rows.length > 0;

    let entityPrefix = 'SN';
    if (schedule.billingEntityId) {
      const entRes = await client.query('SELECT invoice_prefix FROM billing_entities WHERE id = $1', [schedule.billingEntityId]);
      if (entRes.rows.length > 0 && entRes.rows[0].invoice_prefix) {
        entityPrefix = entRes.rows[0].invoice_prefix;
      }
    }
    const year = new Date().getFullYear();

    if (!scheduleNumber) {
      const pattern = `SCH-${entityPrefix}-${year}-%`;
      const maxRes = await client.query('SELECT schedule_number FROM media_schedules WHERE schedule_number LIKE $1', [pattern]);
      const numbers = maxRes.rows.map((r: any) => {
        const m = r.schedule_number.match(new RegExp(`^SCH-${entityPrefix}-${year}-(\\d+)$`, 'i'));
        return m ? parseInt(m[1], 10) : 0;
      }).filter((n: number) => !isNaN(n) && n > 0);
      const maxSeq = numbers.length > 0 ? Math.max(...numbers) : 0;
      scheduleNumber = `SCH-${entityPrefix}-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
    } else if (!isExistingRecord) {
      // Check if this scheduleNumber is already taken by another row
      const dupRes = await client.query('SELECT id FROM media_schedules WHERE schedule_number = $1', [scheduleNumber]);
      if (dupRes.rows.length > 0) {
        // Schedule number is already taken! Auto-increment to next available
        const pattern = `SCH-${entityPrefix}-${year}-%`;
        const maxRes = await client.query('SELECT schedule_number FROM media_schedules WHERE schedule_number LIKE $1', [pattern]);
        const numbers = maxRes.rows.map((r: any) => {
          const m = r.schedule_number.match(new RegExp(`^SCH-${entityPrefix}-${year}-(\\d+)$`, 'i'));
          return m ? parseInt(m[1], 10) : 0;
        }).filter((n: number) => !isNaN(n) && n > 0);
        const maxSeq = numbers.length > 0 ? Math.max(...numbers) : 0;
        scheduleNumber = `SCH-${entityPrefix}-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
      }
    }

    const schedQuery = `
      INSERT INTO media_schedules (
        id, schedule_number, billing_entity_id, client_id, media_channel_id,
        media_channel_name, media_type, campaign_name, start_date, end_date,
        status, pricing_mode, total_spots, package_amount, rate_per_spot,
        gross_amount, discount_amount, tax_applicable, tax_rate, tax_amount,
        net_total, currency, special_notes, terms_and_conditions, pdf_orientation,
        pdf_paper_size, pdf_template_settings, converted_to_invoice_id,
        converted_to_invoice_number, converted_at, client_snapshot,
        billing_entity_snapshot, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        schedule_number = EXCLUDED.schedule_number,
        billing_entity_id = EXCLUDED.billing_entity_id,
        client_id = EXCLUDED.client_id,
        media_channel_id = EXCLUDED.media_channel_id,
        media_channel_name = EXCLUDED.media_channel_name,
        media_type = EXCLUDED.media_type,
        campaign_name = EXCLUDED.campaign_name,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status,
        pricing_mode = EXCLUDED.pricing_mode,
        total_spots = EXCLUDED.total_spots,
        package_amount = EXCLUDED.package_amount,
        rate_per_spot = EXCLUDED.rate_per_spot,
        gross_amount = EXCLUDED.gross_amount,
        discount_amount = EXCLUDED.discount_amount,
        tax_applicable = EXCLUDED.tax_applicable,
        tax_rate = EXCLUDED.tax_rate,
        tax_amount = EXCLUDED.tax_amount,
        net_total = EXCLUDED.net_total,
        currency = EXCLUDED.currency,
        special_notes = EXCLUDED.special_notes,
        terms_and_conditions = EXCLUDED.terms_and_conditions,
        pdf_orientation = EXCLUDED.pdf_orientation,
        pdf_paper_size = EXCLUDED.pdf_paper_size,
        pdf_template_settings = EXCLUDED.pdf_template_settings,
        converted_to_invoice_id = EXCLUDED.converted_to_invoice_id,
        converted_to_invoice_number = EXCLUDED.converted_to_invoice_number,
        converted_at = EXCLUDED.converted_at,
        client_snapshot = EXCLUDED.client_snapshot,
        billing_entity_snapshot = EXCLUDED.billing_entity_snapshot,
        updated_at = NOW()
      RETURNING *;
    `;

    const schedValues = [
      scheduleId,
      scheduleNumber,
      schedule.billingEntityId,
      schedule.clientId,
      schedule.mediaChannelId || null,
      schedule.mediaChannelName || 'General Broadcast',
      schedule.mediaType || 'tv',
      schedule.campaignName || 'Campaign Schedule',
      schedule.startDate,
      schedule.endDate,
      schedule.status || 'draft',
      schedule.pricingMode || 'package',
      grandTotalSpots,
      Number(schedule.packageAmount) || 0,
      Number(schedule.ratePerSpot) || 0,
      grossAmount,
      discountAmount,
      taxApplicable,
      taxRate,
      taxAmount,
      netTotal,
      schedule.currency || 'LKR',
      schedule.specialNotes || '',
      schedule.termsAndConditions || '',
      schedule.pdfOrientation || 'landscape',
      schedule.pdfPaperSize || 'A4',
      JSON.stringify(schedule.pdfTemplateSettings || {}),
      schedule.convertedToInvoiceId || null,
      schedule.convertedToInvoiceNumber || null,
      schedule.convertedAt ? new Date(schedule.convertedAt) : null,
      JSON.stringify(schedule.clientSnapshot || {}),
      JSON.stringify(schedule.billingEntitySnapshot || {}),
    ];

    await client.query(schedQuery, schedValues);

    // Atomic replace of items and allocations
    await client.query('DELETE FROM media_schedule_items WHERE schedule_id = $1', [scheduleId]);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await client.query(
        `INSERT INTO media_schedule_items (
          id, schedule_id, programme_name, time_slot, duration, ad_type,
          rate_per_spot, total_spots, total_amount, display_order, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          it.id,
          scheduleId,
          it.programmeName,
          it.timeSlot || '',
          it.duration || '',
          it.adType || 'Spot',
          it.ratePerSpot || 0,
          it.totalSpots || 0,
          it.totalAmount || 0,
          i,
        ]
      );

      const dates = Object.keys(it.allocations || {});
      for (const d of dates) {
        const spotCount = Number(it.allocations![d]) || 0;
        if (spotCount > 0) {
          await client.query(
            `INSERT INTO media_schedule_allocations (
              id, schedule_id, item_id, date, spots, created_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (item_id, date) DO UPDATE SET spots = EXCLUDED.spots`,
            [
              crypto.randomUUID(),
              scheduleId,
              it.id,
              d,
              spotCount,
            ]
          );
        }
      }
    }

    await client.query('COMMIT');

    return {
      ...schedule,
      id: scheduleId,
      scheduleNumber,
      totalSpots: grandTotalSpots,
      grossAmount,
      taxAmount,
      netTotal,
      items,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to save media schedule transactionally:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteMediaSchedule(id: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) {
    const data = getFallbackData() as any;
    if (data.mediaSchedules) {
      data.mediaSchedules = data.mediaSchedules.filter((s: any) => s.id !== id);
      writeFallbackDb(data);
    }
    return true;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if converted to invoice
    const invCheck = await client.query(
      'SELECT id, invoice_number FROM invoices WHERE media_schedule_id = $1 OR id IN (SELECT converted_to_invoice_id FROM media_schedules WHERE id = $1 AND converted_to_invoice_id IS NOT NULL)',
      [id]
    );
    if (invCheck.rows.length > 0) {
      throw new Error(`Cannot delete schedule: It has already been converted to Invoice #${invCheck.rows[0].invoice_number}. Please delete or unlink the invoice first.`);
    }

    // Check if linked to supplier payables
    const payCheck = await client.query('SELECT COUNT(*) FROM supplier_payables WHERE schedule_id = $1', [id]);
    const payCount = Number(payCheck.rows[0]?.count) || 0;
    if (payCount > 0) {
      throw new Error(`Cannot delete schedule: There are ${payCount} supplier payable bill(s) linked to this schedule. Remove or unlink them first.`);
    }

    await client.query('DELETE FROM media_schedule_allocations WHERE schedule_id = $1', [id]);
    await client.query('DELETE FROM media_schedule_items WHERE schedule_id = $1', [id]);
    const res = await client.query('DELETE FROM media_schedules WHERE id = $1', [id]);
    await client.query('COMMIT');
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to delete media schedule:', err);
    throw err;
  } finally {
    client.release();
  }
}


export async function convertScheduleToInvoice(
  scheduleId: string,
  mode: 'itemized' | 'package' = 'package',
  options?: {
    invoiceDate?: string;
    dueDate?: string;
    notes?: string;
  }
): Promise<Invoice> {
  const schedule = await getMediaScheduleById(scheduleId);
  if (!schedule) {
    throw new Error('Schedule not found');
  }

  if (schedule.convertedToInvoiceId) {
    const allInvoices = await getAllInvoices();
    const existing = allInvoices.find(i => i.id === schedule.convertedToInvoiceId);
    if (existing) {
      return existing;
    }
  }

  const [entities, clients] = await Promise.all([
    getAllBillingEntities(),
    getAllClients(),
  ]);

  const entity = entities.find(e => e.id === schedule.billingEntityId) || entities[0];
  const client = clients.find(c => c.id === schedule.clientId) || clients[0];

  if (!entity || !client) {
    throw new Error('Billing Entity or Client not found for schedule conversion');
  }

  const prefix = entity.prefix || (entity as any).invoicePrefix || 'INV';
  const nextSeq = entity.currentSequence || entity.startingSequence || (entity as any).invoiceNextNumber || 1;
  const invNumber = `${prefix}-${nextSeq}`;

  const invDate = options?.invoiceDate || new Date().toISOString().split('T')[0];
  const dueDays = entity.defaultDueDays || 7;
  const dueDateObj = new Date(invDate);
  dueDateObj.setDate(dueDateObj.getDate() + dueDays);
  const invDueDate = options?.dueDate || dueDateObj.toISOString().split('T')[0];

  const invoiceItems: InvoiceItem[] = [];

  if (mode === 'package') {
    const packageAmount = schedule.packageAmount || schedule.grossAmount || 0;
    invoiceItems.push({
      id: crypto.randomUUID(),
      invoiceId: '',
      serviceName: `${schedule.mediaType.toUpperCase()} Advertising Broadcast Package - ${schedule.mediaChannelName}`,
      description: `Campaign: ${schedule.campaignName} | Media Channel: ${schedule.mediaChannelName} | Broadcast Period: ${schedule.startDate} to ${schedule.endDate} | Total Transmissions: ${schedule.totalSpots} spots. ${schedule.specialNotes ? `(${schedule.specialNotes})` : ''}`.trim(),
      quantity: 1,
      unitPrice: packageAmount,
      lineTotal: packageAmount,
      mediaChannel: schedule.mediaChannelName,
      servicePeriod: `${schedule.startDate} to ${schedule.endDate}`,
      advertisingPeriod: `${schedule.startDate} to ${schedule.endDate}`,
      referenceType: 'schedule' as any,
      referenceNumber: schedule.scheduleNumber,
      sortOrder: 0,
    });
  } else {
    schedule.items.forEach((item, index) => {
      const spots = item.totalSpots || 0;
      const rate = item.ratePerSpot || (schedule.totalSpots > 0 ? (schedule.grossAmount / schedule.totalSpots) : 0);
      const amount = item.totalAmount || (spots * rate);

      invoiceItems.push({
        id: crypto.randomUUID(),
        invoiceId: '',
        serviceName: `${schedule.mediaChannelName} - ${item.programmeName}`,
        description: `Time: ${item.timeSlot || 'Standard'} | Duration: ${item.duration || 'Standard'} | Type: ${item.adType || 'Commercial Spot'} | Scheduled Transmissions: ${spots} spots | Broadcast Period: ${schedule.startDate} to ${schedule.endDate}`,
        quantity: spots,
        unitPrice: rate,
        lineTotal: amount,
        mediaChannel: schedule.mediaChannelName,
        servicePeriod: `${schedule.startDate} to ${schedule.endDate}`,
        advertisingPeriod: `${schedule.startDate} to ${schedule.endDate}`,
        referenceType: 'schedule' as any,
        referenceNumber: schedule.scheduleNumber,
        sortOrder: index,
      });
    });
  }

  const subtotal = invoiceItems.reduce((acc, it) => acc + (it.lineTotal || 0), 0);
  const vatRate = schedule.taxApplicable ? (schedule.taxRate || 18) : 0;
  const vatAmount = schedule.taxApplicable ? Math.round(subtotal * (vatRate / 100)) : 0;
  const grandTotal = subtotal + vatAmount;

  const newInvoice: Invoice = {
    id: crypto.randomUUID(),
    invoiceNumber: invNumber,
    clientId: client.id,
    billingEntityId: entity.id,
    templateKey: (entity.defaultInvoiceTemplate as any) || 'standard',
    status: 'draft',
    sentStatus: 'not_sent',
    paymentStatus: 'unpaid',
    invoiceDate: invDate,
    dueDate: invDueDate,
    subtotal,
    vatApplicable: schedule.taxApplicable,
    vatRate,
    vatAmount,
    grandTotal,
    totalPaid: 0,
    outstandingBalance: grandTotal,
    advancePercentage: 0,
    advanceAmount: 0,
    specialNotes: options?.notes || schedule.specialNotes || entity.invoiceNotes || '',
    mediaScheduleId: schedule.id,
    mediaScheduleNumber: schedule.scheduleNumber,
    clientSnapshot: {
      id: client.id,
      companyName: client.name || (client as any).companyName,
      address: client.address || '',
      email: client.email || '',
      phone: client.mobile || (client as any).phone || '',
      vatNumber: client.vatNumber || '',
    } as any,
    billingSnapshot: {
      id: entity.id,
      name: entity.name,
      legalName: entity.legalName || entity.name,
      address: entity.address || '',
      phone: entity.phone || '',
      email: entity.email || '',
      vatNumber: entity.vatNumber || '',
      logoUrl: entity.logoUrl || '',
      bankName: entity.bankName || '',
      bankAccountNumber: entity.accountNumber || (entity as any).bankAccountNumber || '',
      bankBranch: entity.branch || (entity as any).bankBranch || '',
      bankAccountName: entity.accountName || (entity as any).bankAccountName || '',
    } as any,
    items: invoiceItems,
    payments: [],
    shareHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const savedInvoice = await saveInvoice(newInvoice);

  const poolUpdate = getDbPool();
  if (poolUpdate) {
    await poolUpdate.query(
      `UPDATE media_schedules
       SET status = 'converted',
           converted_to_invoice_id = $1,
           converted_to_invoice_number = $2,
           converted_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [savedInvoice.id, savedInvoice.invoiceNumber, schedule.id]
    );
  }

  return savedInvoice;
}

// ==========================================
// SUPPLIERS SERVICE
// ==========================================

export async function getAllSuppliers(): Promise<Supplier[]> {
  await initializeDatabase();
  const pool = getDbPool();
  if (!pool) {
    const data = readFallbackDb();
    return data.suppliers || [];
  }

  try {
    const res = await pool.query(`
      SELECT s.*, 
             COALESCE(array_agg(sc.channel_name) FILTER (WHERE sc.channel_name IS NOT NULL), '{}') as channel_names
      FROM suppliers s
      LEFT JOIN supplier_channels sc ON s.id = sc.supplier_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);

    return res.rows.map((r) => ({
      id: r.id,
      supplierCode: r.supplier_code,
      name: r.name,
      type: r.type as SupplierType,
      businessAddress: r.business_address || '',
      contactPerson: r.contact_person || '',
      phone: r.phone || '',
      email: r.email || '',
      taxNumber: r.tax_number || '',
      bankName: r.bank_name || '',
      branch: r.branch || '',
      accountName: r.account_name || '',
      accountNumber: r.account_number || '',
      swiftCode: r.swift_code || '',
      paymentTerms: r.payment_terms || 'Net 30',
      status: r.status as SupplierStatus,
      notes: r.notes || '',
      channelNames: r.channel_names || [],
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    return [];
  }
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  await initializeDatabase();
  const pool = getDbPool();
  if (!pool) {
    const data = readFallbackDb();
    return (data.suppliers || []).find((s: any) => s.id === id) || null;
  }

  try {
    const res = await pool.query(`
      SELECT s.*, 
             COALESCE(array_agg(sc.channel_name) FILTER (WHERE sc.channel_name IS NOT NULL), '{}') as channel_names
      FROM suppliers s
      LEFT JOIN supplier_channels sc ON s.id = sc.supplier_id
      WHERE s.id = $1
      GROUP BY s.id
    `, [id]);

    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      supplierCode: r.supplier_code,
      name: r.name,
      type: r.type as SupplierType,
      businessAddress: r.business_address || '',
      contactPerson: r.contact_person || '',
      phone: r.phone || '',
      email: r.email || '',
      taxNumber: r.tax_number || '',
      bankName: r.bank_name || '',
      branch: r.branch || '',
      accountName: r.account_name || '',
      accountNumber: r.account_number || '',
      swiftCode: r.swift_code || '',
      paymentTerms: r.payment_terms || 'Net 30',
      status: r.status as SupplierStatus,
      notes: r.notes || '',
      channelNames: r.channel_names || [],
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error fetching supplier by id:', err);
    return null;
  }
}

export async function saveSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
  await initializeDatabase();
  const pool = getDbPool();
  const supplierId = (supplier.id && String(supplier.id).trim()) || crypto.randomUUID();

  if (!pool) {
    const data = readFallbackDb();
    if (!data.suppliers) data.suppliers = [];
    const updated: Supplier = {
      id: supplierId,
      supplierCode: supplier.supplierCode || `SUP-${String(data.suppliers.length + 1).padStart(3, '0')}`,
      name: supplier.name || 'Unnamed Supplier',
      type: supplier.type || 'tv',
      businessAddress: supplier.businessAddress || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      taxNumber: supplier.taxNumber || '',
      bankName: supplier.bankName || '',
      branch: supplier.branch || '',
      accountName: supplier.accountName || '',
      accountNumber: supplier.accountNumber || '',
      swiftCode: supplier.swiftCode || '',
      paymentTerms: supplier.paymentTerms || 'Net 30',
      status: supplier.status || 'active',
      notes: supplier.notes || '',
      channelNames: supplier.channelNames || [],
      createdAt: supplier.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const idx = data.suppliers.findIndex((s: any) => s.id === supplierId);
    if (idx >= 0) data.suppliers[idx] = updated;
    else data.suppliers.push(updated);
    writeFallbackDb(data);
    return updated;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let supplierCode = supplier.supplierCode?.trim();
    if (!supplierCode) {
      const countRes = await client.query('SELECT COUNT(*) FROM suppliers');
      const seq = Number(countRes.rows[0].count) + 1;
      supplierCode = `SUP-${String(seq).padStart(3, '0')}`;
    }

    const query = `
      INSERT INTO suppliers (
        id, supplier_code, name, type, business_address, contact_person,
        phone, email, tax_number, bank_name, branch, account_name,
        account_number, swift_code, payment_terms, status, notes, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        business_address = EXCLUDED.business_address,
        contact_person = EXCLUDED.contact_person,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        tax_number = EXCLUDED.tax_number,
        bank_name = EXCLUDED.bank_name,
        branch = EXCLUDED.branch,
        account_name = EXCLUDED.account_name,
        account_number = EXCLUDED.account_number,
        swift_code = EXCLUDED.swift_code,
        payment_terms = EXCLUDED.payment_terms,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      supplierId,
      supplierCode,
      supplier.name || 'Unnamed Supplier',
      supplier.type || 'tv',
      supplier.businessAddress || '',
      supplier.contactPerson || '',
      supplier.phone || '',
      supplier.email || '',
      supplier.taxNumber || '',
      supplier.bankName || '',
      supplier.branch || '',
      supplier.accountName || '',
      supplier.accountNumber || '',
      supplier.swiftCode || '',
      supplier.paymentTerms || 'Net 30',
      supplier.status || 'active',
      supplier.notes || '',
    ];

    const res = await client.query(query, values);

    // Update linked broadcast channels
    await client.query('DELETE FROM supplier_channels WHERE supplier_id = $1', [supplierId]);
    if (supplier.channelNames && supplier.channelNames.length > 0) {
      for (const ch of supplier.channelNames) {
        if (ch && ch.trim()) {
          await client.query(
            'INSERT INTO supplier_channels (supplier_id, channel_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [supplierId, ch.trim()]
          );
        }
      }
    }

    await client.query('COMMIT');
    const r = res.rows[0];
    return {
      id: r.id,
      supplierCode: r.supplier_code,
      name: r.name,
      type: r.type as SupplierType,
      businessAddress: r.business_address || '',
      contactPerson: r.contact_person || '',
      phone: r.phone || '',
      email: r.email || '',
      taxNumber: r.tax_number || '',
      bankName: r.bank_name || '',
      branch: r.branch || '',
      accountName: r.account_name || '',
      accountNumber: r.account_number || '',
      swiftCode: r.swift_code || '',
      paymentTerms: r.payment_terms || 'Net 30',
      status: r.status as SupplierStatus,
      notes: r.notes || '',
      channelNames: supplier.channelNames || [],
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving supplier:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteSupplier(id: string): Promise<boolean> {
  await initializeDatabase();
  const pool = getDbPool();
  if (!pool) {
    const data = readFallbackDb();
    if (!data.suppliers) return false;
    data.suppliers = data.suppliers.filter((s: any) => s.id !== id);
    writeFallbackDb(data);
    return true;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const payCheck = await client.query('SELECT COUNT(*) FROM supplier_payables WHERE supplier_id = $1', [id]);
    const payCount = Number(payCheck.rows[0]?.count) || 0;
    if (payCount > 0) {
      throw new Error(`Cannot delete supplier: There are ${payCount} payable bill(s) associated with this supplier. Remove or reassign them first.`);
    }
    await client.query('DELETE FROM supplier_channels WHERE supplier_id = $1', [id]);
    const res = await client.query('DELETE FROM suppliers WHERE id = $1', [id]);
    await client.query('COMMIT');
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting supplier:', err);
    throw err;
  } finally {
    client.release();
  }
}

// ==========================================
// SUPPLIER PAYABLES & TRANSACTIONS SERVICE
// ==========================================

export async function getAllSupplierPayables(filters?: {
  billingEntityId?: string;
  supplierId?: string;
  scheduleId?: string;
  status?: string;
}): Promise<SupplierPayable[]> {
  await initializeDatabase();
  const pool = getDbPool();
  if (!pool) {
    const data = readFallbackDb();
    return data.supplierPayables || [];
  }

  try {
    let whereClauses: string[] = [];
    let queryParams: any[] = [];
    let paramIdx = 1;

    if (filters?.billingEntityId && filters.billingEntityId !== 'all') {
      whereClauses.push(`p.billing_entity_id = $${paramIdx++}`);
      queryParams.push(filters.billingEntityId);
    }
    if (filters?.supplierId && filters.supplierId !== 'all') {
      whereClauses.push(`p.supplier_id = $${paramIdx++}`);
      queryParams.push(filters.supplierId);
    }
    if (filters?.scheduleId) {
      whereClauses.push(`p.schedule_id = $${paramIdx++}`);
      queryParams.push(filters.scheduleId);
    }
    if (filters?.status && filters.status !== 'all') {
      whereClauses.push(`p.status = $${paramIdx++}`);
      queryParams.push(filters.status);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        p.*,
        s.name as supplier_name,
        s.supplier_code as supplier_code,
        s.type as supplier_type,
        s.phone as supplier_phone,
        s.email as supplier_email,
        s.bank_name as supplier_bank_name,
        s.account_number as supplier_account_number,
        be.name as billing_entity_name,
        be.name as billing_entity_display_name,
        cl.company_name as client_name,
        cl.company_name as client_company_name,
        ms.schedule_number as linked_schedule_number
      FROM supplier_payables p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN billing_entities be ON p.billing_entity_id = be.id
      LEFT JOIN clients cl ON p.client_id = cl.id
      LEFT JOIN media_schedules ms ON p.schedule_id = ms.id
      ${whereStr}
      ORDER BY p.bill_date DESC, p.created_at DESC
    `;

    const res = await pool.query(query, queryParams);
    const payables = res.rows;

    const payableIds = payables.map((p) => p.id);
    let paymentsByPayable: Record<string, SupplierPaymentTransaction[]> = {};

    if (payableIds.length > 0) {
      const pmtsRes = await pool.query(`
        SELECT * FROM supplier_payment_transactions 
        WHERE payable_id = ANY($1)
        ORDER BY payment_date ASC, created_at ASC
      `, [payableIds]);

      pmtsRes.rows.forEach((r) => {
        if (!paymentsByPayable[r.payable_id]) paymentsByPayable[r.payable_id] = [];
        paymentsByPayable[r.payable_id].push({
          id: r.id,
          payableId: r.payable_id,
          paymentReference: r.payment_reference,
          paymentDate: formatDbDate(r.payment_date),
          amount: Number(r.amount) || 0,
          paymentMethod: r.payment_method as SupplierPaymentMethod,
          referenceNumber: r.reference_number || '',
          chequeId: r.cheque_id || undefined,
          bankAccountInfo: r.bank_account_info || '',
          receiptUrl: r.receipt_url || '',
          notes: r.notes || '',
          status: r.status as SupplierTransactionStatus,
          recordedBy: r.recorded_by || '',
          voidReason: r.void_reason || '',
          voidedAt: r.voided_at ? new Date(r.voided_at).toISOString() : undefined,
          voidedBy: r.voided_by || undefined,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
        });
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    return payables.map((r) => {
      const totalAmount = Number(r.total_amount) || 0;
      const totalPaid = Number(r.total_paid) || 0;
      const outstandingAmount = Number(r.outstanding_amount) || 0;
      const dueDateStr = formatDbDate(r.due_date);
      const isOverdue = outstandingAmount > 0 && Boolean(dueDateStr && dueDateStr < todayStr);

      const supplierObj = r.supplier_name ? {
        id: r.supplier_id,
        supplierCode: r.supplier_code || '',
        code: r.supplier_code || '',
        name: r.supplier_name,
        type: (r.supplier_type || 'tv') as SupplierType,
        phone: r.supplier_phone || '',
        email: r.supplier_email || '',
        bankName: r.supplier_bank_name || '',
        defaultBank: r.supplier_bank_name || '',
        accountNumber: r.supplier_account_number || '',
        defaultAccountNo: r.supplier_account_number || '',
        status: 'active' as SupplierStatus,
        createdAt: '',
        updatedAt: '',
      } : undefined;

      const pmtList = paymentsByPayable[r.id] || [];

      return {
        id: r.id,
        payableReference: r.payable_reference,
        payableNumber: r.payable_reference,
        billingEntityId: r.billing_entity_id,
        supplierId: r.supplier_id,
        scheduleId: r.schedule_id || undefined,
        mediaScheduleId: r.schedule_id || undefined,
        clientId: r.client_id || undefined,
        broadcastChannel: r.broadcast_channel || '',
        channelName: r.broadcast_channel || '',
        campaignName: r.campaign_name || '',
        supplierBillNumber: r.supplier_bill_number || '',
        supplierInvoiceNumber: r.supplier_bill_number || '',
        billDate: formatDbDate(r.bill_date),
        dueDate: dueDateStr,
        description: r.description || '',
        subtotal: Number(r.subtotal) || 0,
        discount: Number(r.discount) || 0,
        taxApplicable: Boolean(r.tax_applicable),
        taxRate: Number(r.tax_rate) || 0,
        taxAmount: Number(r.tax_amount) || 0,
        totalAmount,
        totalPaid,
        outstandingAmount,
        status: r.status as SupplierPaymentStatus,
        notes: r.notes || '',
        attachmentUrl: r.attachment_url || '',
        createdBy: r.created_by || '',
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
        supplier: supplierObj,
        supplierSnapshot: supplierObj,
        scheduleNumber: r.linked_schedule_number || undefined,
        clientName: r.client_name || r.client_company_name || undefined,
        billingEntityName: r.billing_entity_display_name || r.billing_entity_name || undefined,
        payments: pmtList,
        transactions: pmtList,
        isOverdue,
      };
    });
  } catch (err) {
    console.error('Error fetching supplier payables:', err);
    return [];
  }
}

export async function getSupplierPayableById(id: string): Promise<SupplierPayable | null> {
  const payables = await getAllSupplierPayables();
  return payables.find((p) => p.id === id) || null;
}

export async function saveSupplierPayable(payable: Partial<SupplierPayable>): Promise<SupplierPayable> {
  await initializeDatabase();
  const pool = getDbPool();
  const payableId = (payable.id && String(payable.id).trim()) || crypto.randomUUID();

  const subtotal = Math.max(0, Number(payable.subtotal) || 0);
  const discount = Math.max(0, Number(payable.discount) || 0);
  const taxableBase = Math.max(0, subtotal - discount);
  const taxApplicable = Boolean(payable.taxApplicable);
  const taxRate = taxApplicable ? (Number(payable.taxRate) || 18) : 0;
  const taxAmount = taxApplicable ? Math.round(taxableBase * (taxRate / 100)) : 0;
  const totalAmount = taxableBase + taxAmount;

  if (!pool) {
    const data = readFallbackDb();
    if (!data.supplierPayables) data.supplierPayables = [];
    const totalPaid = Number(payable.totalPaid) || 0;
    const outstandingAmount = Math.max(0, totalAmount - totalPaid);
    let status: SupplierPaymentStatus = 'unpaid';
    if (totalPaid >= totalAmount && totalAmount > 0) status = 'fully_paid';
    else if (totalPaid > 0) status = 'partially_paid';

    const ref = payable.payableReference || payable.payableNumber || `PAY-SN-${new Date().getFullYear()}-${String(data.supplierPayables.length + 1).padStart(4, '0')}`;
    const updated: SupplierPayable = {
      id: payableId,
      payableReference: ref,
      payableNumber: ref,
      billingEntityId: payable.billingEntityId || '',
      supplierId: payable.supplierId || '',
      scheduleId: payable.scheduleId || undefined,
      clientId: payable.clientId || undefined,
      broadcastChannel: payable.broadcastChannel || '',
      campaignName: payable.campaignName || '',
      supplierBillNumber: payable.supplierBillNumber || '',
      billDate: payable.billDate || new Date().toISOString().split('T')[0],
      dueDate: payable.dueDate || new Date().toISOString().split('T')[0],
      description: payable.description || '',
      subtotal,
      discount,
      taxApplicable,
      taxRate,
      taxAmount,
      totalAmount,
      totalPaid,
      outstandingAmount,
      status: payable.status || status,
      notes: payable.notes || '',
      attachmentUrl: payable.attachmentUrl || '',
      createdBy: payable.createdBy || '',
      createdAt: payable.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const idx = data.supplierPayables.findIndex((p: any) => p.id === payableId);
    if (idx >= 0) data.supplierPayables[idx] = updated;
    else data.supplierPayables.push(updated);
    writeFallbackDb(data);
    return updated;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let payableReference = (payable.payableReference || payable.payableNumber)?.trim();
    if (!payableReference) {
      const year = new Date().getFullYear();
      let entityPrefix = 'SN';
      if (payable.billingEntityId) {
        const entRes = await client.query('SELECT invoice_prefix FROM billing_entities WHERE id = $1', [payable.billingEntityId]);
        if (entRes.rows.length > 0 && entRes.rows[0].invoice_prefix) {
          entityPrefix = entRes.rows[0].invoice_prefix;
        }
      }
      const pattern = `PAY-${entityPrefix}-${year}-%`;
      const maxRes = await client.query('SELECT payable_reference FROM supplier_payables WHERE payable_reference LIKE $1', [pattern]);
      const numbers = maxRes.rows.map((r: any) => {
        const m = r.payable_reference.match(new RegExp(`^PAY-${entityPrefix}-${year}-(\\d+)$`, 'i'));
        return m ? parseInt(m[1], 10) : 0;
      }).filter((n: number) => !isNaN(n) && n > 0);
      const maxSeq = numbers.length > 0 ? Math.max(...numbers) : 0;
      payableReference = `PAY-${entityPrefix}-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
    }

    const pmtRes = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as paid_sum 
      FROM supplier_payment_transactions 
      WHERE payable_id = $1 AND status = 'posted'
    `, [payableId]);

    const totalPaid = Number(pmtRes.rows[0]?.paid_sum) || Number(payable.totalPaid) || 0;
    const outstandingAmount = Math.max(0, totalAmount - totalPaid);
    let status: SupplierPaymentStatus = payable.status || 'unpaid';
    if (status !== 'void') {
      if (totalPaid >= totalAmount && totalAmount > 0) {
        status = 'fully_paid';
      } else if (totalPaid > 0) {
        status = 'partially_paid';
      } else {
        status = 'unpaid';
      }
    }

    const query = `
      INSERT INTO supplier_payables (
        id, payable_reference, billing_entity_id, supplier_id, schedule_id,
        client_id, broadcast_channel, campaign_name, supplier_bill_number,
        bill_date, due_date, description, subtotal, discount, tax_applicable,
        tax_rate, tax_amount, total_amount, total_paid, outstanding_amount,
        status, notes, attachment_url, created_by, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        billing_entity_id = EXCLUDED.billing_entity_id,
        supplier_id = EXCLUDED.supplier_id,
        schedule_id = EXCLUDED.schedule_id,
        client_id = EXCLUDED.client_id,
        broadcast_channel = EXCLUDED.broadcast_channel,
        campaign_name = EXCLUDED.campaign_name,
        supplier_bill_number = EXCLUDED.supplier_bill_number,
        bill_date = EXCLUDED.bill_date,
        due_date = EXCLUDED.due_date,
        description = EXCLUDED.description,
        subtotal = EXCLUDED.subtotal,
        discount = EXCLUDED.discount,
        tax_applicable = EXCLUDED.tax_applicable,
        tax_rate = EXCLUDED.tax_rate,
        tax_amount = EXCLUDED.tax_amount,
        total_amount = EXCLUDED.total_amount,
        total_paid = EXCLUDED.total_paid,
        outstanding_amount = EXCLUDED.outstanding_amount,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        attachment_url = EXCLUDED.attachment_url,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      payableId,
      payableReference,
      payable.billingEntityId,
      payable.supplierId,
      payable.scheduleId || payable.mediaScheduleId || null,
      payable.clientId || null,
      payable.broadcastChannel || payable.channelName || '',
      payable.campaignName || '',
      payable.supplierBillNumber || payable.supplierInvoiceNumber || '',
      payable.billDate || new Date().toISOString().split('T')[0],
      payable.dueDate || new Date().toISOString().split('T')[0],
      payable.description || '',
      subtotal,
      discount,
      taxApplicable,
      taxRate,
      taxAmount,
      totalAmount,
      totalPaid,
      outstandingAmount,
      status,
      payable.notes || '',
      payable.attachmentUrl || '',
      payable.createdBy || '',
    ];

    await client.query(query, values);
    await client.query('COMMIT');

    const full = await getSupplierPayableById(payableId);
    return full!;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving supplier payable:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteSupplierPayable(id: string): Promise<boolean> {
  await initializeDatabase();
  const pool = getDbPool();
  if (!pool) {
    const data = readFallbackDb();
    if (!data.supplierPayables) return false;
    data.supplierPayables = data.supplierPayables.filter((p: any) => p.id !== id);
    writeFallbackDb(data);
    return true;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pmtCheck = await client.query(
      "SELECT COUNT(*) FROM supplier_payment_transactions WHERE payable_id = $1 AND status = 'posted'",
      [id]
    );
    const pmtCount = Number(pmtCheck.rows[0]?.count) || 0;
    if (pmtCount > 0) {
      throw new Error(`Cannot delete supplier payable: There are ${pmtCount} posted payment transaction(s) recorded against this bill. Please void all payments first.`);
    }

    await client.query('DELETE FROM supplier_payment_transactions WHERE payable_id = $1', [id]);
    const res = await client.query('DELETE FROM supplier_payables WHERE id = $1', [id]);
    await client.query('COMMIT');
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting supplier payable:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function recordSupplierPayment(paymentData: {
  payableId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: SupplierPaymentMethod;
  referenceNumber?: string;
  chequeId?: string;
  bankAccountInfo?: string;
  receiptUrl?: string;
  notes?: string;
  recordedBy?: string;
}): Promise<SupplierPaymentTransaction> {
  await initializeDatabase();
  const pool = getDbPool();
  const amount = Number(paymentData.amount);

  if (!amount || amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  if (!pool) {
    throw new Error('PostgreSQL database required to record financial transactions.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const payRes = await client.query(`
      SELECT * FROM supplier_payables WHERE id = $1 FOR UPDATE
    `, [paymentData.payableId]);

    if (payRes.rows.length === 0) {
      throw new Error('Supplier payable not found.');
    }

    const payable = payRes.rows[0];
    const totalAmount = Number(payable.total_amount) || 0;
    const currentPaid = Number(payable.total_paid) || 0;
    const outstanding = Math.max(0, totalAmount - currentPaid);

    if (amount > outstanding) {
      throw new Error(`Payment amount (Rs. ${amount.toLocaleString()}) exceeds outstanding balance of Rs. ${outstanding.toLocaleString()}.`);
    }

    const txId = crypto.randomUUID();
    const year = new Date().getFullYear();
    const countRes = await client.query('SELECT COUNT(*) FROM supplier_payment_transactions');
    const seq = Number(countRes.rows[0].count) + 1;
    const paymentRef = `SPAY-${year}-${String(seq).padStart(4, '0')}`;

    const insQuery = `
      INSERT INTO supplier_payment_transactions (
        id, payable_id, payment_reference, payment_date, amount, payment_method,
        reference_number, cheque_id, bank_account_info, receipt_url, notes,
        status, recorded_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'posted', $12, NOW(), NOW()
      ) RETURNING *;
    `;

    const insValues = [
      txId,
      paymentData.payableId,
      paymentRef,
      paymentData.paymentDate || new Date().toISOString().split('T')[0],
      amount,
      paymentData.paymentMethod || 'bank_transfer',
      paymentData.referenceNumber || '',
      paymentData.chequeId || null,
      paymentData.bankAccountInfo || '',
      paymentData.receiptUrl || '',
      paymentData.notes || '',
      paymentData.recordedBy || 'Admin',
    ];

    const insRes = await client.query(insQuery, insValues);

    const newPaid = currentPaid + amount;
    const newOutstanding = Math.max(0, totalAmount - newPaid);
    const newStatus: SupplierPaymentStatus = newPaid >= totalAmount ? 'fully_paid' : 'partially_paid';

    await client.query(`
      UPDATE supplier_payables 
      SET total_paid = $1, outstanding_amount = $2, status = $3, updated_at = NOW()
      WHERE id = $4
    `, [newPaid, newOutstanding, newStatus, paymentData.payableId]);

    await client.query('COMMIT');
    const r = insRes.rows[0];
    return {
      id: r.id,
      payableId: r.payable_id,
      paymentReference: r.payment_reference,
      paymentDate: formatDbDate(r.payment_date),
      amount: Number(r.amount) || 0,
      paymentMethod: r.payment_method as SupplierPaymentMethod,
      referenceNumber: r.reference_number || '',
      chequeId: r.cheque_id || undefined,
      bankAccountInfo: r.bank_account_info || '',
      receiptUrl: r.receipt_url || '',
      notes: r.notes || '',
      status: r.status as SupplierTransactionStatus,
      recordedBy: r.recorded_by || '',
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording supplier payment:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function voidSupplierPayment(
  transactionId: string,
  voidReason?: string,
  voidedBy?: string
): Promise<boolean> {
  await initializeDatabase();
  const pool = getDbPool();
  if (!pool) return false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const txRes = await client.query(`
      SELECT * FROM supplier_payment_transactions WHERE id = $1 FOR UPDATE
    `, [transactionId]);

    if (txRes.rows.length === 0) {
      throw new Error('Payment transaction not found.');
    }

    const tx = txRes.rows[0];
    if (tx.status === 'void') {
      await client.query('COMMIT');
      return true;
    }

    await client.query(`
      UPDATE supplier_payment_transactions
      SET status = 'void', void_reason = $1, voided_by = $2, voided_at = NOW(), updated_at = NOW()
      WHERE id = $3
    `, [voidReason || 'Voided by user', voidedBy || 'Admin', transactionId]);

    const pmtSumRes = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as paid_sum 
      FROM supplier_payment_transactions 
      WHERE payable_id = $1 AND status = 'posted'
    `, [tx.payable_id]);

    const activePaid = Number(pmtSumRes.rows[0]?.paid_sum) || 0;

    const payRes = await client.query(`
      SELECT total_amount FROM supplier_payables WHERE id = $1
    `, [tx.payable_id]);

    const totalAmount = Number(payRes.rows[0]?.total_amount) || 0;
    const newOutstanding = Math.max(0, totalAmount - activePaid);
    const newStatus: SupplierPaymentStatus = activePaid >= totalAmount && totalAmount > 0 ? 'fully_paid' : activePaid > 0 ? 'partially_paid' : 'unpaid';

    await client.query(`
      UPDATE supplier_payables 
      SET total_paid = $1, outstanding_amount = $2, status = $3, updated_at = NOW()
      WHERE id = $4
    `, [activePaid, newOutstanding, newStatus, tx.payable_id]);

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error voiding supplier payment:', err);
    throw err;
  } finally {
    client.release();
  }
}

