import { Prisma, PrismaClient, Currency, ExchangeSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../prisma';
import { getExchangeRate } from './exchange-rate';
import { calculateAmountUzs } from './monetary-validation';

// Stage narxlari (USD)
const STAGE_PRICES: Record<string, number> = {
  'Invoys': 3.0,
  'Zayavka': 3.0,
  'TIR-SMR': 1.5,
  'Sertifikat olib chiqish': 1.25,
  'ST': 1.25, // Backward compatibility
  'Fito': 1.25, // Backward compatibility
  'FITO': 1.25, // Backward compatibility
  'Deklaratsiya': 2.0,
  'Tekshirish': 2.0,
  'Topshirish': 1.25,
  'Xujjat_topshirish': 1.25, // Backward compatibility
  'Xujjat topshirish': 1.25, // Backward compatibility
  'Pochta': 1.0,
};

export async function logKpiForStage(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number,
  stageName: string,
  userId?: number | null,
  completedAt?: Date
) {
  if (!userId) return;

  // Stage nomini normalize qilish (Sertifikat olib chiqish va Topshirish uchun)
  let normalizedStageName = stageName;
  if (stageName === 'ST' || stageName === 'Fito' || stageName === 'FITO') {
    normalizedStageName = 'Sertifikat olib chiqish';
  } else if (stageName === 'Xujjat_topshirish' || stageName === 'Xujjat topshirish') {
    normalizedStageName = 'Topshirish';
  }

  // Narxni aniqlash
  const price = STAGE_PRICES[normalizedStageName] ?? STAGE_PRICES[stageName] ?? 0;

  // KpiConfig'dan foydalanish (mavjud bo'lsa o'zgartirmaymiz)
  const existingConfig = await (tx as any).kpiConfig.findUnique({
    where: { stageName: normalizedStageName },
  });

  if (!existingConfig) {
    await (tx as any).kpiConfig.create({
      data: { stageName: normalizedStageName, price },
    });
  }

  const amount = existingConfig?.price ?? price;

  // KPI amounts are in USD by default
  const currency: Currency = 'USD';
  const amountDecimal = new Decimal(amount);

  // Get exchange rate at stage completion time
  const completionDate = completedAt || new Date();
  let exchangeRate: Decimal;
  const exchangeSource: ExchangeSource = 'CBU';

  try {
    exchangeRate = await getExchangeRate(completionDate, currency, 'UZS', tx, exchangeSource);
  } catch (error) {
    console.error(`Failed to get exchange rate for KPI log at ${completionDate.toISOString()}:`, error);
    // Fallback to latest rate
    try {
      exchangeRate = await getExchangeRate(new Date(), currency, 'UZS', tx, exchangeSource);
    } catch (fallbackError) {
      console.error('Failed to get latest exchange rate as fallback:', fallbackError);
      // Last resort: use rate of 1 (invalid but prevents crash)
      exchangeRate = new Decimal(1);
    }
  }

  // Calculate converted UZS amount
  const amountUzs = calculateAmountUzs(amountDecimal, currency, exchangeRate);

  // KpiLog yaratish
  await (tx as any).kpiLog.create({
    data: {
      userId,
      taskId,
      stageName: normalizedStageName, // Normalized nom bilan saqlash
      // Keep old fields for backward compatibility
      amount: amountDecimal,
      currency,
      exchangeRate,
      convertedUzsAmount: amountUzs,
      // Universal monetary fields
      amount_original: amountDecimal,
      currency_universal: currency,
      exchange_rate: exchangeRate,
      amount_uzs: amountUzs,
      exchange_source: exchangeSource,
    },
  });
}

/**
 * Get KPI statistics for a specific worker within a date range
 */
export async function getWorkerKpiStats(workerId: number, startDate?: Date, endDate?: Date) {
  const where: Prisma.KpiLogWhereInput = { userId: workerId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const logs = await prisma.kpiLog.findMany({
    where,
    include: {
      task: {
        select: {
          client: { select: { name: true } },
          status: true,
          title: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  let totalUzs = 0;

  const stageStats: Record<string, { count: number, totalUzs: number }> = {};
  const dailyStats: Record<string, { count: number, totalUzs: number }> = {};

  const formattedLogs = logs.map(log => {
    const uzs = Number(log.amount_uzs || log.convertedUzsAmount || 0);
    const usd = log.currency_universal === 'USD' ? Number(log.amount_original || log.amount || 0) : 0;

    totalUzs += uzs;

    const stage = log.stageName;
    if (!stageStats[stage]) {
      stageStats[stage] = { count: 0, totalUzs: 0 };
    }
    stageStats[stage].count += 1;
    stageStats[stage].totalUzs += uzs;

    const dateStr = log.createdAt.toISOString().split('T')[0];
    if (!dailyStats[dateStr]) {
      dailyStats[dateStr] = { count: 0, totalUzs: 0 };
    }
    dailyStats[dateStr].count += 1;
    dailyStats[dateStr].totalUzs += uzs;

    return {
      id: log.id,
      stageName: stage,
      amountUzs: uzs,
      amountUsd: usd,
      createdAt: log.createdAt,
      taskTitle: (log as any).task?.title,
      clientName: (log as any).task?.client?.name,
      taskStatus: (log as any).task?.status
    };
  });

  return {
    summary: {
      totalTasks: logs.length,
      totalUzs
    },
    stageStats: Object.entries(stageStats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalUzs - a.totalUzs),
    dailyStats: Object.entries(dailyStats)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    logs: formattedLogs
  };
}

