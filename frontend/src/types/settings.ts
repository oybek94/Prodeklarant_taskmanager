export interface PackagingTypeItem {
  id: string;
  name: string;
  code?: string;
}

export interface BXMConfig {
  id: number;
  amountUsd: number;
  amountUzs: number;
  effectiveFrom: string;
  note?: string;
  createdAt: string;
}

export interface StatePayment {
  id: number;
  certificatePayment: number;
  psrPrice: number;
  workerPrice: number;
  customsPayment: number;
  st1Payment: number;
  fitoPayment: number;
  fumigationPayment: number;
  internalCertPayment: number;
  certificatePaymentUsd?: number;
  certificatePaymentUzs?: number;
  psrPriceUsd?: number;
  psrPriceUzs?: number;
  workerPriceUsd?: number;
  workerPriceUzs?: number;
  customsPaymentUsd?: number;
  customsPaymentUzs?: number;
  st1PaymentUsd?: number;
  st1PaymentUzs?: number;
  fitoPaymentUsd?: number;
  fitoPaymentUzs?: number;
  fumigationPaymentUsd?: number;
  fumigationPaymentUzs?: number;
  internalCertPaymentUsd?: number;
  internalCertPaymentUzs?: number;
  createdAt: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface CompanySettings {
  id: number;
  name: string;
  legalAddress: string;
  actualAddress: string;
  inn?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  bankAddress?: string;
  bankAccount?: string;
  swiftCode?: string;
  correspondentBank?: string;
  correspondentBankAddress?: string;
  correspondentBankSwift?: string;
}

export interface CertifierFeeConfig {
  id: number;
  branchId: number;
  branch?: { id: number; name: string };
  st1Rate: number;
  fitoRate: number;
  aktRate: number;
  fumigationRate: number;
  hiredWorkerRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface YearlyGoalConfig {
  id: number;
  year: number;
  targetTasks: number;
  createdAt: string;
  updatedAt: string;
}

export interface KpiConfig {
  id: number;
  stageName: string;
  price: number;
  effectiveFrom: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegionCode {
  id: number;
  name: string;
  internalCode: string;
  externalCode: string;
  createdAt: string;
}

export interface ProcessSetting {
  id: number;
  processType: 'TIR' | 'CERT' | 'DECLARATION';
  estimatedTime: number;
  reminder1: number;
  reminder2: number;
  reminder3: number;
  updatedAt: string;
}

export const PROCESS_TYPE_LABELS: Record<string, string> = {
  TIR: 'TIR-SMR',
  CERT: 'Zayavka',
  DECLARATION: 'Deklaratsiya',
};

export const STAGE_PRICE_DEFAULTS = [
  { stageName: 'Invoys', price: 3.0 },
  { stageName: 'Zayavka', price: 3.0 },
  { stageName: 'TIR-SMR', price: 1.5 },
  { stageName: 'Sertifikat olib chiqish', price: 1.25 },
  { stageName: 'Deklaratsiya', price: 2.0 },
  { stageName: 'Tekshirish', price: 2.0 },
  { stageName: 'Topshirish', price: 1.25 },
  { stageName: 'Pochta', price: 1.0 },
];
