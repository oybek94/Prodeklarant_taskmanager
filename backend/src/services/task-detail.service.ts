import { Currency, Prisma, StatePayment } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../prisma';
import { getExchangeRate } from './exchange-rate';
import { calculateAmountUzs } from './monetary-validation';
import { shouldDeductGovernmentFees, computeContractPaymentSplit } from './contract-payment-split';

/**
 * Vazifa kartochkasi — GET /tasks/:id.
 *
 * To'liq rejimda vazifa + moliyaviy hisobot (barcha summalar so'mda, vazifa
 * yaratilgan paytdagi snapshot'lardan). Hisobot sof funksiyada
 * (computeFinancialReport); tashqi ma'lumot (davlat to'lovi, sertifikatchi
 * narxlari, kurs) oldindan olinib beriladi.
 */

// ─── Yengil rejim (Invoys sahifasi) ────────────────────────────────

export function getTaskLight(id: number) {
  return prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      comments: true,
      hasPsr: true,
      driverPhone: true,
      clientId: true,
      branchId: true,
      createdAt: true,
      client: { select: { id: true, name: true, contractNumber: true } },
      branch: {
        select: {
          id: true,
          name: true,
          regionText: true,
          defaultRegionCode: { select: { id: true, name: true, internalCode: true, externalCode: true } },
        },
      },
      stages: { select: { name: true, status: true }, orderBy: { stageOrder: 'asc' } },
      errors: { select: { id: true } },
    },
  });
}

// ─── To'liq rejim ──────────────────────────────────────────────────

const userBrief = { select: { id: true, name: true, email: true } } as const;

const taskDetailInclude = {
  client: true,
  branch: true,
  invoice: {
    select: {
      contractNumber: true,
      contract: { select: { contractNumber: true, contractDate: true, emails: true } },
    },
  },
  createdBy: userBrief,
  updatedBy: userBrief,
  stages: {
    orderBy: { stageOrder: 'asc' },
    include: { assignedTo: { select: { id: true, name: true, email: true, role: true } } },
  },
  errors: true,
  transactions: true,
  // Bitta so'rov: hisobot uchun role, javob uchun id/name/email (oldin ikki marta o'qilardi)
  kpiLogs: {
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  },
} satisfies Prisma.TaskInclude;

export type TaskDetailRow = Prisma.TaskGetPayload<{ include: typeof taskDetailInclude }>;

export interface FinancialReport {
  dealAmountBase: number;
  dealAmount: number;
  certifierFee: number;
  statePayment: number;
  declarationPayment: number;
  hiredWorkerPayment: number;
  contractPaymentType: string;
  cashAmount: number;
  transferAmount: number;
  netProfit: number;
}

/** Kurs manbai — testda almashtiriladi */
export type RateLookup = (date: Date) => Promise<Decimal>;
const cbuUsdRate: RateLookup = (date) => getExchangeRate(date, 'USD', 'UZS');

const numOrNull = (v: Prisma.Decimal | null | undefined): number | null => (v != null ? Number(v) : null);

/** Davlat to'lovi summasini so'mga: UZS bo'lsa to'g'ridan, USD bo'lsa tayyor so'm qiymati yoki kurs bo'yicha */
function resolvePaymentUzs(
  amountOriginal: number | null,
  amountUzs: number | null,
  currency: Currency,
  exchangeRate: Prisma.Decimal | number | null | undefined
): number {
  if (currency === 'UZS') return Number(amountUzs ?? amountOriginal ?? 0);
  if (amountUzs != null) return Number(amountUzs);
  const rate = exchangeRate ? new Decimal(exchangeRate) : new Decimal(1);
  return Number(calculateAmountUzs(Number(amountOriginal ?? 0), 'USD', rate));
}

