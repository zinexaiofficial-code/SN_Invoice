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

export interface EntitySignatureSettings {
  id?: string;
  entityId: string;
  signatoryName: string;
  signatoryDesignation: string;
  signatoryEmail?: string;
  signatureImageUrl?: string;
  signatureEnabled: boolean;
  displaySignatureImage: boolean;
  verificationEnabled: boolean;
  showQrCode: boolean;
  updatedAt?: string;
}

export interface InvoiceApproval {
  id: string;
  invoiceId: string;
  entityId: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  signatoryNameSnapshot: string;
  signatoryDesignationSnapshot: string;
  signatoryEmailSnapshot?: string;
  approvalTimestamp: string;
  approvalTimezone: string;
  invoiceVersion: number;
  status: 'approved' | 'voided' | 'superseded';
  approvalAction: string;
  createdAt: string;
}

export interface InvoiceVerification {
  id: string;
  invoiceId: string;
  verificationToken: string;
  verificationTokenHash: string;
  verificationStatus: 'valid' | 'voided' | 'superseded' | 'revoked';
  issuedSnapshotHash: string;
  createdAt: string;
  revokedAt?: string;
}

export type InvoicePdfFormat = 'digital' | 'print' | 'blank';

export interface VerificationResult {
  success: boolean;
  status: 'valid' | 'voided' | 'superseded' | 'invalid';
  invoiceNumber?: string;
  issuingCompany?: string;
  issuingLegalName?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatoryEmail?: string;
  invoiceIssueDate?: string;
  approvalDate?: string;
  approvalTime?: string;
  approvalTimestamp?: string;
  verificationToken?: string;
  canonicalHash?: string;
  hashMatch?: boolean;
  message: string;
  reissueDetails?: string;
}

export type FontSizePreset = 'smart' | 'manual';
export type LayoutDensity = 'comfortable' | 'balanced' | 'compact';

export interface PdfTypographySettings {
  mode: FontSizePreset; // 'smart' | 'manual'
  density: LayoutDensity; // 'comfortable' | 'balanced' | 'compact'
  titleSizePt: number; // 14–22 pt (default 18)
  headerSizePt: number; // 11–18 pt (default 13)
  sectionHeadingPt: number; // 10–12 pt (default 10.5)
  tableHeaderPt: number; // 8–12 pt (default 9.5)
  bodySizePt: number; // 8–13 pt (default 10)
  descriptionSizePt: number; // 8–12 pt (default 9)
  footerSizePt: number; // 8–11 pt (default 9)
  showPageNumbers?: boolean; // default true
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
  signatoryEmail?: string;
  signatureEnabled?: boolean;
  displaySignatureImage?: boolean;
  verificationEnabled?: boolean;
  showQrCode?: boolean;
  signatureImageUrl?: string;
  signatureSettings?: EntitySignatureSettings;
  defaultPdfLayout?: PdfTypographySettings;

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

export type ServiceCategory =
  | 'Radio / FM Advertising'
  | 'Television Advertising'
  | 'Digital Advertising'
  | 'Sponsorship'
  | 'Media Production'
  | 'Other Services';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Radio / FM Advertising',
  'Television Advertising',
  'Digital Advertising',
  'Sponsorship',
  'Media Production',
  'Other Services',
];

export type AdvertisingReferenceType =
  | 'RO Number'
  | 'Booking Reference'
  | 'Spot ID'
  | 'Campaign Reference'
  | 'Other / Custom';

export const REFERENCE_TYPES: AdvertisingReferenceType[] = [
  'RO Number',
  'Booking Reference',
  'Spot ID',
  'Campaign Reference',
  'Other / Custom',
];

export interface MediaChannel {
  id: string;
  name: string;
  type?: 'radio' | 'tv' | 'digital' | 'other';
  isCustom?: boolean;
  createdAt?: string;
}

export interface Service {
  id: string;
  name: string;
  category?: ServiceCategory;
  defaultMediaChannel?: string;
  defaultReferenceType?: AdvertisingReferenceType;
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
  category?: ServiceCategory;
  mediaChannel?: string;
  referenceType?: AdvertisingReferenceType;
  referenceNumber?: string;
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
  signatureImageUrl?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatoryEmail?: string;
  signatureEnabled?: boolean;
  displaySignatureImage?: boolean;
  verificationEnabled?: boolean;
  showQrCode?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
  prefix?: string;
  pdfLayout?: PdfTypographySettings;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  billingEntityId: string;
  templateId?: string;
  templateKey?: InvoiceTemplateKey;
  status: InvoiceStatus;

  // Dates & Optional Service Period
  invoiceDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  issuedAt?: string;
  sentAt?: string;
  paidAt?: string;
  includeServicePeriod?: boolean;
  servicePeriodStart?: string;
  servicePeriodEnd?: string;
  servicePeriodText?: string;

  // References
  product?: string;
  regNo?: string;
  yourRef?: string;

