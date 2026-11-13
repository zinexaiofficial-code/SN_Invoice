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
  InvoiceTemplateKey,
  Cheque,
  ChequeType,
  ChequeStatus,
  ChequeAlertState,
  ChequeReminder,
  ChequeFilter,
  ChequeKPIs,
  NotificationPreferences,
  ChequeInvoiceAllocation,
  ChequeStatusHistory
} from '@/types';

// Default Seed Data based on official SN Advertising documents and Excel files
export const INITIAL_BILLING_ENTITIES: BillingEntity[] = [
  {
    id: 'e1111111-1111-1111-1111-111111111111',
    name: 'SN Advertising',
    displayName: 'SN Advertising',
    address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
    addressLine1: '32/1, The Suriya Group, Talawatta',
    addressLine2: 'Gonawala',
    city: 'Kelaniya',
    postalCode: '11600',
    country: 'Sri Lanka',
    phone: '+94 11 772 8282',
    secondaryPhone: '+94 77 400 0004 / +94 77 462 6262',
    email: 'snadvertising@hotmail.com',
    website: 'www.snadvertising.lk',
    brn: 'PV-89241',
    isVatRegistered: false,
    vatNumber: undefined,
    bankName: 'Seylan Bank',
    branch: 'Kadawatha Branch',
    accountName: 'SN Advertising',
    accountNumber: '028013149867001',
    chequePayee: 'SN ADVERTISING',
    paymentInstructions: 'Cheques should be drawn in favour of SN ADVERTISING. and crossed "ACCOUNT PAYEE" only. Bank transfers to SN Advertising, Account No. 028013149867001, Seylan Bank – Kadawatha Branch.',
    bankAccounts: [
      {
        id: 'ba-sn-1',
        bankName: 'Seylan Bank',
        branchName: 'Kadawatha Branch',
        accountHolderName: 'SN Advertising',
        accountNumber: '028013149867001',
        isDefault: true,
      }
    ],
    prefix: 'SN',
    startingSequence: 23460,
    currentSequence: 23467,
    logoUrl: '/logo.png',
    signatureUrl: '/signature-sample.png',
    signatoryName: 'S. Nawagamuwa',
    signatoryDesignation: 'Managing Director',
    primaryColor: '#0f172a',
    secondaryColor: '#059669',
    headerStyle: 'classic',
    footerText: 'Thank you for partnering with SN Advertising — Colombo, Sri Lanka',
    defaultCurrency: 'LKR',
    defaultPaymentTerms: '7 Days',
    defaultDueDays: 7,
    defaultInvoiceTemplate: 'standard',
    status: 'active',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'e2222222-2222-2222-2222-222222222222',
    name: 'HARIPARA (PVT) LTD',
    displayName: 'HARIPARA (PVT) LTD',
    address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
    addressLine1: '32/1, The Suriya Group, Talawatta',
    addressLine2: 'Gonawala',
    city: 'Kelaniya',
    postalCode: '11600',
    country: 'Sri Lanka',
    phone: '+94 11 772 8282',
    secondaryPhone: '+94 77 400 0004',
    email: 'info@haripara.lk',
    website: 'www.haripara.lk',
    brn: 'PV-104928',
    isVatRegistered: true,
    vatNumber: '114094498-7000',
    bankName: 'Commercial Bank of Ceylon',
    branch: 'Kelaniya Branch',
    accountName: 'HARIPARA (PVT) LTD',
    accountNumber: '10002938475',
    swiftCode: 'CCEYLKX',
    chequePayee: 'HARIPARA(PVT)LTD',
    paymentInstructions: 'Cheques should be drawn in favour of HARIPARA(PVT)LTD. and crossed "ACCOUNT PAYEE" only. Electronic transfers to Commercial Bank of Ceylon, Kelaniya Branch, A/C: 10002938475.',
    bankAccounts: [
      {
        id: 'ba-hrp-1',
        bankName: 'Commercial Bank of Ceylon',
        branchName: 'Kelaniya Branch',
        accountHolderName: 'HARIPARA (PVT) LTD',
        accountNumber: '10002938475',
        swiftCode: 'CCEYLKX',
        isDefault: true,
      }
    ],
    prefix: 'HRP',
    startingSequence: 1,
    currentSequence: 3,
    logoUrl: '',
    signatureUrl: '',
    signatoryName: 'Authorized Officer',
    signatoryDesignation: 'Director of Operations',
    primaryColor: '#1e293b',
    secondaryColor: '#d97706',
    headerStyle: 'modern',
    footerText: 'Official IRD Registered Tax Invoice — HARIPARA (PVT) LTD',
    defaultCurrency: 'LKR',
    defaultPaymentTerms: '14 Days',
    defaultDueDays: 14,
    defaultInvoiceTemplate: 'vat',
    status: 'active',
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
      displayName: 'SN Advertising',
      address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
      phone: '+94 11 772 8282 / +94 77 400 0004 / +94 77 462 6262',
      email: 'snadvertising@hotmail.com',
      website: 'www.snadvertising.lk',
      brn: 'PV-89241',
      chequePayee: 'SN ADVERTISING',
      bankName: 'Seylan Bank',
      branch: 'Kadawatha Branch',
      accountName: 'SN Advertising',
      accountNumber: '028013149867001',
      paymentInstructions: 'Cheques should be drawn in favour of SN ADVERTISING. and crossed "ACCOUNT PAYEE" only. Bank transfers may be made to SN Advertising, Account No. 028013149867001, Seylan Bank – Kadawatha Branch.',
      prefix: 'SN',
      logoUrl: '/logo.png',
      signatureUrl: '/signature-sample.png',
      signatoryName: 'S. Nawagamuwa',
      signatoryDesignation: 'Managing Director',
      footerText: 'Thank you for partnering with SN Advertising — Colombo, Sri Lanka',
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
      displayName: 'HARIPARA (PVT) LTD',
      address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
      phone: '+94 11 772 8282 / +94 77 400 0004',
      email: 'info@haripara.lk',
      website: 'www.haripara.lk',
      brn: 'PV-104928',
      chequePayee: 'HARIPARA(PVT)LTD',
      vatNumber: '114094498-7000',
      isVatRegistered: true,
      bankName: 'Commercial Bank of Ceylon',
      branch: 'Kelaniya Branch',
      accountName: 'HARIPARA (PVT) LTD',
      accountNumber: '10002938475',
      swiftCode: 'CCEYLKX',
      paymentInstructions: 'Cheques should be drawn in favour of HARIPARA(PVT)LTD. and crossed "ACCOUNT PAYEE" only. Electronic transfers to Commercial Bank of Ceylon, Kelaniya Branch, A/C: 10002938475.',
      prefix: 'HRP',
      logoUrl: '',
      signatoryName: 'Authorized Officer',
      signatoryDesignation: 'Director of Operations',
      footerText: 'Official IRD Registered Tax Invoice — HARIPARA (PVT) LTD',
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
      displayName: 'HARIPARA (PVT) LTD',
      address: '32/1, The Suriya Group, Talawatta, Gonawala, Kelaniya.',
      phone: '+94 11 772 8282 / +94 77 400 0004',
      email: 'info@haripara.lk',
      website: 'www.haripara.lk',
      brn: 'PV-104928',
      chequePayee: 'HARIPARA(PVT)LTD',
      vatNumber: '114094498-7000',
      isVatRegistered: true,
      bankName: 'Commercial Bank of Ceylon',
      branch: 'Kelaniya Branch',
      accountName: 'HARIPARA (PVT) LTD',
      accountNumber: '10002938475',
      swiftCode: 'CCEYLKX',
      paymentInstructions: 'Cheques should be drawn in favour of HARIPARA(PVT)LTD. and crossed "ACCOUNT PAYEE" only. Electronic transfers to Commercial Bank of Ceylon, Kelaniya Branch, A/C: 10002938475.',
      prefix: 'HRP',
      logoUrl: '',
      signatoryName: 'Authorized Officer',
      signatoryDesignation: 'Director of Operations',
      footerText: 'Official IRD Registered Tax Invoice — HARIPARA (PVT) LTD',
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

const getRelativeDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  emailEnabled: true,
  emailRecipient: 'snadvertising@hotmail.com',
  pushEnabled: true,
  dailySummaryTime: '08:30',
  alertOnOverdue: true,
  alertOnReturned: true,
  timezone: 'Asia/Colombo',
};

export const INITIAL_CHEQUES: Cheque[] = [
  {
    id: 'chq-001',
    type: 'incoming',
    chequeNumber: '458921',
    amount: 125000,
    currency: 'LKR',
    chequeDate: getRelativeDate(1), // Tomorrow
    receivedOrIssuedDate: getRelativeDate(-2),
    expectedActionDate: getRelativeDate(1),
    drawerBank: 'Sampath Bank',
    branch: 'Kiribathgoda',
    bankAccountId: 'ba-sn-1',
    bankAccountNumber: '028013149867001',
    payerOrPayeeName: 'Araliya Lands and Homes (Pvt) Ltd',
    clientId: 'c1111111-1111-1111-1111-111111111111',
    billingEntityId: 'e1111111-1111-1111-1111-111111111111',
    billingEntityName: 'SN Advertising',
    billingEntityPrefix: 'SN',
    status: 'pending_deposit',
    alertState: 'upcoming',
    purposeOfPayment: 'Payment for Video Campaign (Invoice #23458)',
    billReference: '23458',
    notes: 'Cheque received at office, to deposit at Seylan Bank Kadawatha.',
    attachments: [],
    invoiceAllocations: [
      {
        id: 'alloc-001',
        chequeId: 'chq-001',
        invoiceId: 'inv-001',
        invoiceNumber: '23458',
        allocatedAmount: 125000,
        createdAt: '2026-11-10T00:00:00Z',
      }
    ],
    statusHistory: [
      {
        id: 'sh-001',
        chequeId: 'chq-001',
        newStatus: 'received',
        changedAt: getRelativeDate(-2) + 'T10:00:00Z',
        notes: 'Cheque received from client'
      },
      {
        id: 'sh-002',
        chequeId: 'chq-001',
        previousStatus: 'received',
        newStatus: 'pending_deposit',
        changedAt: getRelativeDate(-1) + 'T09:30:00Z',
        notes: 'Prepared for deposit'
      }
    ],
    reminders: [],
    isReminderEnabled: true,
    createdAt: getRelativeDate(-2) + 'T10:00:00Z',
    updatedAt: getRelativeDate(-1) + 'T09:30:00Z',
  },
  {
    id: 'chq-002',
    type: 'incoming',
    chequeNumber: '339012',
    amount: 85000,
    currency: 'LKR',
    chequeDate: getRelativeDate(-4), // Overdue
    receivedOrIssuedDate: getRelativeDate(-7),
    expectedActionDate: getRelativeDate(-4),
    drawerBank: 'Commercial Bank',
    branch: 'Kadawatha Branch',
    bankAccountId: 'ba-sn-1',
    bankAccountNumber: '028013149867001',
    payerOrPayeeName: 'Chamara Motors (Pvt) Ltd',
    clientId: 'c3333333-3333-3333-3333-333333333333',
    billingEntityId: 'e1111111-1111-1111-1111-111111111111',
    billingEntityName: 'SN Advertising',
    billingEntityPrefix: 'SN',
    status: 'received',
    alertState: 'overdue',
    purposeOfPayment: 'Voice Cut Production partial payment',
    notes: 'Urgent: Cheque date has passed! Deposit immediately.',
    attachments: [],
    invoiceAllocations: [],
    statusHistory: [
      {
        id: 'sh-003',
        chequeId: 'chq-002',
        newStatus: 'received',
        changedAt: getRelativeDate(-7) + 'T11:00:00Z',
        notes: 'Handed over by client account rep'
      }
    ],
    reminders: [],
    isReminderEnabled: true,
    createdAt: getRelativeDate(-7) + 'T11:00:00Z',
    updatedAt: getRelativeDate(-4) + 'T08:00:00Z',
  },
  {
    id: 'chq-003',
    type: 'incoming',
    chequeNumber: '889900',
    amount: 250000,
    currency: 'LKR',
    chequeDate: getRelativeDate(-10),
    receivedOrIssuedDate: getRelativeDate(-12),
    expectedActionDate: getRelativeDate(-10),
    drawerBank: 'Hatton National Bank',
    branch: 'Kelaniya',
    bankAccountId: 'ba-hrp-1',
    bankAccountNumber: '10002938475',
    payerOrPayeeName: 'Global Media Network',
    billingEntityId: 'e2222222-2222-2222-2222-222222222222',
    billingEntityName: 'HARIPARA (PVT) LTD',
    billingEntityPrefix: 'HRP',
    status: 'returned',
    alertState: 'action_required',
    returnReason: 'Refer to Drawer (Insufficient funds)',
    bankCharges: 1500,
    followUpDate: getRelativeDate(0), // Today!
    purposeOfPayment: 'Annual Corporate Sponsorship',
    notes: 'Cheque returned by bank. Contacted accounts manager, requested replacement cheque.',
    attachments: [],
    invoiceAllocations: [],
    statusHistory: [
      {
        id: 'sh-004',
        chequeId: 'chq-003',
        newStatus: 'received',
        changedAt: getRelativeDate(-12) + 'T14:00:00Z',
      },
      {
        id: 'sh-005',
        chequeId: 'chq-003',
        previousStatus: 'received',
        newStatus: 'deposited',
        changedAt: getRelativeDate(-9) + 'T10:00:00Z',
      },
      {
        id: 'sh-006',
        chequeId: 'chq-003',
        previousStatus: 'deposited',
        newStatus: 'returned',
        changedAt: getRelativeDate(-3) + 'T16:00:00Z',
        returnReason: 'Refer to Drawer (Insufficient funds)',
        bankCharges: 1500,
        notes: 'Returned by bank. Bank debited Rs. 1,500 return fee.'
      }
    ],
    reminders: [],
    isReminderEnabled: true,
    createdAt: getRelativeDate(-12) + 'T14:00:00Z',
    updatedAt: getRelativeDate(-3) + 'T16:00:00Z',
  },
  {
    id: 'chq-004',
    type: 'incoming',
    chequeNumber: '782103',
    amount: 150000,
    currency: 'LKR',
    chequeDate: getRelativeDate(-15),
    receivedOrIssuedDate: getRelativeDate(-16),
    expectedActionDate: getRelativeDate(-14),
    actualClearanceDate: getRelativeDate(-12),
    drawerBank: 'Nations Trust Bank',
    branch: 'Colombo 03',
    bankAccountId: 'ba-sn-1',
    bankAccountNumber: '028013149867001',
    payerOrPayeeName: 'Senkadagala Finance PLC',
    billingEntityId: 'e1111111-1111-1111-1111-111111111111',
    billingEntityName: 'SN Advertising',
    billingEntityPrefix: 'SN',
    status: 'cleared',
    alertState: 'cleared',
    purposeOfPayment: 'Digital Banner campaign',
    notes: 'Successfully cleared into Seylan Bank account.',
    attachments: [],
    invoiceAllocations: [],
    statusHistory: [
      {
        id: 'sh-007',
        chequeId: 'chq-004',
        newStatus: 'cleared',
        changedAt: getRelativeDate(-12) + 'T12:00:00Z',
        notes: 'Bank confirmed funds cleared'
      }
    ],
    reminders: [],
    isReminderEnabled: false,
    createdAt: getRelativeDate(-16) + 'T09:00:00Z',
    updatedAt: getRelativeDate(-12) + 'T12:00:00Z',
  },
  {
    id: 'chq-005',
    type: 'outgoing',
    chequeNumber: '100452',
    amount: 90000,
    currency: 'LKR',
    chequeDate: getRelativeDate(2), // In 2 days
    receivedOrIssuedDate: getRelativeDate(-1),
    expectedActionDate: getRelativeDate(2),
    drawerBank: 'Seylan Bank',
    branch: 'Kadawatha Branch',
    bankAccountId: 'ba-sn-1',
    bankAccountNumber: '028013149867001',
    payerOrPayeeName: 'Asia Broadcasting Corporation (Pvt) Ltd',
    supplierName: 'Asia Broadcasting Corporation (Pvt) Ltd (Hiru FM)',
    billingEntityId: 'e1111111-1111-1111-1111-111111111111',
    billingEntityName: 'SN Advertising',
    billingEntityPrefix: 'SN',
    status: 'issued',
    alertState: 'upcoming',
    purposeOfPayment: 'Radio Airtime Booking Nov 2026',
    notes: 'Handed to Hiru FM media rep. Ensure account has sufficient balance before presentation date.',
    attachments: [],
    invoiceAllocations: [],
    statusHistory: [
      {
        id: 'sh-008',
        chequeId: 'chq-005',
        newStatus: 'issued',
        changedAt: getRelativeDate(-1) + 'T15:30:00Z',
        notes: 'Cheque signed and dispatched'
      }
    ],
    reminders: [],
    isReminderEnabled: true,
    createdAt: getRelativeDate(-1) + 'T15:30:00Z',
    updatedAt: getRelativeDate(-1) + 'T15:30:00Z',
  },
  {
    id: 'chq-006',
    type: 'outgoing',
    chequeNumber: '500121',
    amount: 180000,
    currency: 'LKR',
    chequeDate: getRelativeDate(-8),
    receivedOrIssuedDate: getRelativeDate(-10),
    expectedActionDate: getRelativeDate(-8),
    actualClearanceDate: getRelativeDate(-6),
    drawerBank: 'Commercial Bank of Ceylon',
    branch: 'Kelaniya Branch',
    bankAccountId: 'ba-hrp-1',
    bankAccountNumber: '10002938475',
    payerOrPayeeName: 'Print Lab & Graphics Ltd',
    supplierName: 'Print Lab & Graphics Ltd',
    billingEntityId: 'e2222222-2222-2222-2222-222222222222',
    billingEntityName: 'HARIPARA (PVT) LTD',
    billingEntityPrefix: 'HRP',
    status: 'cleared',
    alertState: 'cleared',
    purposeOfPayment: 'Large format printing services',
    notes: 'Cheque presented and debited successfully.',
    attachments: [],
    invoiceAllocations: [],
    statusHistory: [
      {
        id: 'sh-009',
        chequeId: 'chq-006',
        newStatus: 'cleared',
        changedAt: getRelativeDate(-6) + 'T10:00:00Z',
        notes: 'Cleared from Commercial Bank'
      }
    ],
    reminders: [],
    isReminderEnabled: false,
    createdAt: getRelativeDate(-10) + 'T11:00:00Z',
    updatedAt: getRelativeDate(-6) + 'T10:00:00Z',
  }
];

export function calculateChequeAlertState(cheque: Cheque): ChequeAlertState {
  if (cheque.status === 'cleared') return 'cleared';
  if (cheque.status === 'cancelled' || cheque.status === 'replaced') return 'normal';
  if (cheque.status === 'returned') return 'action_required';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDateStr = cheque.expectedActionDate || cheque.chequeDate;
  if (!targetDateStr) return 'normal';

  const targetDate = new Date(targetDateStr);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'due_today';
  if (diffDays <= 7) return 'upcoming';

  return 'normal';
}

export function generateChequeReminders(cheque: Cheque, existingReminders: ChequeReminder[] = []): ChequeReminder[] {
  if (!cheque.isReminderEnabled) return [];
  if (cheque.status === 'cleared' || cheque.status === 'cancelled' || cheque.status === 'replaced') return [];

  const existingMap = new Map(existingReminders.map(r => [r.reminderType, r]));
  const targetDateStr = cheque.expectedActionDate || cheque.chequeDate;
  if (!targetDateStr) return [];

  const targetDate = new Date(targetDateStr);
  targetDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const reminders: ChequeReminder[] = [];

  const formatOffsetDate = (days: number): string => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const isIncoming = cheque.type === 'incoming';
  const partyLabel = isIncoming ? `Client: ${cheque.payerOrPayeeName}` : `Payee: ${cheque.payerOrPayeeName}`;
  const amountStr = `Rs. ${Number(cheque.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  // 1. Returned Cheque Action Required
  if (cheque.status === 'returned') {
    const prev = existingMap.get('returned_action');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-ret`,
      chequeId: cheque.id,
      reminderDate: cheque.followUpDate || today.toISOString().split('T')[0],
      reminderType: 'returned_action',
      title: `🚨 RETURNED CHEQUE ACTION: Cheque #${cheque.chequeNumber}`,
      message: `Cheque #${cheque.chequeNumber} for ${amountStr} (${partyLabel}) was returned. Reason: ${cheque.returnReason || 'Refer to Drawer'}. Follow up required!`,
      priority: 'urgent',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: 'delivered',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
    return reminders;
  }

  // 2. Overdue Alert
  if (diffDays < 0) {
    const prev = existingMap.get('overdue');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-od`,
      chequeId: cheque.id,
      reminderDate: today.toISOString().split('T')[0],
      reminderType: 'overdue',
      title: `⚠️ OVERDUE: Cheque #${cheque.chequeNumber} (${partyLabel})`,
      message: `${isIncoming ? 'Incoming cheque' : 'Outgoing cheque'} #${cheque.chequeNumber} of ${amountStr} is overdue by ${Math.abs(diffDays)} day(s)! Please ${isIncoming ? 'deposit' : 'verify account balance'} immediately.`,
      priority: 'urgent',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: 'delivered',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
  }

  // 3. Due Today
  if (diffDays === 0) {
    const prev = existingMap.get('due_today');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-today`,
      chequeId: cheque.id,
      reminderDate: targetDateStr,
      reminderType: 'due_today',
      title: `🔔 DUE TODAY: Cheque #${cheque.chequeNumber}`,
      message: `${isIncoming ? 'Deposit incoming cheque' : 'Outgoing cheque presentation due today'} #${cheque.chequeNumber} for ${amountStr} (${partyLabel}).`,
      priority: 'high',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: 'delivered',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
  }

  // 4. Due in 1 Day (Tomorrow)
  if (diffDays === 1 || diffDays > 0) {
    const prev = existingMap.get('due_1_day');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-1d`,
      chequeId: cheque.id,
      reminderDate: formatOffsetDate(1),
      reminderType: 'due_1_day',
      title: `📅 DUE TOMORROW: Cheque #${cheque.chequeNumber}`,
      message: `Cheque #${cheque.chequeNumber} of ${amountStr} is due tomorrow (${targetDateStr}). ${partyLabel}.`,
      priority: 'high',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: diffDays <= 1 ? 'delivered' : 'pending',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
  }

  // 5. Due in 3 Days
  if (diffDays <= 3 && diffDays > 1) {
    const prev = existingMap.get('due_3_days');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-3d`,
      chequeId: cheque.id,
      reminderDate: formatOffsetDate(3),
      reminderType: 'due_3_days',
      title: `⏳ Due in ${diffDays} days: Cheque #${cheque.chequeNumber}`,
      message: `Cheque #${cheque.chequeNumber} for ${amountStr} is scheduled for ${targetDateStr}. ${partyLabel}.`,
      priority: 'medium',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: 'delivered',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
  }

  // 6. Due in 7 Days
  if (diffDays <= 7 && diffDays > 3) {
    const prev = existingMap.get('due_7_days');
    reminders.push({
      id: prev?.id || `rem-${cheque.id}-7d`,
      chequeId: cheque.id,
      reminderDate: formatOffsetDate(7),
      reminderType: 'due_7_days',
      title: `🗓️ Upcoming Cheque in ${diffDays} days: #${cheque.chequeNumber}`,
      message: `Cheque #${cheque.chequeNumber} of ${amountStr} scheduled on ${targetDateStr}. ${partyLabel}.`,
      priority: 'low',
      isRead: prev?.isRead || false,
      isDismissed: prev?.isDismissed || false,
      snoozedUntil: prev?.snoozedUntil,
      deliveryStatus: 'delivered',
      createdAt: prev?.createdAt || new Date().toISOString()
    });
  }

  return reminders;
}