/** KPI yozuvi summasi so'mda */
function kpiLogUzs(log: TaskDetailRow['kpiLogs'][number], task: TaskDetailRow): number {
  if (log.currency === 'UZS' || log.amount_uzs != null || log.convertedUzsAmount != null) {
    return Number(log.amount_uzs ?? log.convertedUzsAmount ?? log.amount);
  }
  const rate = Number(log.exchange_rate ?? log.exchangeRate ?? task.snapshotDealAmount_exchange_rate ?? task.snapshotDealAmountExchangeRate ?? 1);
  return Number(log.amount) * rate;
}

/** Admin rolidagi xodimlar KPI'si so'mda */
export function adminEarnedUzs(task: TaskDetailRow): number {
  return task.kpiLogs
    .filter((log) => log.user?.role === 'ADMIN')
    .reduce((sum, log) => sum + kpiLogUzs(log, task), 0);
}

/** Shartnoma summasi so'mda: vazifa snapshot'i → mijozning joriy summasi (eski vazifalar uchun) */
async function dealAmountUzs(task: TaskDetailRow, dealCurrency: Currency, rateAt: RateLookup): Promise<number> {
  if (task.snapshotDealAmount_amount_uzs) return Number(task.snapshotDealAmount_amount_uzs);
  if (task.snapshotDealAmount) {
    const amount = Number(task.snapshotDealAmount);
    if (dealCurrency === 'USD' && task.snapshotDealAmount_exchange_rate) return amount * Number(task.snapshotDealAmount_exchange_rate);
    if (dealCurrency === 'USD' && task.snapshotDealAmountExchangeRate) return amount * Number(task.snapshotDealAmountExchangeRate);
    return amount; // so'mda yoki kurs yo'q (so'm deb olinadi)
  }
  const client = task.client;
  if (client.dealAmount_amount_uzs) return Number(client.dealAmount_amount_uzs);
  if (!client.dealAmount) return 0;

  const amount = Number(client.dealAmount);
  if (dealCurrency !== 'USD') return amount;
  if (client.dealAmount_exchange_rate) return amount * Number(client.dealAmount_exchange_rate);
  if (client.dealAmountExchangeRate) return amount * Number(client.dealAmountExchangeRate);
  try {
    return amount * Number(await rateAt(new Date(task.createdAt)));
  } catch (error) {
    console.error('Failed to get historical exchange rate for deal amount:', error);
    return amount; // DIQQAT: kurs yo'q bo'lsa USD so'm deb olinadi (eski xatti-harakat)
  }
}

/** PSR qo'shimchasi: 10 (USD mijozda 10 USD so'mga o'girilgan) */
async function psrUzs(task: TaskDetailRow, dealCurrency: Currency, rateAt: RateLookup): Promise<number> {
  if (!task.hasPsr) return 0;
  if (dealCurrency !== 'USD') return 10;
  let rate: Decimal;
  if (task.snapshotDealAmount_exchange_rate) rate = new Decimal(task.snapshotDealAmount_exchange_rate);
  else if (task.snapshotDealAmountExchangeRate) rate = new Decimal(task.snapshotDealAmountExchangeRate);
  else if (task.client.dealAmount_exchange_rate) rate = new Decimal(task.client.dealAmount_exchange_rate);
  else if (task.client.dealAmountExchangeRate) rate = new Decimal(task.client.dealAmountExchangeRate);
  else {
    try {
      rate = await rateAt(new Date(task.createdAt));
    } catch (error) {
      console.error('Failed to get exchange rate for PSR amount:', error);
      rate = new Decimal(1);
    }
  }
  return Number(calculateAmountUzs(10, 'USD', rate));
}

/**
 * Sertifikat va Deklaratsiya (bojxona) to'lovi so'mda.
 * Snapshot bo'lsa undan; bo'lmasa vazifa yaratilgunga qadar eng so'nggi davlat to'lovidan.
 */
