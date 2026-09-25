import { Currency, ExchangeSource, Prisma, StatePayment } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { prisma } from '../prisma';
import { getExchangeRate } from './exchange-rate';
import { calculateAmountUzs } from './monetary-validation';
import { appCache } from './cache';
import { socketEmitter } from './socketEmitter';
import { notify, getAllActiveUserIds } from './notificationService';

/**
 * Yangi vazifa yaratish — POST /tasks.
 *
 * Vazifa yaratilgan paytdagi narxlar "muzlatiladi" (snapshot): mijozning shartnoma
 * summasi va kursi, hamda o'sha paytdagi eng so'nggi davlat to'lovlari. Keyinchalik
 * mijoz narxi yoki davlat to'lovi o'zgarsa ham eski vazifalar hisobi o'zgarmaydi.
 * Snapshot hisobi sof funksiya (buildTaskPriceSnapshot) — testlanadi.
 */

export const STAGE_TEMPLATES = [
  'Invoys',
  'Zayavka',
  'TIR-SMR',
  'Sertifikat olib chiqish',
  'Deklaratsiya',
  'Tekshirish',
  'Topshirish',
  'Pochta',
] as const;

export const createTaskSchema = z.object({
  clientId: z.number(),
  branchId: z.number(),
  title: z.string().min(1),
  comments: z.string().optional(),
  hasPsr: z.boolean(),
  driverPhone: z.string().optional(),
  afterHoursDeclaration: z.boolean().optional().default(false),
  afterHoursPayer: z.enum(['CLIENT', 'COMPANY']).optional().default('CLIENT'),
  customsPaymentMultiplier: z.number().min(0.5).max(4).optional(), // Deklaratsiya uchun BXM koeffitsienti (0.5–4)
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Foydalanuvchiga ko'rsatiladigan xato — route uni shu status bilan qaytaradi */
export class TaskCreateError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'TaskCreateError';
  }
}

export const clientPricingSelect = {
  dealAmount: true,
  dealAmountCurrency: true,
  dealAmountExchangeRate: true,
  dealAmount_currency: true,
  dealAmount_exchange_rate: true,
  dealAmount_exchange_source: true,
  contractPaymentType: true,
  serviceFeeTransferUzs: true,
} satisfies Prisma.ClientSelect;

export type ClientPricing = Prisma.ClientGetPayload<{ select: typeof clientPricingSelect }>;

type SnapshotFields = Pick<
  Prisma.TaskUncheckedCreateInput,
  | 'snapshotDealAmount' | 'snapshotDealAmountExchangeRate'
  | 'snapshotDealAmount_amount_original' | 'snapshotDealAmount_currency' | 'snapshotDealAmount_exchange_rate'
  | 'snapshotDealAmount_amount_uzs' | 'snapshotDealAmount_exchange_source'
  | 'snapshotContractPaymentType' | 'snapshotServiceFeeTransferUzs'
  | 'snapshotCertificatePayment' | 'snapshotCertificatePaymentExchangeRate'
  | 'snapshotCertificatePayment_amount_original' | 'snapshotCertificatePayment_currency'
  | 'snapshotCertificatePayment_exchange_rate' | 'snapshotCertificatePayment_amount_uzs'
  | 'snapshotCertificatePayment_exchange_source'
  | 'snapshotPsrPrice' | 'snapshotPsrPriceExchangeRate'
  | 'snapshotPsrPrice_amount_original' | 'snapshotPsrPrice_currency' | 'snapshotPsrPrice_exchange_rate'
  | 'snapshotPsrPrice_amount_uzs' | 'snapshotPsrPrice_exchange_source'
  | 'snapshotWorkerPrice' | 'snapshotWorkerPriceExchangeRate'
  | 'snapshotWorkerPrice_amount_original' | 'snapshotWorkerPrice_currency' | 'snapshotWorkerPrice_exchange_rate'
  | 'snapshotWorkerPrice_amount_uzs' | 'snapshotWorkerPrice_exchange_source'
  | 'snapshotCustomsPayment' | 'snapshotCustomsPaymentExchangeRate'
  | 'snapshotCustomsPayment_amount_original' | 'snapshotCustomsPayment_currency'
  | 'snapshotCustomsPayment_exchange_rate' | 'snapshotCustomsPayment_amount_uzs'
  | 'snapshotCustomsPayment_exchange_source'
