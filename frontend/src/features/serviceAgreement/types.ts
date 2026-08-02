export type PaymentModel = 'PREPAID' | 'MONTHLY' | 'PER_COUNT' | 'PER_AMOUNT';
export type AgreementStatus = 'DRAFT' | 'ACTIVE' | 'TERMINATED';

/** Model → shartnoma matnidagi harf (5.5.1-band jadvali) */
export const PAYMENT_MODEL_LETTER: Record<PaymentModel, 'A' | 'B' | 'C' | 'D'> = {
  PREPAID: 'A',
  MONTHLY: 'B',
  PER_COUNT: 'C',
  PER_AMOUNT: 'D',
};

export const PAYMENT_MODEL_LABEL: Record<PaymentModel, string> = {
  PREPAID: 'A — Oldindan to\'lov',
  MONTHLY: 'B — Oylik (postpayd)',
  PER_COUNT: 'C — Xizmat soni bo\'yicha',
  PER_AMOUNT: 'D — Summa bo\'yicha',
};

export const STATUS_LABEL: Record<AgreementStatus, string> = {
  DRAFT: 'Qoralama',
  ACTIVE: 'Faol',
  TERMINATED: 'Bekor',
};

export interface TariffRow {
  name: string;
  unit: string;
  bhm: number;
}

export interface ServiceAgreement {
  id: number;
  clientId: number;
  agreementNumber: string;
  agreementDate: string;
  templateVersion: string;
  status: AgreementStatus;
  terminatedAt: string | null;
  terminationReason: string | null;

  customerName: string;
  customerInn: string | null;
  customerAddress: string | null;
  customerDirector: string | null;
  customerDirectorBasis: string | null;
  customerBankName: string | null;
  customerBankAccount: string | null;
  customerMfo: string | null;
  customerOked: string | null;
  customerPhone: string | null;
  customerEmail: string | null;

  executorName: string;
  executorInn: string | null;
  executorAddress: string | null;
  executorDirector: string | null;
  executorBankName: string | null;
  executorBankAccount: string | null;
  executorMfo: string | null;
  executorOked: string | null;
  executorPhone: string | null;
  executorEmail: string | null;

  paymentModel: PaymentModel;
  monthlyDueDay: number | null;
  perCountThreshold: number | null;
  perCountDueDays: number | null;
  perAmountThreshold: string | null;
  perAmountDueDays: number | null;
  creditLimit: string | null;
  prepaidRevertDays: number;
  mainTariffBhm: string;
  tariffs: TariffRow[];
  vatPayer: boolean;
  jurisdictionCourt: string | null;
  brokerRegistryNumber: string | null;
  signingPlace: string;
  includeSeal: boolean;
}

export interface AgreementListResponse {
  items: ServiceAgreement[];
  total: number;
  page: number;
  limit: number;
}

/** Formadan yuboriladigan ma'lumot — server default beradigan maydonlar ixtiyoriy */
export type AgreementInput = Omit<
  ServiceAgreement,
  'id' | 'terminatedAt' | 'terminationReason' | 'perAmountThreshold' | 'creditLimit' | 'mainTariffBhm'
> & {
  perAmountThreshold?: number;
  creditLimit?: number;
  mainTariffBhm: number;
};
