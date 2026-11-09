import { 
  BillingEntity, 
  Client, 
  Service, 
  InvoiceTemplate, 
  Invoice, 
  Payment, 
  InvoiceShareRecord, 
  BrandingSettings,
  MonthlyHistoryFilter,
  DashboardKPIs,
  InvoiceTemplateKey
} from '@/types';

// Default Seed Data based on official SN Advertising documents and Excel files
export const INITIAL_BILLING_ENTITIES: BillingEntity[] = [
  {
    id: 'e1111111-1111-1111-1111-111111111111',
    name: 'SN Advertising',
    address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
    phone: '+94 11 772 8282 / +94 77 400 0004 / +94 77 462 6262',
    email: 'snadvertising@hotmail.com',
    bankName: 'Seylan Bank',
    branch: 'Kadawatha Branch',
    accountName: 'SN Advertising',
    accountNumber: '028013149867001',
    chequePayee: 'SN ADVERTISING',
    vatNumber: undefined,
    paymentInstructions: 'Cheques should be drawn in favour of SN ADVERTISING. and crossed "ACCOUNT PAYEE" only. Bank transfers may be made to SN Advertising, Account No. 028013149867001, Seylan Bank – Kadawatha Branch.',
    prefix: 'SN',
    signatureUrl: '/signature-sample.png',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'e2222222-2222-2222-2222-222222222222',
    name: 'HARIPARA (PVT) LTD',
    address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
    phone: '+94 11 772 8282 / +94 77 400 0004',
    email: 'snadvertising@hotmail.com',
    bankName: 'Commercial Bank of Ceylon',
    branch: 'Kelaniya Branch',
    accountName: 'HARIPARA (PVT) LTD',
    accountNumber: '10002938475',
    chequePayee: 'HARIPARA(PVT)LTD',
    vatNumber: '114094498-7000',
    paymentInstructions: 'Cheques should be drawn in favour of HARIPARA(PVT)LTD. and crossed "ACCOUNT PAYEE" only.',
    prefix: 'HRP',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  }
];

export const INITIAL_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 't1111111-1111-1111-1111-111111111111',
    key: 'standard',
    name: 'Standard Advertising Invoice',
    description: 'Original SN Advertising classic letterhead and clean advertising layout',
    isActive: true,
    isDefault: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 't2222222-2222-2222-2222-222222222222',
    key: 'vat',
    name: 'VAT Invoice',
    description: 'Official VAT format displaying both issuer and client VAT registration numbers',
    isActive: true,
    isDefault: false,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 't3333333-3333-3333-3333-333333333333',
    key: 'sponsorship',
    name: 'Sponsorship Invoice',
    description: 'Designed for radio and media sponsorships with program slot details',
    isActive: true,
    isDefault: false,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 't4444444-4444-4444-4444-444444444444',
    key: 'custom',
    name: 'Custom Invoice',
    description: 'Configurable multi-service layout with flexible reference and PO fields',
    isActive: true,
    isDefault: false,
    createdAt: '2026-08-01T00:00:00Z',
  }
];

