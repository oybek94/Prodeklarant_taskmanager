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

const clientPricingSelect = {
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

interface Amounts { original: number; uzs: number; rate: Decimal }

/**
 * Davlat to'lovi summasini mijoz valyutasiga keltiradi.
 * USD: tayyor so'm qiymati bo'lsa u, bo'lmasa kurs bo'yicha hisoblanadi; kurs = uzs/original.
 */
function resolvePaymentAmounts(
  amountUsdRaw: number | null,
  amountUzsRaw: number | null,
  fallbackRaw: number | null,
  currency: Currency,
  exchangeRate: Decimal
): Amounts {
  const amountUsd = Number(amountUsdRaw ?? fallbackRaw ?? 0);
  const amountUzs = Number(amountUzsRaw ?? fallbackRaw ?? 0);
  if (currency === 'USD') {
    const uzs = amountUzsRaw != null ? amountUzs : Number(calculateAmountUzs(amountUsd, 'USD', exchangeRate));
    const rate = amountUsd > 0 ? new Decimal(uzs / amountUsd) : new Decimal(1);
    return { original: amountUsd, uzs, rate };
  }
  return { original: amountUzs, uzs: amountUzs, rate: new Decimal(1) };
}

const num = (v: Prisma.Decimal | null | undefined): number | null => (v != null ? Number(v) : null);

/**
 * Vazifa narx snapshot'i (sof funksiya).
 * @param liveDealRate needsLiveDealRate bo'lganda olingan jonli kurs; olinmagan bo'lsa null (→ 1)
 * @param hiredWorkerRate filial CertifierFeeConfig.hiredWorkerRate — bo'lsa ishchi narxini almashtiradi
 */
export function buildTaskPriceSnapshot(params: {
  client: ClientPricing;
  statePayment: StatePayment | null;
  liveDealRate: Decimal | null;
  hiredWorkerRate: number | null;
}): SnapshotFields {
  const { client, statePayment, liveDealRate, hiredWorkerRate } = params;
  const out: SnapshotFields = {};

  // Shartnoma to'lov turi snapshot (dealAmount snapshot bilan bir vaqtda)
  out.snapshotContractPaymentType = client.contractPaymentType || 'CASH_ALL_INCLUSIVE';
  if (client.serviceFeeTransferUzs != null) {
    out.snapshotServiceFeeTransferUzs = Number(client.serviceFeeTransferUzs);
  }

  // ── Shartnoma summasi ──
  // dealAmount = 0 bo'lsa snapshot 0 yoziladi, lekin valyuta/kurs maydonlari yozilmaydi (eski xatti-harakat)
  const dealAmount = client.dealAmount != null ? Number(client.dealAmount) : null;
  let dealCurrency: Currency | null = null;
  let dealRate: Decimal | null = null;
  if (dealAmount != null) out.snapshotDealAmount = dealAmount;

  if (dealAmount) {
    dealCurrency = dealCurrencyOf(client);
    let dealUzs: number;
    if (dealCurrency === 'USD') {
      dealRate = client.dealAmount_exchange_rate
        ? new Decimal(client.dealAmount_exchange_rate)
        : client.dealAmountExchangeRate
          ? new Decimal(client.dealAmountExchangeRate)
          // DIQQAT: jonli kurs olinmasa 1 — eski xatti-harakat (so'm qiymati USD ga teng bo'lib qoladi)
          : liveDealRate ?? new Decimal(1);
      dealUzs = Number(calculateAmountUzs(dealAmount, dealCurrency, dealRate));
    } else {
      dealRate = new Decimal(1);
      dealUzs = dealAmount;
    }

    out.snapshotDealAmountExchangeRate = dealRate;
    out.snapshotDealAmount_amount_original = dealAmount;
    out.snapshotDealAmount_currency = dealCurrency;
    out.snapshotDealAmount_exchange_rate = Number(dealRate);
    out.snapshotDealAmount_amount_uzs = dealUzs;
    out.snapshotDealAmount_exchange_source = (client.dealAmount_exchange_source || 'CBU') as ExchangeSource;
  }

  if (!statePayment) return out;

  // ── Davlat to'lovlari (vazifa yaratilgunga qadar eng so'nggisi) ──
  const paymentCurrency: Currency = dealCurrency || 'USD';
  const paymentRate = dealRate || new Decimal(1);
  const resolve = (original: Prisma.Decimal | null, uzs: Prisma.Decimal | null, fallback: Prisma.Decimal | null) =>
    resolvePaymentAmounts(num(original), num(uzs), num(fallback), paymentCurrency, paymentRate);

  const certificate = resolve(
    statePayment.certificatePayment_amount_original,
    statePayment.certificatePayment_amount_uzs,
    statePayment.certificatePayment
  );
  const psr = resolve(statePayment.psrPrice_amount_original, statePayment.psrPrice_amount_uzs, statePayment.psrPrice);
  // CertifierFeeConfig bo'lsa undagi hiredWorkerRate ustun.
  // DIQQAT: bu qiymat so'mda, lekin USD mijozda kurs 1 bilan "USD" deb yoziladi — eski xatti-harakat.
  const worker = hiredWorkerRate != null
    ? resolvePaymentAmounts(null, hiredWorkerRate, hiredWorkerRate, paymentCurrency, paymentRate)
    : resolve(statePayment.workerPrice_amount_original, statePayment.workerPrice_amount_uzs, statePayment.workerPrice);
  const customs = resolve(
    statePayment.customsPayment_amount_original,
    statePayment.customsPayment_amount_uzs,
    statePayment.customsPayment
  );

  Object.assign(out, {
    snapshotCertificatePayment: certificate.original,
    snapshotCertificatePaymentExchangeRate: certificate.rate,
    snapshotCertificatePayment_amount_original: certificate.original,
    snapshotCertificatePayment_currency: paymentCurrency,
    snapshotCertificatePayment_exchange_rate: Number(certificate.rate),
    snapshotCertificatePayment_amount_uzs: certificate.uzs,
    snapshotCertificatePayment_exchange_source: 'MANUAL',

    snapshotPsrPrice: psr.original,
    snapshotPsrPriceExchangeRate: psr.rate,
    snapshotPsrPrice_amount_original: psr.original,
    snapshotPsrPrice_currency: paymentCurrency,
    snapshotPsrPrice_exchange_rate: Number(psr.rate),
    snapshotPsrPrice_amount_uzs: psr.uzs,
    snapshotPsrPrice_exchange_source: 'MANUAL',

    snapshotWorkerPrice: worker.original,
    snapshotWorkerPriceExchangeRate: worker.rate,
    snapshotWorkerPrice_amount_original: worker.original,
    snapshotWorkerPrice_currency: paymentCurrency,
    snapshotWorkerPrice_exchange_rate: Number(worker.rate),
    snapshotWorkerPrice_amount_uzs: worker.uzs,
    snapshotWorkerPrice_exchange_source: 'MANUAL',

    snapshotCustomsPayment: customs.original,
    snapshotCustomsPaymentExchangeRate: customs.rate,
    snapshotCustomsPayment_amount_original: customs.original,
    snapshotCustomsPayment_currency: paymentCurrency,
    snapshotCustomsPayment_exchange_rate: Number(customs.rate),
    snapshotCustomsPayment_amount_uzs: customs.uzs,
    snapshotCustomsPayment_exchange_source: 'MANUAL',
  } satisfies SnapshotFields);

  return out;
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

    const createdAt = new Date();
    const statePayment = await tx.statePayment.findFirst({
      where: { createdAt: { lte: createdAt } },
      orderBy: { createdAt: 'desc' },
    });

    let liveDealRate: Decimal | null = null;
    if (needsLiveDealRate(client)) {
      try {
        liveDealRate = await getExchangeRate(createdAt, 'USD', 'UZS', tx);
      } catch (error) {
        console.error('Failed to get exchange rate for deal amount snapshot:', error);
      }
    }

    let hiredWorkerRate: number | null = null;
    if (statePayment) {
      const certConfig = await tx.certifierFeeConfig.findFirst({
        where: { branchId: input.branchId, createdAt: { lte: createdAt } },
        orderBy: { createdAt: 'desc' },
        select: { hiredWorkerRate: true },
      });
      hiredWorkerRate = certConfig ? Number(certConfig.hiredWorkerRate) : null;
    }

    const snapshot = buildTaskPriceSnapshot({ client, statePayment, liveDealRate, hiredWorkerRate });

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
