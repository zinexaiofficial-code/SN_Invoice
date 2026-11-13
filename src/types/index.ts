export type UserRole = 'admin' | 'owner' | 'staff';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface EntityBankAccount {
  id: string;
  bankName: string;
  branchName: string;
  accountHolderName: string;
  accountNumber: string;
  swiftCode?: string;
  isDefault: boolean;
}

export interface BillingEntity {
  id: string;
  name: string; // Legal registered business name
  displayName?: string; // Trading / brand display name
  address: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  website?: string;
  brn?: string; // Business Registration Number
  vatNumber?: string;
  isVatRegistered: boolean;

  // Banking
  bankName?: string;
  branch?: string;
  accountName?: string;
  accountNumber?: string;
  swiftCode?: string;
  chequePayee: string;
  paymentInstructions?: string;
  bankAccounts?: EntityBankAccount[];

  // Branding & Assets
  logoUrl?: string; // URL or persistent data URL (PNG, JPG, WebP)
  signatureUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  headerStyle?: 'modern' | 'classic' | 'minimal';
  footerText?: string;

  // Invoice Numbering & Defaults
  prefix: string; // Unique entity prefix e.g. SN, HRP
  startingSequence?: number;
  currentSequence?: number;
  defaultCurrency?: string;
  defaultPaymentTerms?: string;
  defaultDueDays?: number;
  defaultInvoiceTemplate?: InvoiceTemplateKey;
  defaultTaxConfig?: {
    vatApplicable: boolean;
    vatRate: number;
  };
  invoiceNotes?: string;
  signatoryName?: string;
  signatoryDesignation?: string;

  status: 'active' | 'archived';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  code: string;
  address: string;
  contactPerson?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  vatNumber?: string;
  brn?: string;
  defaultVatPreference: boolean;
  defaultBillingEntityId?: string;
  defaultPaymentTerms?: string;
  defaultAdvancePercentage?: number;
  defaultNote?: string;
  internalNotes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  defaultDescription?: string;
  defaultPrice: number;
  vatApplicable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientService {
  id: string;
  clientId: string;
  serviceId: string;
  specialPrice: number;
  customDescription?: string;
  createdAt: string;
}

export type InvoiceTemplateKey = 'standard' | 'vat' | 'sponsorship' | 'custom';

export interface InvoiceTemplate {
  id: string;
  key: InvoiceTemplateKey;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void';
export type SentStatus = 'not_sent' | 'sent' | 'delivery_confirmed';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'voided';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque';
export type ShareChannel = 'whatsapp' | 'email' | 'manual' | 'download';

export interface InvoiceItem {
  id: string;
  invoiceId?: string;
  serviceId?: string;
  serviceName: string;
  description: string;
  servicePeriod?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface InvoiceShareRecord {
  id: string;
  invoiceId: string;
  channel: ShareChannel;
  recipient?: string;
  deliveryStatus: 'sent' | 'delivery_confirmed' | 'failed';
  sharedBy?: string;
  sharedAt: string;
  notes?: string;
}

export interface ClientSnapshot {
  id: string;
  name: string;
  code: string;
  address: string;
  vatNumber?: string;
  contactPerson?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
}

export interface BillingSnapshot {
  id: string;
  name: string;
  displayName?: string;
  address: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  website?: string;
  brn?: string;
  vatNumber?: string;
  isVatRegistered?: boolean;
  chequePayee: string;
  bankName?: string;
  branch?: string;
  accountName?: string;
  accountNumber?: string;
  swiftCode?: string;
  paymentInstructions?: string;
  logoUrl?: string;
  signatureUrl?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
  prefix?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  billingEntityId: string;
  templateId?: string;
  templateKey?: InvoiceTemplateKey;
  status: InvoiceStatus;
  
  // Dates
  invoiceDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  issuedAt?: string;
  sentAt?: string;
  paidAt?: string;
  servicePeriodStart?: string;
  servicePeriodEnd?: string;
  servicePeriodText?: string;
  
  // References
  product?: string;
  regNo?: string;
  yourRef?: string;
  
  // Financials
  subtotal: number;
  vatApplicable: boolean;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  
  // Advance & Notes
  advancePercentage: number;
  advanceAmount: number;
  specialNotes?: string;
  paymentInstructions?: string;
  
  // Statuses
  sentStatus: SentStatus;
  paymentStatus: PaymentStatus;
  totalPaid: number;
  outstandingBalance: number;
  
  // Immutable snapshots
  clientSnapshot: ClientSnapshot;
  billingSnapshot: BillingSnapshot;
  
  // Relations
  items: InvoiceItem[];
  payments: Payment[];
  shareHistory: InvoiceShareRecord[];
  
  pdfUrl?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandingSettings {
  id: string;
  businessName: string;
  logoUrl: string;
  letterheadUrl?: string;
  signatureUrl?: string;
  phone: string;
  email: string;
  address: string;
  defaultCurrency: string;
  defaultVatRate: number;
  updatedAt: string;
}

export type ReportingDateMode = 'issued' | 'sent' | 'service_period';

export interface MonthlyHistoryFilter {
  year?: number;
  month?: number; // 1-12
  clientId?: string;
  billingEntityId?: string;
  invoiceStatus?: InvoiceStatus;
  sentStatus?: SentStatus;
  paymentStatus?: PaymentStatus;
  searchQuery?: string;
  dateMode?: ReportingDateMode;
  startDate?: string;
  endDate?: string;
}

export interface DashboardKPIs {
  totalClients: number;
  invoicesThisMonth: number;
  totalInvoicedThisMonth: number;
  invoicesSentThisMonth: number;
  outstandingAmount: number;
  paidAmount: number;
  overdueInvoicesCount: number;
}