export const INITIAL_SERVICES: Service[] = [
  {
    id: 's1111111-1111-1111-1111-111111111111',
    name: 'Video Campaign with Presenter (3 Clips)',
    defaultDescription: 'Video Campaign with Presenter (3 Clips)',
    defaultPrice: 125000,
    vatApplicable: false,
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 's2222222-2222-2222-2222-222222222222',
    name: 'Sponsorship Package on Run FM',
    defaultDescription: 'SPONSER SHIP PACKEGE ON RUN FM',
    defaultPrice: 300000,
    vatApplicable: true,
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 's3333333-3333-3333-3333-333333333333',
    name: 'Sponsorship Package on Ridam FM Evening Show',
    defaultDescription: 'SPONSER SHIP PACKEGE ON RIDAM FM EVENING SHOW',
    defaultPrice: 200000,
    vatApplicable: false,
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 's4444444-4444-4444-4444-444444444444',
    name: 'Social Media Campaign',
    defaultDescription: 'Monthly digital paid campaign management across social channels',
    defaultPrice: 75000,
    vatApplicable: false,
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 's5555555-5555-5555-5555-555555555555',
    name: 'Sticker Advertising & Branding',
    defaultDescription: 'Commercial vehicle and sticker advertising production and installation',
    defaultPrice: 85000,
    vatApplicable: false,
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 's6666666-6666-6666-6666-666666666666',
    name: 'Custom Advertising Service',
    defaultDescription: 'Custom advertising and production services',
    defaultPrice: 50000,
    vatApplicable: false,
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    name: 'Araliya Lands and Homes (Pvt) Ltd',
    code: 'ARL-001',
    address: 'Kadawatha 11850',
    contactPerson: 'Mr. Rohan Gunaratne',
    mobile: '+94 77 123 4567',
    whatsapp: '+94 77 123 4567',
    email: 'info@araliyaland.lk',
    defaultVatPreference: false,
    defaultBillingEntityId: 'e1111111-1111-1111-1111-111111111111',
    defaultPaymentTerms: '7 days',
    defaultAdvancePercentage: 75,
    defaultNote: '75% Advance Payment to Proceed with Work',
    internalNotes: 'Leading property developer client. Regularly orders video presenter campaigns.',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    name: 'CHAMARA MOTORS AND STICKERS CENTER',
    code: 'CHM-001',
    address: '31, Kandy Road Kirillwala, Kadawatha',
    contactPerson: 'Mr. Chamara Perera',
    mobile: '+94 77 987 6543',
    whatsapp: '+94 77 987 6543',
    email: 'chamara.motors@gmail.com',
    vatNumber: '100958996 - 7000',
    brn: 'PV-98234',
    defaultVatPreference: true,
    defaultBillingEntityId: 'e2222222-2222-2222-2222-222222222222',
    defaultPaymentTerms: 'Immediate',
    defaultAdvancePercentage: 0,
    internalNotes: 'Long-term client for Run FM and Ridam FM radio sponsorship packages.',
    isActive: true,
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-15T00:00:00Z',
  }
];

export const INITIAL_BRANDING: BrandingSettings = {
  id: 'b1111111-1111-1111-1111-111111111111',
  businessName: 'SN Advertising',
  logoUrl: '/logo.png',
  phone: '+94 11 772 8282 / +94 77 400 0004 / +94 77 462 6262',
  email: 'snadvertising@hotmail.com',
  address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
  defaultCurrency: 'LKR',
  defaultVatRate: 18.00,
  updatedAt: '2026-08-01T00:00:00Z',
};

