import { Prisma, PrismaClient } from '@prisma/client';

// Helper to compute durations per formula
export async function computeDurations(tx: PrismaClient | Prisma.TransactionClient, taskId: number) {
  const stages = await tx.taskStage.findMany({
    where: { taskId },
    orderBy: { stageOrder: 'asc' },
  });
  const map = new Map(stages.map((s) => [s.name, s]));

  const completed = (name: string) => map.get(name)?.completedAt ?? null;
  const setDuration = async (name: string, start: Date | null, end: Date | null) => {
    const stage = map.get(name);
    if (!stage || !end || !start) return;
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    if (stage.durationMin !== minutes) {
      await tx.taskStage.update({
        where: { id: stage.id },
        data: { durationMin: minutes },
      });
    }
  };

  await setDuration('Invoys', stages[0]?.createdAt ?? null, completed('Invoys'));
  await setDuration('Zayavka', completed('Invoys'), completed('Zayavka'));
  await setDuration('TIR-SMR', completed('Invoys'), completed('TIR-SMR'));
  await setDuration('ST', completed('Zayavka'), completed('ST'));
  await setDuration('Fito', completed('Zayavka'), completed('Fito'));
  await setDuration('Deklaratsiya', completed('Fito'), completed('Deklaratsiya'));

  const tekshirishStart = completed('Deklaratsiya') ?? completed('Fito');
  await setDuration('Tekshirish', tekshirishStart, completed('Tekshirish'));
  await setDuration('Topshirish', completed('Tekshirish'), completed('Topshirish'));
  await setDuration('Pochta', completed('Topshirish'), completed('Pochta'));
  // Sho‘pirga xat yuborish: Tekshirish tugaganidan keyin
  await setDuration('Sho‘pirga xat yuborish', completed('Tekshirish'), completed('Sho‘pirga xat yuborish'));
}

