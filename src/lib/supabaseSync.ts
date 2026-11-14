import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Invoice, Client, BillingEntity, Service, Cheque } from '@/types';

/**
 * Maps application Invoice model to Supabase PostgreSQL table row
 */
export function mapInvoiceToDbRow(invoice: Invoice) {
  return {
    id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    client_id: invoice.clientId,
    billing_entity_id: invoice.billingEntityId,
    template_id: invoice.templateId || null,
    status: invoice.status,
    invoice_date: invoice.invoiceDate,
    due_date: invoice.dueDate || null,
    issued_at: invoice.issuedAt || null,
    sent_at: invoice.sentAt || null,
    paid_at: invoice.paidAt || null,
    service_period_start: invoice.servicePeriodStart || null,
    service_period_end: invoice.servicePeriodEnd || null,
    service_period_text: invoice.servicePeriodText || null,
    product: invoice.product || null,
    reg_no: invoice.regNo || null,
    your_ref: invoice.yourRef || null,
    subtotal: Number(invoice.subtotal) || 0,
    vat_applicable: Boolean(invoice.vatApplicable),
    vat_rate: Number(invoice.vatRate) || 18,
    vat_amount: Number(invoice.vatAmount) || 0,
    grand_total: Number(invoice.grandTotal) || 0,
    advance_percentage: Number(invoice.advancePercentage) || 0,
    advance_amount: Number(invoice.advanceAmount) || 0,
    special_notes: invoice.specialNotes || null,
    payment_instructions: invoice.paymentInstructions || null,
    sent_status: invoice.sentStatus || 'not_sent',
    payment_status: invoice.paymentStatus || 'unpaid',
    total_paid: Number(invoice.totalPaid) || 0,
    outstanding_balance: Number(invoice.outstandingBalance) || 0,
    client_snapshot: invoice.clientSnapshot || {},
    billing_snapshot: invoice.billingSnapshot || {},
    verification_token: invoice.verificationToken || null,
    verification_status: invoice.verificationStatus || 'valid',
    canonical_hash: invoice.canonicalHash || null,
    approval_snapshot: invoice.approval || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Maps Supabase PostgreSQL row to application Invoice model
 */
export function mapDbRowToInvoice(row: any, items: any[] = []): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientId: row.client_id,
    billingEntityId: row.billing_entity_id,
    templateId: row.template_id,
    templateKey: row.template_key || 'standard',
    status: row.status,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    issuedAt: row.issued_at,
    sentAt: row.sent_at,
    paidAt: row.paid_at,
    servicePeriodStart: row.service_period_start,
    servicePeriodEnd: row.service_period_end,
    servicePeriodText: row.service_period_text,
    product: row.product,
    regNo: row.reg_no,
    yourRef: row.your_ref,
    subtotal: Number(row.subtotal) || 0,
    vatApplicable: Boolean(row.vat_applicable),
    vatRate: Number(row.vat_rate) || 18,
    vatAmount: Number(row.vat_amount) || 0,
    grandTotal: Number(row.grand_total) || 0,
    advancePercentage: Number(row.advance_percentage) || 0,
    advanceAmount: Number(row.advance_amount) || 0,
    specialNotes: row.special_notes,
    paymentInstructions: row.payment_instructions,
    sentStatus: row.sent_status || 'not_sent',
    paymentStatus: row.payment_status || 'unpaid',
    totalPaid: Number(row.total_paid) || 0,
    outstandingBalance: Number(row.outstanding_balance) || 0,
    clientSnapshot: row.client_snapshot || {},
    billingSnapshot: row.billing_snapshot || {},
    verificationToken: row.verification_token,
    verificationStatus: row.verification_status || 'valid',
    canonicalHash: row.canonical_hash,
    approval: row.approval_snapshot,
    payments: row.payments || [],
    shareHistory: row.share_history || [],
    items: items.map((it, idx) => ({
      id: it.id || `item-${idx}`,
      serviceId: it.service_id,
      serviceName: it.service_name || '',
      description: it.description || '',
      servicePeriod: it.service_period,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unit_price) || 0,
      lineTotal: Number(it.line_total) || 0,
      sortOrder: it.sort_order ?? idx,
      mediaChannel: it.media_channel,
      referenceType: it.reference_type,
      referenceNumber: it.reference_number,
    })),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Saves or updates an invoice in Supabase PostgreSQL
 */
export async function saveInvoiceToSupabase(invoice: Invoice): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const row = mapInvoiceToDbRow(invoice);

    const { error: invoiceError } = await supabase
      .from('invoices')
      .upsert(row, { onConflict: 'id' });

    if (invoiceError) {
      console.error('Supabase invoice upsert error:', invoiceError);
      return { success: false, error: invoiceError.message };
    }

    // Save line items
    if (invoice.items && invoice.items.length > 0) {
      // Clear old items for this invoice
      await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id);

      const itemsToInsert = invoice.items.map((it, idx) => ({
        id: it.id || `item-${invoice.id}-${idx}`,
        invoice_id: invoice.id,
        service_id: it.serviceId || null,
        service_name: it.serviceName,
        description: it.description || '',
        service_period: it.servicePeriod || null,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unitPrice) || 0,
        line_total: Number(it.lineTotal) || 0,
        sort_order: it.sortOrder ?? idx,
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
      if (itemsError) {
        console.warn('Supabase invoice_items insert notice:', itemsError.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('saveInvoiceToSupabase failed:', err);
    return { success: false, error: err?.message || 'Unknown network error' };
  }
}

/**
 * Fetches all invoices from Supabase PostgreSQL
 */
export async function fetchInvoicesFromSupabase(): Promise<Invoice[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data: invoicesData, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (invError || !invoicesData) {
      console.warn('Supabase fetch invoices notice:', invError?.message);
      return null;
    }

    const { data: itemsData } = await supabase.from('invoice_items').select('*');
    const itemsByInvoiceId: Record<string, any[]> = {};

    if (itemsData) {
      for (const item of itemsData) {
        if (!itemsByInvoiceId[item.invoice_id]) {
          itemsByInvoiceId[item.invoice_id] = [];
        }
        itemsByInvoiceId[item.invoice_id].push(item);
      }
    }

    return invoicesData.map(row => mapDbRowToInvoice(row, itemsByInvoiceId[row.id] || []));
  } catch (err) {
    console.warn('fetchInvoicesFromSupabase exception:', err);
    return null;
  }
}

/**
 * Saves a client to Supabase
 */
export async function saveClientToSupabase(client: Client): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('clients').upsert({
      id: client.id,
      name: client.name,
      code: client.code,
      address: client.address,
      contact_person: client.contactPerson || null,
      mobile: client.mobile || null,
      whatsapp: client.whatsapp || null,
      email: client.email || null,
      vat_number: client.vatNumber || null,
      brn: client.brn || null,
      default_vat_preference: Boolean(client.defaultVatPreference),
      default_billing_entity_id: client.defaultBillingEntityId || null,
      default_payment_terms: client.defaultPaymentTerms || 'Immediate',
      default_advance_percentage: client.defaultAdvancePercentage || 0,
      default_note: client.defaultNote || null,
      internal_notes: client.internalNotes || null,
      is_active: client.isActive !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    return !error;
  } catch (err) {
    console.warn('saveClientToSupabase exception:', err);
    return false;
  }
}

/**
 * Saves a billing entity to Supabase
 */
export async function saveBillingEntityToSupabase(entity: BillingEntity): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('billing_entities').upsert({
      id: entity.id,
      name: entity.name,
      display_name: entity.displayName || entity.name,
      address: entity.address,
      phone: entity.phone || null,
      secondary_phone: entity.secondaryPhone || null,
      email: entity.email || null,
      website: entity.website || null,
      bank_name: entity.bankName || null,
      branch: entity.branch || null,
      account_name: entity.accountName || null,
      account_number: entity.accountNumber || null,
      cheque_payee: entity.chequePayee || entity.name,
      vat_number: entity.vatNumber || null,
      is_vat_registered: Boolean(entity.isVatRegistered),
      payment_instructions: entity.paymentInstructions || null,
      prefix: entity.prefix || 'SN',
      logo_url: entity.logoUrl || null,
      signature_url: entity.signatureUrl || null,
      signatory_name: entity.signatoryName || null,
      signatory_designation: entity.signatoryDesignation || null,
      signatory_email: entity.signatoryEmail || null,
      signature_enabled: entity.signatureEnabled !== false,
      display_signature_image: Boolean(entity.displaySignatureImage),
      verification_enabled: entity.verificationEnabled !== false,
      show_qr_code: entity.showQrCode !== false,
      footer_text: entity.footerText || null,
      status: entity.status || 'active',
      is_active: entity.isActive !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    return !error;
  } catch (err) {
    console.warn('saveBillingEntityToSupabase exception:', err);
    return false;
  }
}

/**
 * Saves a cheque to Supabase
 */
export async function saveChequeToSupabase(cheque: Cheque): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('cheques').upsert({
      id: cheque.id,
      type: cheque.type,
      cheque_number: cheque.chequeNumber,
      amount: cheque.amount,
      currency: cheque.currency || 'LKR',
      cheque_date: cheque.chequeDate,
      received_or_issued_date: cheque.receivedOrIssuedDate,
      expected_action_date: cheque.expectedActionDate,
      actual_clearance_date: cheque.actualClearanceDate || null,
      drawer_bank: cheque.drawerBank,
      branch: cheque.branch || null,
      bank_account_number: cheque.bankAccountNumber || null,
      payer_or_payee_name: cheque.payerOrPayeeName,
      client_id: cheque.clientId || null,
      billing_entity_id: cheque.billingEntityId,
      status: cheque.status,
      alert_state: cheque.alertState || 'normal',
      purpose_of_payment: cheque.purposeOfPayment || null,
      bill_reference: cheque.billReference || null,
      notes: cheque.notes || null,
      follow_up_date: cheque.followUpDate || null,
      return_reason: cheque.returnReason || null,
      bank_charges: cheque.bankCharges || 0,
      replacement_cheque_ref: cheque.replacementChequeRef || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    return !error;
  } catch (err) {
    console.warn('saveChequeToSupabase exception:', err);
    return false;
  }
}
