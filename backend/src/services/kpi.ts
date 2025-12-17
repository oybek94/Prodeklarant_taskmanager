import { Prisma, PrismaClient } from '@prisma/client';

export async function logKpiForStage(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number,
  stageName: string,
  userId?: number | null
) {
  if (!userId) return;
  const cfg = await (tx as any).kpiConfig.upsert({
    where: { stageName },
    update: {},
    create: { stageName, price: 0 },
  });
  const amount = cfg.price ?? 0;
  await (tx as any).kpiLog.create({
    data: {
      userId,
      taskId,
      stageName,
      amount,
    },
  });
}