>;

/** Shartnoma summasining valyutasi (yangi universal maydon ustun) */
export function dealCurrencyOf(client: ClientPricing): Currency {
  return client.dealAmount_currency || client.dealAmountCurrency || 'USD';
}

/** USD shartnoma uchun mijozda saqlangan kurs bormi — yo'q bo'lsa jonli kurs kerak */
export function needsLiveDealRate(client: ClientPricing): boolean {
  return Number(client.dealAmount || 0) !== 0
    && dealCurrencyOf(client) === 'USD'
    && !client.dealAmount_exchange_rate
    && !client.dealAmountExchangeRate;
}

type DealFields = Pick<
  SnapshotFields,
  | 'snapshotDealAmount' | 'snapshotDealAmountExchangeRate'
  | 'snapshotDealAmount_amount_original' | 'snapshotDealAmount_currency' | 'snapshotDealAmount_exchange_rate'
  | 'snapshotDealAmount_amount_uzs' | 'snapshotDealAmount_exchange_source'
  | 'snapshotContractPaymentType' | 'snapshotServiceFeeTransferUzs'
>;

/**
 * Shartnoma summasi snapshot'i — MIJOZ valyutasida (sof funksiya).
 * @param liveUsdRate needsLiveDealRate bo'lganda olingan jonli kurs; olinmagan bo'lsa null (→ 1)
 */
export function buildDealSnapshot(client: ClientPricing, liveUsdRate: Decimal | null): DealFields {
  const out: DealFields = {
    snapshotContractPaymentType: client.contractPaymentType || 'CASH_ALL_INCLUSIVE',
  };
  if (client.serviceFeeTransferUzs != null) {
    out.snapshotServiceFeeTransferUzs = Number(client.serviceFeeTransferUzs);
  }

  // dealAmount = 0 bo'lsa snapshot 0 yoziladi, lekin valyuta/kurs maydonlari yozilmaydi (eski xatti-harakat)
  const dealAmount = client.dealAmount != null ? Number(client.dealAmount) : null;
  if (dealAmount != null) out.snapshotDealAmount = dealAmount;
  if (!dealAmount) return out;

  const currency = dealCurrencyOf(client);
  let rate: Decimal;
  let uzs: number;
  if (currency === 'USD') {
    rate = client.dealAmount_exchange_rate
      ? new Decimal(client.dealAmount_exchange_rate)
      : client.dealAmountExchangeRate
        ? new Decimal(client.dealAmountExchangeRate)
        // DIQQAT: jonli kurs olinmasa 1 — eski xatti-harakat (so'm qiymati USD ga teng bo'lib qoladi)
        : liveUsdRate ?? new Decimal(1);
    uzs = Number(calculateAmountUzs(dealAmount, currency, rate));
  } else {
    rate = new Decimal(1);
    uzs = dealAmount;
  }

  return {
    ...out,
    snapshotDealAmountExchangeRate: rate,
    snapshotDealAmount_amount_original: dealAmount,
    snapshotDealAmount_currency: currency,
    snapshotDealAmount_exchange_rate: Number(rate),
    snapshotDealAmount_amount_uzs: uzs,
    snapshotDealAmount_exchange_source: (client.dealAmount_exchange_source || 'CBU') as ExchangeSource,
  };
}

export type FeeFields = Omit<SnapshotFields, keyof DealFields>;

