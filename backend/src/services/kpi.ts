import { Prisma, PrismaClient } from '@prisma/client';

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
  userId?: number | null
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
  
  // KpiLog yaratish
  await (tx as any).kpiLog.create({
    data: {
      userId,
      taskId,
      stageName: normalizedStageName, // Normalized nom bilan saqlash
      amount,
    },
  });
}