function governmentFeesUzs(task: TaskDetailRow, dealCurrency: Currency, statePayment: StatePayment | null) {
  if (task.snapshotCertificatePayment != null) {
    const snapshotRate = task.snapshotCertificatePayment_exchange_rate || task.snapshotDealAmount_exchange_rate || task.snapshotDealAmountExchangeRate;
    return {
      certificate: resolvePaymentUzs(
        Number(task.snapshotCertificatePayment),
        numOrNull(task.snapshotCertificatePayment_amount_uzs),
        task.snapshotCertificatePayment_currency || dealCurrency,
        snapshotRate
      ),
      customs: resolvePaymentUzs(
        Number(task.snapshotCustomsPayment || 0),
        numOrNull(task.snapshotCustomsPayment_amount_uzs),
        task.snapshotCustomsPayment_currency || dealCurrency,
        task.snapshotCustomsPayment_exchange_rate || snapshotRate
      ),
    };
  }
  if (!statePayment) return { certificate: 0, customs: 0 };

  const currency: Currency = dealCurrency === 'UZS' ? 'UZS' : 'USD';
  const fallbackRate = task.snapshotDealAmount_exchange_rate || task.snapshotDealAmountExchangeRate || 1;
  const pick = (original: Prisma.Decimal | null, uzs: Prisma.Decimal | null, base: Prisma.Decimal) =>
    resolvePaymentUzs(
      currency === 'USD' ? Number(original ?? base) : Number(uzs ?? base),
      numOrNull(uzs),
      currency,
      fallbackRate
    );
  return {
    certificate: pick(statePayment.certificatePayment_amount_original, statePayment.certificatePayment_amount_uzs, statePayment.certificatePayment),
    customs: pick(statePayment.customsPayment_amount_original, statePayment.customsPayment_amount_uzs, statePayment.customsPayment),
  };
}

/**
 * Vazifaning moliyaviy hisoboti (so'mda).
 * @param statePayment vazifa yaratilgunga qadar eng so'nggi davlat to'lovi
 * @param certifierRates filialning o'sha paytdagi CertifierFeeConfig'i
 */
export async function computeFinancialReport(
  task: TaskDetailRow,
  statePayment: StatePayment | null,
  certifierRates: { st1Rate: Prisma.Decimal; fitoRate: Prisma.Decimal; aktRate: Prisma.Decimal; fumigationRate: Prisma.Decimal } | null,
  rateAt: RateLookup = cbuUsdRate
): Promise<FinancialReport> {
  const dealCurrency: Currency = task.client.dealAmount_currency || task.client.dealAmountCurrency || 'USD';

  const deal = await dealAmountUzs(task, dealCurrency, rateAt);
  const fees = governmentFeesUzs(task, dealCurrency, statePayment);
  const psr = await psrUzs(task, dealCurrency, rateAt);
  const totalDeal = deal + psr;

  // snapshotCustomsPayment ga BXM koeffitsienti allaqachon ko'paytirilgan, snapshotDealAmount ga
  // esa (koef − 1) summasi qo'shilgan (bosqich TAYYOR bo'lganda). "Asosiy shartnoma" uchun ayiramiz.
  let extraDeclarationUzs = 0;
  if (task.customsPaymentMultiplier != null && Number(task.customsPaymentMultiplier) > 1) {
    const mult = Number(task.customsPaymentMultiplier);
    extraDeclarationUzs = (fees.customs / mult) * (mult - 1);
  }

  // Haqiqiy davlat to'lovlari (ST-1, FITO, fumigatsiya, ichki sertifikat)
  let stateUzs: number;
  if (statePayment) {
    stateUzs = Number(statePayment.st1Payment_amount_uzs ?? statePayment.st1Payment ?? 0)
      + Number(statePayment.fitoPayment_amount_uzs ?? statePayment.fitoPayment ?? 0)
      + Number(statePayment.fumigationPayment_amount_uzs ?? statePayment.fumigationPayment ?? 0)
      + Number(statePayment.internalCertPayment_amount_uzs ?? statePayment.internalCertPayment ?? 0);
    if ((statePayment.currency || 'USD') === 'USD') {
      stateUzs *= Number(task.snapshotDealAmount_exchange_rate || task.snapshotDealAmountExchangeRate || 1);
    }
  } else {
    stateUzs = fees.certificate;
  }

  const certifierUzs = certifierRates
    ? Number(certifierRates.st1Rate || 0) + Number(certifierRates.fitoRate || 0)
      + Number(certifierRates.aktRate || 0) + Number(certifierRates.fumigationRate || 0)
    : 0;

  let hiredWorkerUzs = 0;
  let adminUzs = 0;
  for (const log of task.kpiLogs) {
    const uzs = kpiLogUzs(log, task);
    if (log.user?.role === 'ADMIN') adminUzs += uzs;
    else hiredWorkerUzs += uzs;
  }

  // CASH_ALL_INCLUSIVE dan boshqasida davlat to'lovini mijoz o'zi to'laydi — foydadan ayirilmaydi
  const contractPaymentType = task.snapshotContractPaymentType || task.client.contractPaymentType || 'CASH_ALL_INCLUSIVE';
  const deduct = shouldDeductGovernmentFees(contractPaymentType);
  const transferConfigUzs = task.snapshotServiceFeeTransferUzs != null
    ? Number(task.snapshotServiceFeeTransferUzs)
    : (task.client.serviceFeeTransferUzs != null ? Number(task.client.serviceFeeTransferUzs) : null);
  const { cashAmount, transferAmount } = computeContractPaymentSplit(contractPaymentType, totalDeal, transferConfigUzs);

  return {
    dealAmountBase: totalDeal - extraDeclarationUzs - psr,
    dealAmount: totalDeal,
    certifierFee: certifierUzs,
    statePayment: stateUzs,
    declarationPayment: fees.customs,
    hiredWorkerPayment: hiredWorkerUzs,
    contractPaymentType,
    cashAmount,
    transferAmount,
    netProfit: totalDeal - certifierUzs - (deduct ? stateUzs : 0) - (deduct ? fees.customs : 0) - hiredWorkerUzs - adminUzs,
  };
}