  // Financials & VAT Presentation
  subtotal: number;
  vatApplicable: boolean;
  vatRate: number;
  vatAmount: number;
  taxableBase?: number;
  showVatSeparately?: boolean; // default: true (MODE A). If false: MODE B (Total Including VAT without separate line)
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
  mediaRefDisplay?: 'separate' | 'inline';
  payments: Payment[];
  shareHistory: InvoiceShareRecord[];

  // Digital Approval & Verification
  signatureFormat?: InvoicePdfFormat;
  approval?: InvoiceApproval;
  verification?: InvoiceVerification;
  verificationToken?: string;
  verificationStatus?: 'valid' | 'voided' | 'superseded' | 'revoked';
  canonicalHash?: string;
  pdfLayout?: PdfTypographySettings;

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

// ==========================================
// CHEQUE MANAGEMENT & SMART REMINDER MODULE
// ==========================================

export type ChequeType = 'incoming' | 'outgoing';

export type IncomingChequeStatus =
  | 'received'
  | 'pending_deposit'
  | 'deposited'
  | 'cleared'
  | 'returned'
  | 'cancelled'
  | 'replaced';

export type OutgoingChequeStatus =
  | 'prepared'
  | 'issued'
  | 'pending_presentation'
  | 'presented'
  | 'cleared'
  | 'returned'
  | 'cancelled';

export type ChequeStatus = IncomingChequeStatus | OutgoingChequeStatus;

export type ChequeAlertState =
  | 'upcoming'
  | 'due_today'
  | 'overdue'
  | 'action_required'
  | 'cleared'
  | 'normal';

export interface ChequeInvoiceAllocation {
  id: string;
  chequeId: string;
  invoiceId: string;
  invoiceNumber: string;
  allocatedAmount: number;
  createdAt: string;
}

export interface ChequeStatusHistory {
  id: string;
  chequeId: string;
  previousStatus?: ChequeStatus;
  newStatus: ChequeStatus;
  changedAt: string;
  changedBy?: string;
  notes?: string;
  returnReason?: string;
  bankCharges?: number;
  followUpDate?: string;
  replacementChequeRef?: string;
}

export interface ChequeAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
}

export interface ChequeReminder {
  id: string;
  chequeId: string;
  reminderDate: string; // YYYY-MM-DD
  reminderType:
  | 'due_7_days'
  | 'due_3_days'
  | 'due_1_day'
  | 'due_today'
  | 'overdue'
  | 'deposit_followup'
  | 'returned_action';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  isDismissed: boolean;
  snoozedUntil?: string; // ISO date-time string
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  deliveredAt?: string;
  createdAt: string;
}

export interface Cheque {
  id: string;
  type: ChequeType;
  chequeNumber: string;
  amount: number;
  currency: string; // default 'LKR'
  chequeDate: string; // YYYY-MM-DD on the physical cheque
  receivedOrIssuedDate: string; // YYYY-MM-DD date handed over/received
  expectedActionDate: string; // expected deposit date (incoming) or expected presentation date (outgoing)
  actualClearanceDate?: string;

  // Banking & Party Details
  drawerBank: string; // e.g. Commercial Bank, Seylan Bank, HNB
  branch?: string;
  bankAccountId?: string; // Entity bank account for deposit target or issuing
  bankAccountNumber?: string;
  payerOrPayeeName: string; // Client name or supplier name
  clientId?: string; // Linked client if incoming
  supplierName?: string; // Supplier/Vendor if outgoing

  // Billing Entity
  billingEntityId: string;
  billingEntityName?: string;
  billingEntityPrefix?: string;

  // Status & Alerts
  status: ChequeStatus;
  alertState?: ChequeAlertState;

  // Purpose & References
  purposeOfPayment?: string;
  billReference?: string;
  notes?: string;

  // Attachments (Front & Back cheque images)
  imageFrontUrl?: string;
  imageBackUrl?: string;
  attachments: ChequeAttachment[];

  // Relations
  invoiceAllocations: ChequeInvoiceAllocation[];
  statusHistory: ChequeStatusHistory[];
  reminders: ChequeReminder[];

  // Reminder Configuration
  isReminderEnabled: boolean;
  reminderStartDate?: string;
  customReminderDays?: number[]; // e.g. [7, 3, 1, 0]

  // Returned Cheque Specifics
  followUpDate?: string;
  returnReason?: string;
  bankCharges?: number;
  replacementChequeId?: string;
  replacementChequeRef?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ChequeFilter {
  type?: 'all' | ChequeType;
  entityId?: string;
  status?: string;
  alertState?: string;
  bank?: string;
  searchQuery?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
}

export interface ChequeKPIs {
  totalIncomingAmount: number;
  totalOutgoingAmount: number;
  pendingChequesCount: number;
  pendingChequesAmount: number;
  due7DaysCount: number;
  due7DaysAmount: number;
  overdueCount: number;
  overdueAmount: number;
  clearedCount: number;
  clearedAmount: number;
  returnedCount: number;
  returnedAmount: number;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  emailRecipient: string;
  pushEnabled: boolean;
  dailySummaryTime: string; // '09:00'
  alertOnOverdue: boolean;
  alertOnReturned: boolean;
  timezone: string; // 'Asia/Colombo'
}


