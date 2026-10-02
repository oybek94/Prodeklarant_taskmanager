import { PrismaClient, Prisma, ContractPaymentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { computeContractPaymentSplit } from './contract-payment-split';
import { amountInUzs, warnSkippedUzs } from '../utils/money';

const XIZMAT_HAQI_CONTRACT_TYPES: ContractPaymentType[] = ['TRANSFER_ONLY', 'CASH_ONLY', 'MIXED'];

/** Biriktirilgan xodimga foydaning shu ulushi bonus sifatida beriladi */
const BONUS_SHARE = new Decimal(0.5);

export interface BonusWorkerFeeLine {
  kpiLogId: number;
  userId: number;
  userName: string | null;
  stageName: string;
  amount: Decimal;
  currency: string | null;
  amountUzs: Decimal | null;
  /** null — ayirilgan; aks holda nega hisobga olinmagani */
  excludedReason: 'ASSIGNED_USER' | 'ADMIN' | 'NO_UZS' | null;
}

export interface ClientAssignmentBonusBreakdown {
  taskId: number;
  clientId: number;
  userId: number;
  contractPaymentType: ContractPaymentType;
  deal: {
    amount: Decimal | null;
    currency: string | null;
    exchangeRate: Decimal | null;
    amountUzs: Decimal;
  };
  tax: {
    ratePercent: Decimal;
    baseUzs: Decimal;
    amountUzs: Decimal;
  };
  certifier: {
    configCreatedAt: Date | null;
    st1Uzs: Decimal;
    fitoUzs: Decimal;
    aktUzs: Decimal;
    fumigationUzs: Decimal;
    amountUzs: Decimal;
  };
  otherWorkers: {
    lines: BonusWorkerFeeLine[];
    amountUzs: Decimal;
  };
  profitBeforeClampUzs: Decimal;
  profitUzs: Decimal;
  bonusSharePercent: Decimal;
  bonusUzs: Decimal;
}

/**
 * Bonus hisob-kitobini bosqichma-bosqich qaytaradi (bazaga yozmaydi).
 * Mijozga xodim biriktirilmagan yoki shartnoma turi "Xizmat haqi" bo'lmasa — null.
 */
export async function computeClientAssignmentBonusBreakdown(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<ClientAssignmentBonusBreakdown | null> {
  const task = await (tx as any).task.findUnique({
    where: { id: taskId },
    include: {
      client: true,
      kpiLogs: {
        include: { user: { select: { id: true, role: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!task) return null;

  const assignedUserId: number | null = task.client?.assignedUserId ?? null;
  if (!assignedUserId) return null;

  const contractPaymentType: ContractPaymentType =
    task.snapshotContractPaymentType || task.client.contractPaymentType || 'CASH_ALL_INCLUSIVE';
  if (!XIZMAT_HAQI_CONTRACT_TYPES.includes(contractPaymentType)) return null;

  const dealRate = task.snapshotDealAmount_exchange_rate ?? task.snapshotDealAmountExchangeRate ?? null;
  const dealAmountUzs = new Decimal(
    task.snapshotDealAmount_amount_uzs ??
      (task.snapshotDealAmount != null
        ? Number(task.snapshotDealAmount) * Number(dealRate || 1)
        : 0)
  );

  const certConfig = await (tx as any).certifierFeeConfig.findFirst({
    where: { branchId: task.branchId, createdAt: { lte: task.createdAt } },
    orderBy: { createdAt: 'desc' },
  });

  const st1Uzs = new Decimal(certConfig?.st1Rate || 0);
  const fitoUzs = new Decimal(certConfig?.fitoRate || 0);
  const aktUzs = new Decimal(certConfig?.aktRate || 0);
  const fumigationUzs = new Decimal(certConfig?.fumigationRate || 0);
  const certifierFeeUzs = st1Uzs.plus(fitoUzs).plus(aktUzs).plus(fumigationUzs);

  const taxRatePercent = new Decimal(certConfig?.serviceFeeTaxRatePercent ?? 9.5);

  const transferConfigUzs = task.snapshotServiceFeeTransferUzs != null
    ? Number(task.snapshotServiceFeeTransferUzs)
    : (task.client.serviceFeeTransferUzs != null ? Number(task.client.serviceFeeTransferUzs) : null);
  const { transferAmount } = computeContractPaymentSplit(contractPaymentType, dealAmountUzs.toNumber(), transferConfigUzs);

  // Soliq bazasi: TRANSFER_ONLY — butun summa, MIXED — perechisleniya qismi, CASH_ONLY — 0
  let taxBaseUzs = new Decimal(0);
  if (contractPaymentType === 'TRANSFER_ONLY') {
    taxBaseUzs = dealAmountUzs;
  } else if (contractPaymentType === 'MIXED') {
    taxBaseUzs = new Decimal(transferAmount);
  }
  const taxUzs = taxBaseUzs.times(taxRatePercent).div(100);

  // USD KPI log'i so'm deb ayirilsa (ilgari `?? log.amount`), boshqa ishchilar haqi
  // ~12 000x kam chiqib, foyda va bonus sun'iy oshardi. Log'da kurs bo'lmasa —
  // tasks.ts dagi kabi vazifaning snapshot kursi bilan o'giramiz.
  let otherWorkersFeeUzs = new Decimal(0);
  let skippedLogs = 0;
  const lines: BonusWorkerFeeLine[] = [];
  for (const log of task.kpiLogs || []) {
    const logAmountUzs = amountInUzs(log) ?? amountInUzs({ ...log, exchange_rate: dealRate });
    let excludedReason: BonusWorkerFeeLine['excludedReason'] = null;
    if (log.userId === assignedUserId) excludedReason = 'ASSIGNED_USER';
    else if (log.user?.role === 'ADMIN') excludedReason = 'ADMIN';
    else if (!logAmountUzs) {
      excludedReason = 'NO_UZS';
      skippedLogs++;
    } else {
      otherWorkersFeeUzs = otherWorkersFeeUzs.plus(logAmountUzs);
    }
    lines.push({
      kpiLogId: log.id,
      userId: log.userId,
      userName: log.user?.name ?? null,
      stageName: log.stageName,
      amount: new Decimal(log.amount_original ?? log.amount ?? 0),
      currency: log.currency_universal ?? log.currency ?? null,
      amountUzs: logAmountUzs,
      excludedReason,
    });
  }
  warnSkippedUzs(`client-assignment-bonus task=${task.id} kpiLogs`, skippedLogs);

  const profitBeforeClampUzs = dealAmountUzs.minus(taxUzs).minus(certifierFeeUzs).minus(otherWorkersFeeUzs);
  const profitUzs = profitBeforeClampUzs.isNegative() ? new Decimal(0) : profitBeforeClampUzs;
  const bonusUzs = profitUzs.times(BONUS_SHARE);

  return {
    taskId: task.id,
    clientId: task.clientId,
    userId: assignedUserId,
    contractPaymentType,
    deal: {
      amount: task.snapshotDealAmount_amount_original ?? task.snapshotDealAmount ?? null,
      currency: task.snapshotDealAmount_currency ?? null,
      exchangeRate: dealRate,
      amountUzs: dealAmountUzs,
    },
    tax: { ratePercent: taxRatePercent, baseUzs: taxBaseUzs, amountUzs: taxUzs },
    certifier: {
      configCreatedAt: certConfig?.createdAt ?? null,
      st1Uzs,
      fitoUzs,
      aktUzs,
      fumigationUzs,
      amountUzs: certifierFeeUzs,
    },
    otherWorkers: { lines, amountUzs: otherWorkersFeeUzs },
    profitBeforeClampUzs,
    profitUzs,
    bonusSharePercent: BONUS_SHARE.times(100),
    bonusUzs,
  };
}

/**
 * Task yakunlanganda (YAKUNLANDI) mijozga biriktirilgan xodim uchun
 * foyda-bonus yozuvini hisoblab, ClientAssignmentBonus jadvaliga yozadi.
 * Faqat "Xizmat haqi" shartnoma turlarida (TRANSFER_ONLY/CASH_ONLY/MIXED)
 * va Client.assignedUserId to'ldirilgan bo'lsagina ishlaydi.
 */
export async function computeAndRecordClientAssignmentBonus(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<void> {
  const b = await computeClientAssignmentBonusBreakdown(tx, taskId);
  if (!b) return;

  const data = {
    clientId: b.clientId,
    userId: b.userId,
    dealAmountUzs: b.deal.amountUzs,
    taxUzs: b.tax.amountUzs,
    certifierFeeUzs: b.certifier.amountUzs,
    otherWorkersFeeUzs: b.otherWorkers.amountUzs,
    profitUzs: b.profitUzs,
    bonusUzs: b.bonusUzs,
  };

  await (tx as any).clientAssignmentBonus.upsert({
    where: { taskId },
    create: { taskId, ...data },
    update: data,
  });
}

export async function deleteClientAssignmentBonus(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<void> {
  await (tx as any).clientAssignmentBonus.deleteMany({ where: { taskId } });
}