/** GET /tasks/:id javobi; vazifa topilmasa null */
export async function getTaskDetail(id: number, rateAt: RateLookup = cbuUsdRate) {
  const task = await prisma.task.findUnique({ where: { id }, include: taskDetailInclude });
  if (!task) return null;

  const createdAt = new Date(task.createdAt);
  const [statePayment, certifierRates] = await Promise.all([
    prisma.statePayment.findFirst({ where: { createdAt: { lte: createdAt } }, orderBy: { createdAt: 'desc' } }),
    prisma.certifierFeeConfig.findFirst({
      where: { branchId: task.branchId, createdAt: { lte: createdAt } },
      orderBy: { createdAt: 'desc' },
      select: { st1Rate: true, fitoRate: true, aktRate: true, fumigationRate: true },
    }),
  ]);

  let financialReport: FinancialReport | undefined;
  try {
    financialReport = await computeFinancialReport(task, statePayment, certifierRates, rateAt);
  } catch (error) {
    console.error('Error calculating net profit:', error);
  }
  const netProfit = financialReport ? financialReport.netProfit : null;

  // Operatsion ko'rinish: sof foyda joriy kurs bo'yicha USD da
  let operationalProfit: number | null = null;
  if (netProfit !== null) {
    try {
      operationalProfit = netProfit / Number(await rateAt(new Date()));
    } catch (error) {
      console.error('Error calculating operational profit:', error);
    }
  }

  const exchangeRateInfo = task.snapshotDealAmount_exchange_rate
    ? {
        rate: Number(task.snapshotDealAmount_exchange_rate),
        source: task.snapshotDealAmount_exchange_source || 'CBU',
        date: task.createdAt,
      }
    : null;

  return {
    ...task,
    netProfit, // Sof foyda (so'm — buxgalteriya)
    operationalProfit, // Sof foyda (USD — operatsion)
    adminEarnedAmount: adminEarnedUzs(task), // Admin ishlab topgan (so'm)
    exchangeRateInfo, // Shartnoma summasi uchun ishlatilgan kurs
    financialReport,
    kpiLogs: task.kpiLogs.map((log) => ({
      id: log.id,
      stageName: log.stageName,
      amount: log.amount,
      userId: log.userId,
      user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : log.user,
      createdAt: log.createdAt,
    })),
  };
}
