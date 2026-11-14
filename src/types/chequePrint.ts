export type A4Orientation = 'portrait' | 'landscape';
export type RotationAngle = 0 | 90 | 180 | 270;
export type FeedDirection = 'top' | 'bottom' | 'left' | 'right' | 'manual_center';

export interface ChequeFieldConfig {
  id?: string;
  name?: string;
  x: number; // mm relative to cheque top-left
  y: number; // mm relative to cheque top-left
  width: number; // mm
  height?: number; // mm
  fontSize: number; // pt
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  prefix?: string;
  suffix?: string;
  letterSpacing?: number; // mm
  isVisible: boolean;
  isLocked: boolean;
}

export interface ChequePrintFields {
  date: ChequeFieldConfig;
  payee: ChequeFieldConfig;
  amountWords: ChequeFieldConfig & { maxLines?: number; lineHeight?: number };
  amountFigures: ChequeFieldConfig;
  crossing: ChequeFieldConfig & { text?: string; style?: 'parallel_lines' | 'text_only' | 'box'; angle?: number };
  bearerStrike?: ChequeFieldConfig;
}

export interface ChequePrintTemplate {
  id: string;
  bankName: string;
  templateName: string;
  chequeWidth: number; // mm (default 178)
  chequeHeight: number; // mm (default 89)
  a4Orientation: A4Orientation;
  a4Rotation: RotationAngle;
  chequeRotation: RotationAngle;
  feedDirection: FeedDirection;
  chequeX: number; // mm from A4 top-left
  chequeY: number; // mm from A4 top-left
  fields: ChequePrintFields;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChequePrinterProfile {
  id: string;
  name: string;
  offsetX: number; // mm
  offsetY: number; // mm
  rotationCorrection: RotationAngle;
  feedNotes?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChequePrintJob {
  id: string;
  chequeId?: string;
  templateId?: string;
  printerProfileId?: string;
  printType: 'test' | 'final';
  printedAt: string;
  settingsSnapshot?: any;
}

export interface ChequePrintPayload {
  chequeId?: string;
  template: ChequePrintTemplate;
  printerProfile: ChequePrinterProfile;
  liveData: {
    chequeNumber: string;
    date: string;
    payeeName: string;
    amountFigures: string;
    amountWords: string;
    crossingText?: string;
  };
  printType: 'test' | 'final';
}