// Initial test invoices matching Section 18 test cases and uploaded Excel files
export const INITIAL_INVOICES: Invoice[] = [
  // Test A - Araliya Lands
  {
    id: 'inv-001',
    invoiceNumber: '23458',
    clientId: 'c1111111-1111-1111-1111-111111111111',
    billingEntityId: 'e1111111-1111-1111-1111-111111111111',
    templateId: 't1111111-1111-1111-1111-111111111111',
    templateKey: 'standard',
    status: 'issued',
    invoiceDate: '2026-08-12',
    dueDate: '2026-08-19',
    issuedAt: '2026-08-12T10:00:00Z',
    sentAt: '2026-08-12T11:30:00Z',
    paidAt: '2026-08-20T14:00:00Z',
    servicePeriodText: '2026-08-12',
    regNo: '2588/CM',
    subtotal: 125000,
    vatApplicable: false,
    vatRate: 18,
    vatAmount: 0,
    grandTotal: 125000,
    advancePercentage: 75,
    advanceAmount: 93750,
    specialNotes: '(75% Advance Payment to Proceed with Work)',
    paymentInstructions: 'Cheques should be drawn in favour of SN ADVERTISING. and crossed "ACCOUNT PAYEE" only. Bank transfers may be made to SN Advertising, Account No. 028013149867001, Seylan Bank – Kadawatha Branch.',
    sentStatus: 'sent',
    paymentStatus: 'paid',
    totalPaid: 125000,
    outstandingBalance: 0,
    clientSnapshot: {
      id: 'c1111111-1111-1111-1111-111111111111',
      name: 'Araliya Lands and Homes (Pvt) Ltd',
      code: 'ARL-001',
      address: 'Kadawatha 11850',
      mobile: '+94 77 123 4567',
      email: 'info@araliyaland.lk'
    },
    billingSnapshot: {
      id: 'e1111111-1111-1111-1111-111111111111',
      name: 'SN Advertising',
      address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
      phone: '+94 11 772 8282 / +94 77 400 0004 / +94 77 462 6262',
      email: 'snadvertising@hotmail.com',
      chequePayee: 'SN ADVERTISING',
      bankName: 'Seylan Bank',
      branch: 'Kadawatha Branch',
      accountName: 'SN Advertising',
      accountNumber: '028013149867001',
      paymentInstructions: 'Cheques should be drawn in favour of SN ADVERTISING. and crossed "ACCOUNT PAYEE" only. Bank transfers may be made to SN Advertising, Account No. 028013149867001, Seylan Bank – Kadawatha Branch.'
    },
    items: [
      {
        id: 'item-001',
        invoiceId: 'inv-001',
        serviceId: 's1111111-1111-1111-1111-111111111111',
        serviceName: 'Video Campaign with Presenter (3 Clips)',
        description: 'Video Campaign with Presenter (3 Clips)',
        servicePeriod: '2026-08-12',
        quantity: 1,
        unitPrice: 125000,
        lineTotal: 125000,
        sortOrder: 0
      }
    ],
    payments: [
      {
        id: 'pay-001',
        invoiceId: 'inv-001',
        paymentDate: '2026-08-14',
        amount: 93750,
        paymentMethod: 'bank_transfer',
        transactionRef: 'SEYLAN-TRF-8812',
        notes: '75% Advance payment',
        createdAt: '2026-08-14T10:00:00Z'
      },
      {
        id: 'pay-002',
        invoiceId: 'inv-001',
        paymentDate: '2026-08-20',
        amount: 31250,
        paymentMethod: 'bank_transfer',
        transactionRef: 'SEYLAN-TRF-9104',
        notes: 'Balance completion payment',
        createdAt: '2026-08-20T14:00:00Z'
      }
    ],
    shareHistory: [
      {
        id: 'share-001',
        invoiceId: 'inv-001',
        channel: 'whatsapp',
        recipient: '+94 77 123 4567',
        deliveryStatus: 'sent',
        sharedAt: '2026-08-12T11:30:00Z',
        notes: 'Sent via WhatsApp to Rohan'
      }
    ],
    createdAt: '2026-08-12T09:30:00Z',
    updatedAt: '2026-08-20T14:00:00Z'
  },
  // Test B - Chamara Motors / Run FM
  {
    id: 'inv-002',
    invoiceNumber: '23466',
    clientId: 'c2222222-2222-2222-2222-222222222222',
    billingEntityId: 'e2222222-2222-2222-2222-222222222222',
    templateId: 't2222222-2222-2222-2222-222222222222',
    templateKey: 'vat',
    status: 'issued',
    invoiceDate: '2026-09-30',
    dueDate: '2026-10-15',
    issuedAt: '2026-09-30T11:00:00Z',
    sentAt: '2026-10-01T09:15:00Z',
    servicePeriodText: 'OCT - NOV 2026',
    regNo: '2645/RFR',
    subtotal: 300000,
    vatApplicable: true,
    vatRate: 18,
    vatAmount: 54000,
    grandTotal: 354000,
    advancePercentage: 0,
    advanceAmount: 0,
    specialNotes: undefined,
    paymentInstructions: 'Cheques should be drawn in favour of HARIPARA(PVT)LTD. and crossed "ACCOUNT PAYEE" only.',
    sentStatus: 'sent',
    paymentStatus: 'unpaid',
    totalPaid: 0,
    outstandingBalance: 354000,
    clientSnapshot: {
      id: 'c2222222-2222-2222-2222-222222222222',
      name: 'CHAMARA MOTORS AND STICKERS CENTER',
      code: 'CHM-001',
      address: '31, Kandy Road Kirillwala, Kadawatha',
      vatNumber: '100958996 - 7000',
      mobile: '+94 77 987 6543',
      email: 'chamara.motors@gmail.com'
    },
    billingSnapshot: {
      id: 'e2222222-2222-2222-2222-222222222222',
      name: 'HARIPARA (PVT) LTD',
      address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
      phone: '+94 11 772 8282 / +94 77 400 0004',
      email: 'snadvertising@hotmail.com',
      chequePayee: 'HARIPARA(PVT)LTD',
      vatNumber: '114094498-7000',
      paymentInstructions: 'Cheques should be drawn in favour of HARIPARA(PVT)LTD. and crossed "ACCOUNT PAYEE" only.'
    },
    items: [
      {
        id: 'item-002',
        invoiceId: 'inv-002',
        serviceId: 's2222222-2222-2222-2222-222222222222',
        serviceName: 'Sponsorship Package on Run FM',
        description: 'SPONSER SHIP PACKEGE ON RUN FM',
        servicePeriod: 'OCT - NOV 2026',
        quantity: 1,
        unitPrice: 300000,
        lineTotal: 300000,
        sortOrder: 0
      }
    ],
    payments: [],
    shareHistory: [
      {
        id: 'share-002',
        invoiceId: 'inv-002',
        channel: 'email',
        recipient: 'chamara.motors@gmail.com',
        deliveryStatus: 'sent',
        sharedAt: '2026-10-01T09:15:00Z',
        notes: 'Monthly sponsorship invoice emailed with PDF attached'
      }
    ],
    createdAt: '2026-09-30T10:45:00Z',
    updatedAt: '2026-10-01T09:15:00Z'
  },
  // Test C - Chamara Motors / Ridam FM
  {
    id: 'inv-003',
    invoiceNumber: '23465',
    clientId: 'c2222222-2222-2222-2222-222222222222',
    billingEntityId: 'e2222222-2222-2222-2222-222222222222',
    templateId: 't3333333-3333-3333-3333-333333333333',
    templateKey: 'sponsorship',
    status: 'issued',
    invoiceDate: '2026-09-30',
    dueDate: '2026-10-15',
    issuedAt: '2026-09-30T11:30:00Z',
    sentAt: '2026-10-01T09:20:00Z',
    servicePeriodText: 'OCT - NOV 2026',
    regNo: '4415/RFM',
    subtotal: 200000,
    vatApplicable: false,
    vatRate: 18,
    vatAmount: 0,
    grandTotal: 200000,
    advancePercentage: 0,
    advanceAmount: 0,
    paymentInstructions: 'Cheques should be drawn in favour of HARIPARA(PVT)LTD. and crossed "ACCOUNT PAYEE" only.',
    sentStatus: 'sent',
    paymentStatus: 'unpaid',
    totalPaid: 0,
    outstandingBalance: 200000,
    clientSnapshot: {
      id: 'c2222222-2222-2222-2222-222222222222',
      name: 'CHAMARA MOTORS AND STICKERS CENTER',
      code: 'CHM-001',
      address: '31, Kandy Road Kirillwala, Kadawatha',
      vatNumber: '100958996 - 7000',
      mobile: '+94 77 987 6543',
      email: 'chamara.motors@gmail.com'
    },
    billingSnapshot: {
      id: 'e2222222-2222-2222-2222-222222222222',
      name: 'HARIPARA (PVT) LTD',
      address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
      phone: '+94 11 772 8282 / +94 77 400 0004',
      email: 'snadvertising@hotmail.com',
      chequePayee: 'HARIPARA(PVT)LTD',
      vatNumber: '114094498-7000',
      paymentInstructions: 'Cheques should be drawn in favour of HARIPARA(PVT)LTD. and crossed "ACCOUNT PAYEE" only.'
    },
    items: [
      {
        id: 'item-003',
        invoiceId: 'inv-003',
        serviceId: 's3333333-3333-3333-3333-333333333333',
        serviceName: 'Sponsorship Package on Ridam FM Evening Show',
        description: 'SPONSER SHIP PACKEGE ON RIDAM FM EVENING SHOW',
        servicePeriod: 'OCT - NOV 2026',
        quantity: 1,
        unitPrice: 200000,
        lineTotal: 200000,
        sortOrder: 0
      }
    ],
    payments: [],
    shareHistory: [
      {
        id: 'share-003',
        invoiceId: 'inv-003',
        channel: 'email',
        recipient: 'chamara.motors@gmail.com',
        deliveryStatus: 'sent',
        sharedAt: '2026-10-01T09:20:00Z',
        notes: 'Sent via email'
      }
    ],
    createdAt: '2026-09-30T11:15:00Z',
    updatedAt: '2026-10-01T09:20:00Z'
  }
];