/** StatePayment USD da va tayyor so'm qiymati yo'q maydon bormi — bo'lsa kurs kerak */
export function statePaymentNeedsRate(sp: StatePayment | null): boolean {
  if (!sp || sp.currency !== 'USD' || sp.exchange_rate) return false;
  return sp.certificatePayment_amount_uzs == null || sp.psrPrice_amount_uzs == null
    || sp.workerPrice_amount_uzs == null || sp.customsPayment_amount_uzs == null;
}

/** Bitta davlat to'lovi so'mda: tayyor so'm qiymati → UZS asosiy qiymat → USD × kurs */
function feeUzs(sp: StatePayment, uzs: Prisma.Decimal | null, base: Prisma.Decimal, usdRate: number): number {
  if (uzs != null) return Number(uzs);
  return sp.currency === 'USD' ? Number(base) * usdRate : Number(base);
}

function uzsFee(amount: number) {
  return {
    amount,
    legacyRate: new Decimal(1),
    currency: 'UZS' as const,
    rate: 1,
    source: 'MANUAL' as const,
  };
}

/**
 * To'lovlar snapshot'i — sertifikat, PSR, ishchi narxi, bojxona. HAMMASI SO'MDA (sof funksiya).
 * Vazifa yaratish, filial va mijoz almashtirishda bir xil qoida.
 * @param statePayment vazifa yaratilgunga qadar eng so'nggi davlat to'lovi (yo'q bo'lsa hammasi 0)
 * @param hiredWorkerRate filial CertifierFeeConfig.hiredWorkerRate (so'm) — bo'lsa ishchi narxi shu
 * @param usdRate USD da kiritilgan davlat to'lovini so'mga o'girish uchun
 */
export function buildFeeSnapshot(
  statePayment: StatePayment | null,
  hiredWorkerRate: number | null,
  usdRate: number
): FeeFields {
  const sp = statePayment;
  const rate = sp?.exchange_rate ? Number(sp.exchange_rate) : usdRate;
  const certificate = sp ? feeUzs(sp, sp.certificatePayment_amount_uzs, sp.certificatePayment, rate) : 0;
  const psr = sp ? feeUzs(sp, sp.psrPrice_amount_uzs, sp.psrPrice, rate) : 0;
  const worker = hiredWorkerRate ?? (sp ? feeUzs(sp, sp.workerPrice_amount_uzs, sp.workerPrice, rate) : 0);
  const customs = sp ? feeUzs(sp, sp.customsPayment_amount_uzs, sp.customsPayment, rate) : 0;

  const out: FeeFields = {};
  for (const [prefix, amount] of [
    ['snapshotCertificatePayment', certificate],
    ['snapshotPsrPrice', psr],
    ['snapshotWorkerPrice', worker],
    ['snapshotCustomsPayment', customs],
  ] as const) {
    const f = uzsFee(amount);
    Object.assign(out, {
      [prefix]: f.amount,
      [`${prefix}ExchangeRate`]: f.legacyRate,
      [`${prefix}_amount_original`]: f.amount,
      [`${prefix}_currency`]: f.currency,
      [`${prefix}_exchange_rate`]: f.rate,
      [`${prefix}_amount_uzs`]: f.amount,
      [`${prefix}_exchange_source`]: f.source,
    });
  }
  return out;
}

/** Shartnoma (mijoz valyutasida) + to'lovlar (so'mda) */
export function buildTaskPriceSnapshot(params: {
  client: ClientPricing;
  statePayment: StatePayment | null;
  liveUsdRate: Decimal | null;
  hiredWorkerRate: number | null;
}): SnapshotFields {
  const deal = buildDealSnapshot(params.client, params.liveUsdRate);
  // UZS mijozda shartnoma kursi 1 — USD davlat to'lovi uchun jonli kurs kerak
  const dealUsdRate = deal.snapshotDealAmount_currency === 'USD' ? Number(deal.snapshotDealAmount_exchange_rate) : null;
  const usdRate = dealUsdRate ?? (params.liveUsdRate ? Number(params.liveUsdRate) : 1);
  return { ...deal, ...buildFeeSnapshot(params.statePayment, params.hiredWorkerRate, usdRate) };
}

