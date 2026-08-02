import { PAYMENT_MODEL_LETTER, type ServiceAgreement, type TariffRow } from './types';

/** Shablon matnida ishlatiladigan barcha token — boshqasi yozilsa TypeScript ushlaydi */
export interface AgreementTokens {
  agreementNumber: string;
  agreementDate: string;
  signingPlace: string;

  customerName: string;
  customerInn: string;
  customerAddress: string;
  customerDirector: string;
  customerDirectorBasis: string;
  customerBankName: string;
  customerBankAccount: string;
  customerMfo: string;
  customerOked: string;
  customerPhone: string;
  customerEmail: string;

  executorName: string;
  executorInn: string;
  executorAddress: string;
  executorDirector: string;
  executorBankName: string;
  executorBankAccount: string;
  executorMfo: string;
  executorOked: string;
  executorPhone: string;
  executorEmail: string;

  paymentModelLetter: 'A' | 'B' | 'C' | 'D';
  monthlyDueDay: string;
  perCountThreshold: string;
  perCountDueDays: string;
  perAmountThreshold: string;
  perAmountDueDays: string;
  creditLimit: string;
  prepaidRevertDays: string;
  mainTariffBhm: string;
  mainTariffUzs: string;
  jurisdictionCourt: string;
  /** Bo'sh bo'lsa 2.3-bandning ikkinchi gapi PDF'dan tushadi */
  brokerRegistryNumber: string;

  /** Jadval bloklari uchun — matn tokeni emas */
  tariffs: TariffRow[];
  paymentModel: ServiceAgreement['paymentModel'];
  vatPayer: boolean;
}

/** `20 000 000` — uzluksiz probel, PDF'da qator o'rtasida uzilmasin */
export function formatMoney(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Bo'sh qiymat o'rniga chiziqcha — shartnomada bo'sh joy qolmasligi kerak */
const dash = (value: string | null | undefined): string => (value && value.trim() ? value : '—');

const numText = (value: number | null | undefined): string => (value == null ? '—' : String(value));

/** `2026-03-12T00:00:00.000Z` → `12.03.2026` */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

/**
 * Shartnoma yozuvini shablon tokenlariga aylantiradi.
 * `bhmUzs` — shartnoma sanasida amalda bo'lgan BHM (5.3-band).
 */
export function buildTokens(a: ServiceAgreement, bhmUzs: number): AgreementTokens {
  const tariffBhm = Number(a.mainTariffBhm);
  return {
    agreementNumber: a.agreementNumber,
    agreementDate: formatDate(a.agreementDate),
    signingPlace: a.signingPlace,

    customerName: a.customerName,
    customerInn: dash(a.customerInn),
    customerAddress: dash(a.customerAddress),
    customerDirector: dash(a.customerDirector),
    customerDirectorBasis: dash(a.customerDirectorBasis),
    customerBankName: dash(a.customerBankName),
    customerBankAccount: dash(a.customerBankAccount),
    customerMfo: dash(a.customerMfo),
    customerOked: dash(a.customerOked),
    customerPhone: dash(a.customerPhone),
    customerEmail: dash(a.customerEmail),

    executorName: a.executorName,
    executorInn: dash(a.executorInn),
    executorAddress: dash(a.executorAddress),
    executorDirector: dash(a.executorDirector),
    executorBankName: dash(a.executorBankName),
    executorBankAccount: dash(a.executorBankAccount),
    executorMfo: dash(a.executorMfo),
    executorOked: dash(a.executorOked),
    executorPhone: dash(a.executorPhone),
    executorEmail: dash(a.executorEmail),

    paymentModelLetter: PAYMENT_MODEL_LETTER[a.paymentModel],
    monthlyDueDay: numText(a.monthlyDueDay),
    perCountThreshold: numText(a.perCountThreshold),
    perCountDueDays: numText(a.perCountDueDays),
    perAmountThreshold: a.perAmountThreshold ? formatMoney(Number(a.perAmountThreshold)) : '—',
    perAmountDueDays: numText(a.perAmountDueDays),
    creditLimit: a.creditLimit ? formatMoney(Number(a.creditLimit)) : '—',
    prepaidRevertDays: String(a.prepaidRevertDays),
    mainTariffBhm: String(tariffBhm),
    mainTariffUzs: formatMoney(tariffBhm * bhmUzs),
    jurisdictionCourt: dash(a.jurisdictionCourt),
    // Bu yerda `dash` ISHLATILMAYDI: bo'sh qiymat 2.3-bandni o'chirish signali
    brokerRegistryNumber: a.brokerRegistryNumber?.trim() ?? '',

    tariffs: a.tariffs,
    paymentModel: a.paymentModel,
    vatPayer: a.vatPayer,
  };
}