const STORAGE_KEYS = {
  INVOICES: 'sn_invoices_data_v2',
  CLIENTS: 'sn_clients_data_v2',
  SERVICES: 'sn_services_data_v2',
  BILLING_ENTITIES: 'sn_billing_entities_v2',
  TEMPLATES: 'sn_templates_v2',
  BRANDING: 'sn_branding_v2',
  NEXT_INVOICE_NUM: 'sn_next_invoice_number_v2',
  CURRENT_USER_ROLE: 'sn_current_user_role'
};

class StorageService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  // --- Billing Entities ---
  getBillingEntities(): BillingEntity[] {
    if (!this.isBrowser()) return INITIAL_BILLING_ENTITIES;
    const data = localStorage.getItem(STORAGE_KEYS.BILLING_ENTITIES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.BILLING_ENTITIES, JSON.stringify(INITIAL_BILLING_ENTITIES));
      return INITIAL_BILLING_ENTITIES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_BILLING_ENTITIES;
    }
  }

  saveBillingEntity(entity: Partial<BillingEntity>): BillingEntity {
    const list = this.getBillingEntities();
    let saved: BillingEntity;
    if (entity.id) {
      const idx = list.findIndex(e => e.id === entity.id);
      if (idx >= 0) {
        saved = { ...list[idx], ...entity, updatedAt: new Date().toISOString() };
        list[idx] = saved;
      } else {
        saved = {
          ...entity,
          id: entity.id || 'e-' + Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as BillingEntity;
        list.push(saved);
      }
    } else {
      saved = {
        id: 'e-' + Date.now(),
        name: entity.name || 'New Entity',
        address: entity.address || '',
        chequePayee: entity.chequePayee || entity.name || '',
        prefix: entity.prefix || 'SN',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...entity
      } as BillingEntity;
      list.push(saved);
    }
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.BILLING_ENTITIES, JSON.stringify(list));
    }
    return saved;
  }

  // --- Templates ---
  getTemplates(): InvoiceTemplate[] {
    if (!this.isBrowser()) return INITIAL_TEMPLATES;
    const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(INITIAL_TEMPLATES));
      return INITIAL_TEMPLATES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_TEMPLATES;
    }
  }

  // --- Services ---
  getServices(): Service[] {
    if (!this.isBrowser()) return INITIAL_SERVICES;
    const data = localStorage.getItem(STORAGE_KEYS.SERVICES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
      return INITIAL_SERVICES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_SERVICES;
    }
  }

  saveService(service: Partial<Service>): Service {
    const list = this.getServices();
    let saved: Service;
    if (service.id) {
      const idx = list.findIndex(s => s.id === service.id);
      if (idx >= 0) {
        saved = { ...list[idx], ...service, updatedAt: new Date().toISOString() };
        list[idx] = saved;
      } else {
        saved = {
          ...service,
          id: service.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Service;
        list.push(saved);
      }
    } else {
      saved = {
        id: 's-' + Date.now(),
        name: service.name || 'New Service',
        defaultPrice: service.defaultPrice || 0,
        vatApplicable: Boolean(service.vatApplicable),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...service
      } as Service;
      list.push(saved);
    }
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
    }
    return saved;
  }

  // --- Clients ---
  getClients(): Client[] {
    if (!this.isBrowser()) return INITIAL_CLIENTS;
    const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
      return INITIAL_CLIENTS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_CLIENTS;
    }
  }

  getClientById(id: string): Client | undefined {
    return this.getClients().find(c => c.id === id);
  }

  saveClient(client: Partial<Client>): Client {
    const list = this.getClients();
    let saved: Client;
    if (client.id) {
      const idx = list.findIndex(c => c.id === client.id);
      if (idx >= 0) {
        saved = { ...list[idx], ...client, updatedAt: new Date().toISOString() };
        list[idx] = saved;
      } else {
        saved = {
          ...client,
          id: client.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Client;
        list.push(saved);
      }
    } else {
      // Generate client code if empty e.g. SN-CLI-003 or initials
      let code = client.code?.trim();
      if (!code) {
        const words = (client.name || 'Client').split(' ').filter(Boolean);
        const prefix = words.length > 1 
          ? (words[0][0] + words[1][0]).toUpperCase()
          : (client.name?.slice(0, 3) || 'CLI').toUpperCase();
        const count = list.length + 1;
        code = `${prefix}-${String(count).padStart(3, '0')}`;
      }

      saved = {
        id: 'c-' + Date.now(),
        name: client.name || 'New Client',
        code: code,
        address: client.address || '',
        defaultVatPreference: Boolean(client.defaultVatPreference),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...client
      } as Client;
      list.push(saved);
    }
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(list));
    }
    return saved;
  }

  // --- Invoices ---
  getInvoices(): Invoice[] {
    if (!this.isBrowser()) return INITIAL_INVOICES;
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
      return INITIAL_INVOICES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_INVOICES;
    }
  }

  getInvoiceById(id: string): Invoice | undefined {
    return this.getInvoices().find(inv => inv.id === id || inv.invoiceNumber === id);
  }

  // Generate next collision-safe running invoice number
  getNextInvoiceNumber(prefix = 'SN', year = new Date().getFullYear()): string {
    if (!this.isBrowser()) return '23467';
    const lastNumStr = localStorage.getItem(STORAGE_KEYS.NEXT_INVOICE_NUM);
    let nextNum = 23467;
    if (lastNumStr) {
      nextNum = parseInt(lastNumStr, 10) || 23467;
    } else {
      // Find highest from existing invoices
      const existing = this.getInvoices();
      const numbers = existing
        .map(i => parseInt(i.invoiceNumber.replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));
      if (numbers.length > 0) {
        nextNum = Math.max(...numbers) + 1;
      }
    }
    return String(nextNum);
  }

  incrementInvoiceNumber(): void {
    if (!this.isBrowser()) return;
    const curr = parseInt(this.getNextInvoiceNumber(), 10) || 23467;
    localStorage.setItem(STORAGE_KEYS.NEXT_INVOICE_NUM, String(curr + 1));
  }

  saveInvoice(invoice: Partial<Invoice>): Invoice {
    const list = this.getInvoices();
    let saved: Invoice;

    const subtotal = invoice.subtotal || (invoice.items || []).reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    const vatRate = invoice.vatRate ?? 18;
    const vatAmount = invoice.vatApplicable ? Math.round(subtotal * (vatRate / 100) * 100) / 100 : 0;
    const grandTotal = subtotal + vatAmount;

    // Payments calculations
    const payments = invoice.payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstandingBalance = Math.max(0, grandTotal - totalPaid);

    let paymentStatus = invoice.paymentStatus || 'unpaid';
    if (invoice.status === 'void') {
      paymentStatus = 'voided';
    } else if (totalPaid >= grandTotal && grandTotal > 0) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partially_paid';
    } else {
      paymentStatus = 'unpaid';
    }

    if (invoice.id) {
      const idx = list.findIndex(i => i.id === invoice.id);
      if (idx >= 0) {
        saved = {
          ...list[idx],
          ...invoice,
          subtotal,
          vatRate,
          vatAmount,
          grandTotal,
          totalPaid,
          outstandingBalance,
          paymentStatus,
          updatedAt: new Date().toISOString()
        } as Invoice;
        list[idx] = saved;
      } else {
        saved = {
          ...invoice,
          id: invoice.id,
          subtotal,
          vatRate,
          vatAmount,
          grandTotal,
          totalPaid,
          outstandingBalance,
          paymentStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as Invoice;
        list.push(saved);
      }
    } else {
      const invoiceNumber = invoice.invoiceNumber || this.getNextInvoiceNumber();
      this.incrementInvoiceNumber();

      saved = {
        id: 'inv-' + Date.now(),
        invoiceNumber,
        status: invoice.status || 'draft',
        sentStatus: invoice.sentStatus || 'not_sent',
        paymentStatus,
        totalPaid,
        outstandingBalance,
        subtotal,
        vatRate,
        vatAmount,
        grandTotal,
        items: invoice.items || [],
        payments: payments,
        shareHistory: invoice.shareHistory || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...invoice
      } as Invoice;
      list.unshift(saved);
    }

    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(list));
    }
    return saved;
  }

  // Record a payment against an invoice
  recordPayment(invoiceId: string, paymentData: Omit<Payment, 'id' | 'invoiceId' | 'createdAt'>): Invoice {
    const invoice = this.getInvoiceById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const payment: Payment = {
      id: 'pay-' + Date.now(),
      invoiceId,
      ...paymentData,
      createdAt: new Date().toISOString()
    };

    const updatedPayments = [...(invoice.payments || []), payment];
    const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
    const outstandingBalance = Math.max(0, invoice.grandTotal - totalPaid);
    
    let paymentStatus = invoice.paymentStatus;
    if (totalPaid >= invoice.grandTotal) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partially_paid';
    }

    const updated = this.saveInvoice({
      ...invoice,
      payments: updatedPayments,
      totalPaid,
      outstandingBalance,
      paymentStatus,
      paidAt: paymentStatus === 'paid' ? new Date().toISOString() : invoice.paidAt
    });

    return updated;
  }

  // Record a share event against an invoice
  recordShare(invoiceId: string, shareData: Omit<InvoiceShareRecord, 'id' | 'invoiceId' | 'sharedAt'>): Invoice {
    const invoice = this.getInvoiceById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const record: InvoiceShareRecord = {
      id: 'share-' + Date.now(),
      invoiceId,
      ...shareData,
      sharedAt: new Date().toISOString()
    };

    const updatedHistory = [record, ...(invoice.shareHistory || [])];
    const updated = this.saveInvoice({
      ...invoice,
      shareHistory: updatedHistory,
      sentStatus: shareData.deliveryStatus === 'delivery_confirmed' ? 'delivery_confirmed' : 'sent',
      sentAt: invoice.sentAt || new Date().toISOString()
    });

    return updated;
  }

  // Duplicate an invoice
  duplicateInvoice(sourceInvoiceId: string): Invoice {
    const source = this.getInvoiceById(sourceInvoiceId);
    if (!source) throw new Error('Source invoice not found');

    const nextNumber = this.getNextInvoiceNumber();
    const today = new Date().toISOString().split('T')[0];

    const duplicated: Partial<Invoice> = {
      invoiceNumber: nextNumber,
      clientId: source.clientId,
      billingEntityId: source.billingEntityId,
      templateId: source.templateId,
      templateKey: source.templateKey,
      status: 'draft',
      invoiceDate: today,
      servicePeriodText: source.servicePeriodText,
      product: source.product,
      regNo: source.regNo,
      yourRef: source.yourRef,
      subtotal: source.subtotal,
      vatApplicable: source.vatApplicable,
      vatRate: source.vatRate,
      vatAmount: source.vatAmount,
      grandTotal: source.grandTotal,
      advancePercentage: source.advancePercentage,
      advanceAmount: source.advanceAmount,
      specialNotes: source.specialNotes,
      paymentInstructions: source.paymentInstructions,
      sentStatus: 'not_sent',
      paymentStatus: 'unpaid',
      totalPaid: 0,
      outstandingBalance: source.grandTotal,
      clientSnapshot: { ...source.clientSnapshot },
      billingSnapshot: { ...source.billingSnapshot },
      items: source.items.map((item, idx) => ({
        ...item,
        id: `item-${Date.now()}-${idx}`,
        invoiceId: undefined
      })),
      payments: [],
      shareHistory: []
    };

    return this.saveInvoice(duplicated);
  }

  // Void an issued invoice
  voidInvoice(invoiceId: string): Invoice {
    const invoice = this.getInvoiceById(invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    return this.saveInvoice({
      ...invoice,
      status: 'void',
      paymentStatus: 'voided'
    });
  }

  // --- Monthly History Query with Core Modes ---
  getFilteredInvoices(filter: MonthlyHistoryFilter): Invoice[] {
    const list = this.getInvoices();
    return list.filter(inv => {
      // 1. Client filter
      if (filter.clientId && inv.clientId !== filter.clientId) return false;

      // 2. Billing entity filter
      if (filter.billingEntityId && inv.billingEntityId !== filter.billingEntityId) return false;

      // 3. Invoice status filter
      if (filter.invoiceStatus && inv.status !== filter.invoiceStatus) return false;

      // 4. Sent status filter
      if (filter.sentStatus && inv.sentStatus !== filter.sentStatus) return false;

      // 5. Payment status filter
      if (filter.paymentStatus && inv.paymentStatus !== filter.paymentStatus) return false;

      // 6. Search query
      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase();
        const matchesNo = inv.invoiceNumber.toLowerCase().includes(q);
        const matchesClient = (inv.clientSnapshot?.name || '').toLowerCase().includes(q);
        const matchesItem = inv.items?.some(it => it.description.toLowerCase().includes(q));
        const matchesRef = (inv.regNo || '').toLowerCase().includes(q) || (inv.yourRef || '').toLowerCase().includes(q);
        if (!matchesNo && !matchesClient && !matchesItem && !matchesRef) return false;
      }

      // 7. Date filtering based on mode
      const mode = filter.dateMode || 'issued';

      let targetDateStr: string | undefined;
      if (mode === 'issued') {
        targetDateStr = inv.invoiceDate;
      } else if (mode === 'sent') {
        targetDateStr = inv.sentAt ? inv.sentAt.split('T')[0] : undefined;
        if (!targetDateStr) return false; // Not sent yet
      } else if (mode === 'service_period') {
        targetDateStr = inv.servicePeriodStart || inv.invoiceDate;
      }

      if (!targetDateStr) return true;

      const d = new Date(targetDateStr);
      if (!isNaN(d.getTime())) {
        if (filter.year && d.getFullYear() !== filter.year) return false;
        if (filter.month && (d.getMonth() + 1) !== filter.month) return false;
      }

      // Custom date range if passed
      if (filter.startDate && targetDateStr < filter.startDate) return false;
      if (filter.endDate && targetDateStr > filter.endDate) return false;

      return true;
    });
  }

  // --- Dashboard KPIs ---
  getDashboardKPIs(selectedYear?: number, selectedMonth?: number): DashboardKPIs {
    const invoices = this.getInvoices();
    const clients = this.getClients();
    const now = new Date();
    const year = selectedYear || now.getFullYear();
    const month = selectedMonth || (now.getMonth() + 1);

    const monthInvoices = invoices.filter(inv => {
      const d = new Date(inv.invoiceDate);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    const totalClients = clients.filter(c => c.isActive).length;
    const invoicesThisMonth = monthInvoices.length;
    const totalInvoicedThisMonth = monthInvoices.reduce((sum, inv) => sum + (inv.status !== 'void' ? inv.grandTotal : 0), 0);
    const invoicesSentThisMonth = monthInvoices.filter(inv => inv.sentStatus !== 'not_sent').length;
    
    // Overall financial KPIs
    const nonVoidInvoices = invoices.filter(i => i.status !== 'void');
    const outstandingAmount = nonVoidInvoices.reduce((sum, inv) => sum + inv.outstandingBalance, 0);
    const paidAmount = nonVoidInvoices.reduce((sum, inv) => sum + inv.totalPaid, 0);
    
    // Overdue count (due date passed and unpaid/partially paid)
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueInvoicesCount = nonVoidInvoices.filter(inv => 
      inv.dueDate && 
      inv.dueDate < todayStr && 
      inv.paymentStatus !== 'paid'
    ).length;

    return {
      totalClients,
      invoicesThisMonth,
      totalInvoicedThisMonth,
      invoicesSentThisMonth,
      outstandingAmount,
      paidAmount,
      overdueInvoicesCount
    };
  }

  // --- Branding Settings ---
  getBranding(): BrandingSettings {
    if (!this.isBrowser()) return INITIAL_BRANDING;
    const data = localStorage.getItem(STORAGE_KEYS.BRANDING);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.BRANDING, JSON.stringify(INITIAL_BRANDING));
      return INITIAL_BRANDING;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_BRANDING;
    }
  }

  saveBranding(settings: Partial<BrandingSettings>): BrandingSettings {
    const current = this.getBranding();
    const updated: BrandingSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString()
    };
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.BRANDING, JSON.stringify(updated));
    }
    return updated;
  }

  // --- User Role Mock Switcher ---
  getUserRole(): 'admin' | 'staff' {
    if (!this.isBrowser()) return 'admin';
    return (localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ROLE) as 'admin' | 'staff') || 'admin';
  }

  setUserRole(role: 'admin' | 'staff'): void {
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ROLE, role);
    }
  }
}

export const storage = new StorageService();