/**
 * Snapshot uchun tashqi ma'lumot: `at` paytidagi eng so'nggi davlat to'lovi, filial
 * hiredWorkerRate'i va (kerak bo'lsa) jonli USD kursi. Vazifa yaratish va tahrirlashda bir xil.
 */
export async function loadPricingInputs(
  tx: Prisma.TransactionClient,
  client: ClientPricing,
  branchId: number,
  at: Date
): Promise<{ statePayment: StatePayment | null; liveUsdRate: Decimal | null; hiredWorkerRate: number | null }> {
  const [statePayment, certConfig] = await Promise.all([
    tx.statePayment.findFirst({ where: { createdAt: { lte: at } }, orderBy: { createdAt: 'desc' } }),
    tx.certifierFeeConfig.findFirst({
      where: { branchId, createdAt: { lte: at } },
      orderBy: { createdAt: 'desc' },
      select: { hiredWorkerRate: true },
    }),
  ]);

  let liveUsdRate: Decimal | null = null;
  if (needsLiveDealRate(client) || statePaymentNeedsRate(statePayment)) {
    try {
      liveUsdRate = await getExchangeRate(at, 'USD', 'UZS', tx);
    } catch (error) {
      console.error('Failed to get exchange rate for task price snapshot:', error);
    }
  }
  return { statePayment, liveUsdRate, hiredWorkerRate: certConfig ? Number(certConfig.hiredWorkerRate) : null };
}

/** Vazifani narx snapshot'i va 8 ta standart bosqich bilan yaratadi (bitta tranzaksiya) */
export async function createTask(input: CreateTaskInput, actorId: number) {
  return prisma.$transaction(async (tx) => {
    const [client, branch] = await Promise.all([
      tx.client.findUnique({ where: { id: input.clientId }, select: clientPricingSelect }),
      tx.branch.findUnique({ where: { id: input.branchId }, select: { id: true } }),
    ]);
    // Oldin oddiy Error → 500 edi
    if (!client) throw new TaskCreateError(404, 'Mijoz topilmadi');
    if (!branch) throw new TaskCreateError(404, 'Filial topilmadi');

    const pricing = await loadPricingInputs(tx, client, input.branchId, new Date());

    const snapshot = buildTaskPriceSnapshot({ client, ...pricing });

    const task = await tx.task.create({
      data: {
        clientId: input.clientId,
        branchId: input.branchId,
        title: input.title,
        hasPsr: input.hasPsr,
        afterHoursDeclaration: input.afterHoursDeclaration,
        afterHoursPayer: input.afterHoursPayer,
        createdById: actorId,
        ...(input.comments ? { comments: input.comments } : {}),
        ...(input.driverPhone ? { driverPhone: input.driverPhone } : {}),
        ...(input.customsPaymentMultiplier != null ? { customsPaymentMultiplier: input.customsPaymentMultiplier } : {}),
        ...snapshot,
      },
    });
    await tx.taskStage.createMany({
      data: STAGE_TEMPLATES.map((name, idx) => ({ taskId: task.id, name, stageOrder: idx + 1 })),
    });
    return task;
  });
}

type CreatedTask = Awaited<ReturnType<typeof createTask>>;

/** Yaratilgandan keyin: socket, dashboard kesh, bildirishnoma */
export function afterTaskCreated(task: CreatedTask, actor: { id: number; name: string }): void {
  socketEmitter.broadcastExcept(actor.id, 'task:created', { task, createdBy: actor.name });
  appCache.invalidate('dashboard:');
  getAllActiveUserIds()
    .then((userIds) =>
      notify({
        userIds,
        type: 'TASK_CREATED',
        title: `Yangi task: ${task.title || 'Task #' + task.id}`,
        message: `${actor.name} yangi task yaratdi`,
        actionUrl: `/tasks/${task.id}`,
        taskId: task.id,
        excludeUserId: actor.id,
      })
    )
    .catch((err) => console.error('[task] TASK_CREATED notify failed:', err));
}
