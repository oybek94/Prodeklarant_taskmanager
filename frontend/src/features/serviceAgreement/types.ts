export type PaymentModel = 'PREPAID' | 'MONTHLY' | 'PER_COUNT' | 'PER_AMOUNT';
export type AgreementStatus = 'DRAFT' | 'ACTIVE' | 'TERMINATED';

/**
 * Narx qanday belgilanishi. `BHM` — BHM ga nisbatan koeffitsient (narx BHM
 * o'zgarganda avtomatik qayta hisoblanadi), `FIXED` — so'mdagi qat'iy summa
 * (BHM o'zgarishi ta'sir qilmaydi). Shartnoma matni ham shu tanlovga qarab
 * o'zgaradi, shuning uchun qiymat butun hujjatga taalluqli.
 */
export type PricingMode = 'BHM' | 'FIXED';

export const PRICING_MODE_LABEL: Record<PricingMode, string> = {
  BHM: 'BHM koeffitsienti',
  FIXED: 'Qat\'iy summa (so\'m)',
};

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
  /**
   * So'mdagi qat'iy narx — faqat `pricingMode === 'FIXED'` shartnomalarda
   * o'qiladi. `bhm` bilan bir vaqtda to'lgan bo'lishi mumkin (rejim
   * almashtirilganda eski qiymat o'chirilmaydi), qaysi biri hujjatga
   * chiqishini rejim hal qiladi.
   */
  uzs?: number;
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
  /** Erkin, ko'p qatorli rekvizitlar bloki — PDF'ning 13-bo'limi uchun */
  customerRequisites: string | null;

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
  pricingMode: PricingMode;
  mainTariffBhm: string;
  /** BYuD uchun so'mdagi qat'iy narx — `pricingMode === 'FIXED'` da majburiy */
  mainTariffUzs: string | null;
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
  | 'id' | 'terminatedAt' | 'terminationReason' | 'perAmountThreshold' | 'creditLimit'
  | 'mainTariffBhm' | 'mainTariffUzs'
> & {
  perAmountThreshold?: number;
  creditLimit?: number;
  mainTariffBhm: number;
  mainTariffUzs?: number;
};
