import { PrismaClient, Prisma, ContractPaymentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { computeContractPaymentSplit } from './contract-payment-split';
import { amountInUzs, warnSkippedUzs } from '../utils/money';

const XIZMAT_HAQI_CONTRACT_TYPES: ContractPaymentType[] = ['TRANSFER_ONLY', 'CASH_ONLY', 'MIXED'];

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
  const task = await (tx as any).task.findUnique({
    where: { id: taskId },
    include: {
      client: true,
      kpiLogs: { include: { user: { select: { id: true, role: true } } } },
    },
  });

  if (!task) return;

  const assignedUserId: number | null = task.client?.assignedUserId ?? null;
  if (!assignedUserId) return;

  const contractPaymentType: ContractPaymentType =
    task.snapshotContractPaymentType || task.client.contractPaymentType || 'CASH_ALL_INCLUSIVE';
  if (!XIZMAT_HAQI_CONTRACT_TYPES.includes(contractPaymentType)) return;

  const dealAmountUzs = new Decimal(
    task.snapshotDealAmount_amount_uzs ??
      (task.snapshotDealAmount != null
        ? Number(task.snapshotDealAmount) * Number(task.snapshotDealAmount_exchange_rate || task.snapshotDealAmountExchangeRate || 1)
        : 0)
  );

  const certConfig = await (tx as any).certifierFeeConfig.findFirst({
    where: { branchId: task.branchId, createdAt: { lte: task.createdAt } },
    orderBy: { createdAt: 'desc' },
  });

  const certifierFeeUzs = certConfig
    ? new Decimal(certConfig.st1Rate || 0)
        .plus(certConfig.fitoRate || 0)
        .plus(certConfig.aktRate || 0)
        .plus(certConfig.fumigationRate || 0)
    : new Decimal(0);

  const taxRatePercent = new Decimal(certConfig?.serviceFeeTaxRatePercent ?? 9.5);

  const transferConfigUzs = task.snapshotServiceFeeTransferUzs != null
    ? Number(task.snapshotServiceFeeTransferUzs)
    : (task.client.serviceFeeTransferUzs != null ? Number(task.client.serviceFeeTransferUzs) : null);
  const { transferAmount } = computeContractPaymentSplit(contractPaymentType, dealAmountUzs.toNumber(), transferConfigUzs);

  let taxUzs = new Decimal(0);
  if (contractPaymentType === 'TRANSFER_ONLY') {
    taxUzs = dealAmountUzs.times(taxRatePercent).div(100);
  } else if (contractPaymentType === 'MIXED') {
    taxUzs = new Decimal(transferAmount).times(taxRatePercent).div(100);
  }
  // CASH_ONLY -> taxUzs qoladi 0

  // USD KPI log'i so'm deb ayirilsa (ilgari `?? log.amount`), boshqa ishchilar haqi
  // ~12 000x kam chiqib, foyda va bonus sun'iy oshardi. Log'da kurs bo'lmasa —
  // tasks.ts dagi kabi vazifaning snapshot kursi bilan o'giramiz.
  const taskRate = task.snapshotDealAmount_exchange_rate ?? task.snapshotDealAmountExchangeRate;
  let otherWorkersFeeUzs = new Decimal(0);
  let skippedLogs = 0;
  for (const log of task.kpiLogs || []) {
    if (log.userId === assignedUserId) continue;
    if (log.user?.role === 'ADMIN') continue;
    const logAmountUzs = amountInUzs(log) ?? amountInUzs({ ...log, exchange_rate: taskRate });
    if (logAmountUzs) otherWorkersFeeUzs = otherWorkersFeeUzs.plus(logAmountUzs);
    else skippedLogs++;
  }
  warnSkippedUzs(`client-assignment-bonus task=${task.id} kpiLogs`, skippedLogs);

  let profitUzs = dealAmountUzs.minus(taxUzs).minus(certifierFeeUzs).minus(otherWorkersFeeUzs);
  if (profitUzs.isNegative()) {
    profitUzs = new Decimal(0);
  }
  const bonusUzs = profitUzs.div(2);

  await (tx as any).clientAssignmentBonus.upsert({
    where: { taskId },
    create: {
      taskId,
      clientId: task.clientId,
      userId: assignedUserId,
      dealAmountUzs,
      taxUzs,
      certifierFeeUzs,
      otherWorkersFeeUzs,
      profitUzs,
      bonusUzs,
    },
    update: {
      clientId: task.clientId,
      userId: assignedUserId,
      dealAmountUzs,
      taxUzs,
      certifierFeeUzs,
      otherWorkersFeeUzs,
      profitUzs,
      bonusUzs,
    },
  });
}

export async function deleteClientAssignmentBonus(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<void> {
  await (tx as any).clientAssignmentBonus.deleteMany({ where: { taskId } });
}