const STORAGE_KEYS = {
  INVOICES: 'sn_invoices_data_v2',
  CLIENTS: 'sn_clients_data_v2',
  SERVICES: 'sn_services_data_v2',
  BILLING_ENTITIES: 'sn_billing_entities_v2',
  TEMPLATES: 'sn_templates_v2',
  BRANDING: 'sn_branding_v2',
  NEXT_INVOICE_NUM: 'sn_next_invoice_number_v2',
  CURRENT_USER_ROLE: 'sn_current_user_role',
  CHEQUES: 'sn_cheques_v1',
  NOTIFICATION_PREFS: 'sn_notification_preferences_v1'
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
      const parsed: BillingEntity[] = JSON.parse(data);
      // Merge in any missing seed fields for existing entities (like brn, isVatRegistered, etc.)
      const merged = parsed.map(ent => {
        const seed = INITIAL_BILLING_ENTITIES.find(s => s.id === ent.id);
        if (seed) {
          return {
            ...seed,
            ...ent,
            // If stored had empty/old values for new fields, take seed
            isVatRegistered: ent.isVatRegistered !== undefined ? ent.isVatRegistered : seed.isVatRegistered,
            vatNumber: ent.vatNumber !== undefined ? ent.vatNumber : seed.vatNumber,
            brn: ent.brn || seed.brn,
            displayName: ent.displayName || seed.displayName,
            status: ent.status || seed.status || (ent.isActive ? 'active' : 'archived'),
            prefix: ent.prefix || seed.prefix,
            bankName: ent.bankName || seed.bankName,
            accountNumber: ent.accountNumber || seed.accountNumber,
            chequePayee: ent.chequePayee || seed.chequePayee,
            email: ent.id === 'e2222222-2222-2222-2222-222222222222' && ent.email?.includes('snadvertising') ? seed.email : (ent.email || seed.email),
          };
        }
        return {
          ...ent,
          status: ent.status || (ent.isActive ? 'active' : 'archived'),
          isVatRegistered: Boolean(ent.isVatRegistered),
        };
      });
      return merged;
    } catch {
      return INITIAL_BILLING_ENTITIES;
    }
  }

  getEntityById(id: string): BillingEntity | undefined {
    return this.getBillingEntities().find(e => e.id === id);
  }

  hasInvoices(entityId: string): boolean {
    return this.getInvoices().some(inv => inv.billingEntityId === entityId);
  }

  isPrefixTaken(prefix: string, excludeEntityId?: string): boolean {
    const p = prefix.trim().toUpperCase();
    return this.getBillingEntities().some(e => e.id !== excludeEntityId && e.prefix.toUpperCase() === p);
  }

  archiveBillingEntity(id: string): { success: boolean; message?: string } {
    const list = this.getBillingEntities();
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) return { success: false, message: 'Entity not found' };
    
    // Prevent archiving if it is the only active entity
    const activeCount = list.filter(e => e.isActive && e.status !== 'archived').length;
    if (activeCount <= 1 && list[idx].isActive && list[idx].status !== 'archived') {
      return { success: false, message: 'At least one active billing entity must remain in the system.' };
    }

    list[idx] = {
      ...list[idx],
      status: 'archived',
      isActive: false,
      updatedAt: new Date().toISOString()
    };
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.BILLING_ENTITIES, JSON.stringify(list));
    }
    return { success: true };
  }

  unarchiveBillingEntity(id: string): { success: boolean; message?: string } {
    const list = this.getBillingEntities();
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) return { success: false, message: 'Entity not found' };

    list[idx] = {
      ...list[idx],
      status: 'active',
      isActive: true,
      updatedAt: new Date().toISOString()
    };
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.BILLING_ENTITIES, JSON.stringify(list));
    }
    return { success: true };
  }

  deleteBillingEntity(id: string): { success: boolean; message?: string } {
    if (this.hasInvoices(id)) {
      return { 
        success: false, 
        message: 'This entity has historical invoices. To protect financial audit records, entities with invoice history cannot be deleted. You can archive it instead.' 
      };
    }
    const list = this.getBillingEntities();
    if (list.length <= 1) {
      return { success: false, message: 'You cannot delete the only billing entity.' };
    }
    const filtered = list.filter(e => e.id !== id);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.BILLING_ENTITIES, JSON.stringify(filtered));
    }
    return { success: true };
  }

  saveBillingEntity(entity: Partial<BillingEntity>): BillingEntity {
    const list = this.getBillingEntities();
    let saved: BillingEntity;
    const prefix = (entity.prefix || 'SN').toUpperCase().trim();

    if (entity.id) {
      const idx = list.findIndex(e => e.id === entity.id);
      if (idx >= 0) {
        saved = { 
          ...list[idx], 
          ...entity, 
          prefix,
          status: entity.status || list[idx].status || 'active',
          updatedAt: new Date().toISOString() 
        };
        list[idx] = saved;
      } else {
        saved = {
          ...entity,
          id: entity.id || 'e-' + Date.now(),
          prefix,
          status: entity.status || 'active',
          isActive: entity.status !== 'archived',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as BillingEntity;
        list.push(saved);
      }
    } else {
      saved = {
        id: 'e-' + Date.now(),
        name: entity.name || 'New Entity',
        displayName: entity.displayName || entity.name || 'New Entity',
        address: entity.address || '',
        chequePayee: entity.chequePayee || entity.name || '',
        prefix,
        isVatRegistered: Boolean(entity.isVatRegistered),
        status: 'active',
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

  // Generate next collision-safe running invoice number for a specific billing entity
  getNextInvoiceNumber(entityId?: string): string {
    if (!this.isBrowser()) return 'SN-23467';
    const entities = this.getBillingEntities();
    const entity = (entityId ? entities.find(e => e.id === entityId) : null) || entities[0];
    const prefix = (entity?.prefix || 'SN').toUpperCase().trim();
    const year = new Date().getFullYear();

    const seqKey = `sn_seq_${prefix}`;
    const storedSeq = localStorage.getItem(seqKey);

    let nextNum: number;
    if (storedSeq) {
      nextNum = parseInt(storedSeq, 10);
    } else {
      // Find highest from existing invoices for this entity or prefix
      const invoices = this.getInvoices();
      const entityInvs = invoices.filter(i => 
        i.billingEntityId === entity?.id || 
        (i.invoiceNumber && i.invoiceNumber.toUpperCase().startsWith(prefix))
      );
      
      const numbers = entityInvs.map(inv => {
        const parts = inv.invoiceNumber.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        return isNaN(num) ? 0 : num;
      }).filter(n => n > 0);

      if (numbers.length > 0) {
        nextNum = Math.max(...numbers) + 1;
      } else if (entity?.startingSequence) {
        nextNum = entity.startingSequence;
      } else if (prefix === 'SN') {
        nextNum = 23467;
      } else {
        nextNum = 1;
      }
    }

    if (prefix === 'SN') {
      return `SN-${nextNum}`;
    }
    return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
  }

  incrementInvoiceNumber(entityId?: string): void {
    if (!this.isBrowser()) return;
    const entities = this.getBillingEntities();
    const entity = (entityId ? entities.find(e => e.id === entityId) : null) || entities[0];
    const prefix = (entity?.prefix || 'SN').toUpperCase().trim();
    const seqKey = `sn_seq_${prefix}`;

    const nextStr = this.getNextInvoiceNumber(entityId);
    const parts = nextStr.split('-');
    const currentNum = parseInt(parts[parts.length - 1], 10) || 1;
    localStorage.setItem(seqKey, String(currentNum + 1));
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
      const invoiceNumber = invoice.invoiceNumber || this.getNextInvoiceNumber(invoice.billingEntityId);
      this.incrementInvoiceNumber(invoice.billingEntityId);

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

    const nextNumber = this.getNextInvoiceNumber(source.billingEntityId);
    const today = new Date().toISOString().split('T')[0];

    const duplicated: Partial<Invoice> = {
      invoiceNumber: nextNumber,
      clientId: source.clientId,
      billingEntityId: source.billingEntityId,
      templateId: source.templateId,
      templateKey: source.templateKey,
      status: 'draft',
      invoiceDate: today,
      includeServicePeriod: source.includeServicePeriod,
      servicePeriodStart: source.servicePeriodStart,
      servicePeriodEnd: source.servicePeriodEnd,
      servicePeriodText: source.servicePeriodText,
      product: source.product,
      regNo: source.regNo,
      yourRef: source.yourRef,
      subtotal: source.subtotal,
      vatApplicable: source.vatApplicable,
      vatRate: source.vatRate,
      vatAmount: source.vatAmount,
      taxableBase: source.taxableBase,
      showVatSeparately: source.showVatSeparately,
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
  getDashboardKPIs(selectedYear?: number, selectedMonth?: number, entityId?: string, clientId?: string): DashboardKPIs {
    let invoices = this.getInvoices();
    const clients = this.getClients();
    const now = new Date();
    const year = selectedYear || now.getFullYear();
    const month = selectedMonth || (now.getMonth() + 1);

    // Apply entity filter if provided
    if (entityId) {
      invoices = invoices.filter(inv => inv.billingEntityId === entityId);
    }

    // Apply client filter if provided
    if (clientId) {
      invoices = invoices.filter(inv => inv.clientId === clientId);
    }

    const monthInvoices = invoices.filter(inv => {
      const d = new Date(inv.invoiceDate);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    let activeClients = clients.filter(c => c.isActive);
    if (entityId) {
      activeClients = activeClients.filter(c => 
        c.defaultBillingEntityId === entityId || 
        invoices.some(inv => inv.clientId === c.id)
      );
    }
    const totalClients = activeClients.length;

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

  // --- Cheque Management & Reminders ---
  getNotificationPreferences(): NotificationPreferences {
    if (!this.isBrowser()) return DEFAULT_NOTIFICATION_PREFS;
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_PREFS, JSON.stringify(DEFAULT_NOTIFICATION_PREFS));
      return DEFAULT_NOTIFICATION_PREFS;
    }
    try {
      return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_NOTIFICATION_PREFS;
    }
  }

  saveNotificationPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
    const current = this.getNotificationPreferences();
    const updated = { ...current, ...prefs };
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_PREFS, JSON.stringify(updated));
    }
    return updated;
  }

  getCheques(filter?: ChequeFilter): Cheque[] {
    let list: Cheque[] = [];
    if (!this.isBrowser()) {
      list = [...INITIAL_CHEQUES];
    } else {
      const data = localStorage.getItem(STORAGE_KEYS.CHEQUES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(INITIAL_CHEQUES));
        list = [...INITIAL_CHEQUES];
      } else {
        try {
          list = JSON.parse(data);
        } catch {
          list = [...INITIAL_CHEQUES];
        }
      }
    }

    // Always recompute dynamic alert states and reminders
    const updatedList = list.map(c => {
      const alertState = calculateChequeAlertState(c);
      const reminders = generateChequeReminders(c, c.reminders || []);
      return { ...c, alertState, reminders };
    });

    if (!filter) return updatedList;

    return updatedList.filter(c => {
      if (filter.type && filter.type !== 'all' && c.type !== filter.type) return false;
      if (filter.entityId && filter.entityId !== 'all' && c.billingEntityId !== filter.entityId) return false;
      if (filter.status && filter.status !== 'all' && c.status !== filter.status) return false;
      if (filter.alertState && filter.alertState !== 'all' && c.alertState !== filter.alertState) return false;
      if (filter.clientId && c.clientId !== filter.clientId) return false;
      if (filter.bank && !c.drawerBank.toLowerCase().includes(filter.bank.toLowerCase())) return false;
      if (filter.startDate && (c.expectedActionDate || c.chequeDate) < filter.startDate) return false;
      if (filter.endDate && (c.expectedActionDate || c.chequeDate) > filter.endDate) return false;
      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase().trim();
        const matchesNumber = c.chequeNumber.toLowerCase().includes(q);
        const matchesParty = c.payerOrPayeeName.toLowerCase().includes(q);
        const matchesBank = c.drawerBank.toLowerCase().includes(q);
        const matchesPurpose = (c.purposeOfPayment || '').toLowerCase().includes(q);
        const matchesEntity = (c.billingEntityName || '').toLowerCase().includes(q);
        if (!matchesNumber && !matchesParty && !matchesBank && !matchesPurpose && !matchesEntity) {
          return false;
        }
      }
      return true;
    });
  }

  getChequeById(id: string): Cheque | undefined {
    return this.getCheques().find(c => c.id === id);
  }

  saveCheque(chequeData: Omit<Cheque, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Cheque {
    const list = this.getCheques();
    const now = new Date().toISOString();

    const entity = this.getEntityById(chequeData.billingEntityId);
    const enrichedData = {
      ...chequeData,
      billingEntityName: entity?.displayName || entity?.name || chequeData.billingEntityName || 'SN Advertising',
      billingEntityPrefix: entity?.prefix || chequeData.billingEntityPrefix || 'SN',
    };

    let saved: Cheque;
    if (chequeData.id) {
      const index = list.findIndex(c => c.id === chequeData.id);
      if (index === -1) {
        saved = {
          ...enrichedData,
          id: chequeData.id,
          createdAt: now,
          updatedAt: now,
          alertState: 'normal',
          reminders: [],
          attachments: enrichedData.attachments || [],
          invoiceAllocations: enrichedData.invoiceAllocations || [],
          statusHistory: enrichedData.statusHistory || []
        };
        list.push(saved);
      } else {
        const existing = list[index];
        saved = {
          ...existing,
          ...enrichedData,
          updatedAt: now,
        };
        list[index] = saved;
      }
    } else {
      const newId = 'chq-' + Date.now();
      saved = {
        ...enrichedData,
        id: newId,
        createdAt: now,
        updatedAt: now,
        alertState: 'normal',
        reminders: [],
        attachments: enrichedData.attachments || [],
        invoiceAllocations: enrichedData.invoiceAllocations || [],
        statusHistory: [
          {
            id: 'sh-' + Date.now(),
            chequeId: newId,
            newStatus: enrichedData.status,
            changedAt: now,
            notes: `Cheque recorded with status: ${enrichedData.status}`
          }
        ]
      };
      list.unshift(saved);
    }

    saved.alertState = calculateChequeAlertState(saved);
    saved.reminders = generateChequeReminders(saved, saved.reminders || []);

    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(list));
    }
    return saved;
  }

  deleteCheque(id: string): boolean {
    const list = this.getCheques();
    const updated = list.filter(c => c.id !== id);
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(updated));
    }
    return true;
  }

  updateChequeStatus(
    id: string, 
    newStatus: ChequeStatus, 
    details?: { 
      notes?: string; 
      returnReason?: string; 
      bankCharges?: number; 
      followUpDate?: string; 
      replacementChequeRef?: string;
      clearedDate?: string;
    }
  ): Cheque {
    const list = this.getCheques();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Cheque not found');

    const cheque = list[index];
    const prevStatus = cheque.status;
    const now = new Date().toISOString();

    const historyEntry: ChequeStatusHistory = {
      id: 'sh-' + Date.now(),
      chequeId: cheque.id,
      previousStatus: prevStatus,
      newStatus,
      changedAt: now,
      notes: details?.notes,
      returnReason: details?.returnReason,
      bankCharges: details?.bankCharges,
      followUpDate: details?.followUpDate,
      replacementChequeRef: details?.replacementChequeRef
    };

    const updated: Cheque = {
      ...cheque,
      status: newStatus,
      updatedAt: now,
      statusHistory: [...(cheque.statusHistory || []), historyEntry],
      ...(details?.clearedDate ? { actualClearanceDate: details.clearedDate } : {}),
      ...(newStatus === 'cleared' && !details?.clearedDate ? { actualClearanceDate: now.split('T')[0] } : {}),
      ...(details?.returnReason ? { returnReason: details.returnReason } : {}),
      ...(details?.bankCharges !== undefined ? { bankCharges: details.bankCharges } : {}),
      ...(details?.followUpDate ? { followUpDate: details.followUpDate } : {}),
      ...(details?.replacementChequeRef ? { replacementChequeRef: details.replacementChequeRef } : {}),
    };

    // If marked cleared AND incoming with invoice allocations, post payments
    if (newStatus === 'cleared' && prevStatus !== 'cleared' && updated.type === 'incoming') {
      if (updated.invoiceAllocations && updated.invoiceAllocations.length > 0) {
        for (const alloc of updated.invoiceAllocations) {
          try {
            this.recordPayment(alloc.invoiceId, {
              amount: alloc.allocatedAmount,
              paymentDate: updated.actualClearanceDate || now.split('T')[0],
              paymentMethod: 'cheque',
              transactionRef: `CHQ-${updated.chequeNumber}`,
              notes: `Cleared cheque #${updated.chequeNumber} (${updated.drawerBank})`
            });
          } catch (e) {
            console.error('Failed to post payment for invoice allocation:', e);
          }
        }
      }
    }

    updated.alertState = calculateChequeAlertState(updated);
    updated.reminders = generateChequeReminders(updated, updated.reminders || []);

    list[index] = updated;
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(list));
    }
    return updated;
  }

  getChequeKPIs(filter?: ChequeFilter): ChequeKPIs {
    const list = this.getCheques(filter);

    let totalIncomingAmount = 0;
    let totalOutgoingAmount = 0;
    let pendingChequesCount = 0;
    let pendingChequesAmount = 0;
    let due7DaysCount = 0;
    let due7DaysAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let clearedCount = 0;
    let clearedAmount = 0;
    let returnedCount = 0;
    let returnedAmount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const c of list) {
      const amt = Number(c.amount) || 0;
      if (c.type === 'incoming') {
        totalIncomingAmount += amt;
      } else {
        totalOutgoingAmount += amt;
      }

      if (c.status === 'cleared') {
        clearedCount += 1;
        clearedAmount += amt;
      } else if (c.status === 'returned') {
        returnedCount += 1;
        returnedAmount += amt;
      } else if (c.status !== 'cancelled' && c.status !== 'replaced') {
        // Pending
        pendingChequesCount += 1;
        pendingChequesAmount += amt;

        const targetDateStr = c.expectedActionDate || c.chequeDate;
        if (targetDateStr) {
          const targetDate = new Date(targetDateStr);
          targetDate.setHours(0, 0, 0, 0);
          const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            overdueCount += 1;
            overdueAmount += amt;
          } else if (diffDays <= 7) {
            due7DaysCount += 1;
            due7DaysAmount += amt;
          }
        }
      }
    }

    return {
      totalIncomingAmount,
      totalOutgoingAmount,
      pendingChequesCount,
      pendingChequesAmount,
      due7DaysCount,
      due7DaysAmount,
      overdueCount,
      overdueAmount,
      clearedCount,
      clearedAmount,
      returnedCount,
      returnedAmount
    };
  }

  getChequeReminders(options?: { onlyPending?: boolean; limit?: number }): (ChequeReminder & { cheque?: Cheque })[] {
    const cheques = this.getCheques();
    const allReminders: (ChequeReminder & { cheque?: Cheque })[] = [];

    const now = new Date().toISOString();

    for (const c of cheques) {
      if (!c.reminders || c.reminders.length === 0) continue;
      for (const r of c.reminders) {
        if (options?.onlyPending) {
          if (r.isDismissed) continue;
          if (r.snoozedUntil && r.snoozedUntil > now) continue;
        }
        allReminders.push({ ...r, cheque: c });
      }
    }

    // Sort urgent first, then by date
    const priorityWeight: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    allReminders.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return a.reminderDate.localeCompare(b.reminderDate);
    });

    if (options?.limit && options.limit > 0) {
      return allReminders.slice(0, options.limit);
    }

    return allReminders;
  }

  snoozeReminder(reminderId: string, days: number = 1): void {
    const list = this.getCheques();
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + days);
    const snoozedUntil = snoozeDate.toISOString();

    let updated = false;
    for (const c of list) {
      if (!c.reminders) continue;
      const r = c.reminders.find(rem => rem.id === reminderId);
      if (r) {
        r.snoozedUntil = snoozedUntil;
        updated = true;
        break;
      }
    }

    if (updated && this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(list));
    }
  }

  dismissReminder(reminderId: string): void {
    const list = this.getCheques();
    let updated = false;
    for (const c of list) {
      if (!c.reminders) continue;
      const r = c.reminders.find(rem => rem.id === reminderId);
      if (r) {
        r.isDismissed = true;
        updated = true;
        break;
      }
    }

    if (updated && this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(list));
    }
  }

  markReminderRead(reminderId: string): void {
    const list = this.getCheques();
    let updated = false;
    for (const c of list) {
      if (!c.reminders) continue;
      const r = c.reminders.find(rem => rem.id === reminderId);
      if (r) {
        r.isRead = true;
        updated = true;
        break;
      }
    }

    if (updated && this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.CHEQUES, JSON.stringify(list));
    }
  }
}

export const storage = new StorageService();

