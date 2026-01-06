import { Prisma, PrismaClient, Currency, ExchangeSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
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
  
  // KpiConfig'ni yangilash yoki yaratish
  const cfg = await (tx as any).kpiConfig.upsert({
    where: { stageName: normalizedStageName },
    update: { price },
    create: { stageName: normalizedStageName, price },
  });
  
  const amount = cfg.price ?? price;
  
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

