import { Prisma, PrismaClient } from '@prisma/client';

// Helper to compute durations per formula
export async function computeDurations(tx: PrismaClient | Prisma.TransactionClient, taskId: number) {
  // Get task to access createdAt
  const task = await (tx as any).task.findUnique({
    where: { id: taskId },
    select: { createdAt: true },
  });
  
  if (!task) return;

  const stages = await (tx as any).taskStage.findMany({
    where: { taskId },
    orderBy: { stageOrder: 'asc' },
  });
  const map = new Map<string, any>(stages.map((s: any) => [s.name, s]));

  const completed = (name: string) => map.get(name)?.completedAt ?? null;
  const started = (name: string) => map.get(name)?.startedAt ?? null;
  const setDuration = async (name: string, start: Date | null, end: Date | null) => {
    const stage = map.get(name);
    if (!stage || !end || !start) return;
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    if (stage.durationMin !== minutes) {
      await (tx as any).taskStage.update({
        where: { id: stage.id },
        data: { durationMin: minutes },
      });
    }
  };

  // 1. Invoys: Invoys tayyor bo'lgan vaqt - Task qo'shilgan vaqt
  await setDuration('Invoys', task.createdAt, completed('Invoys'));

  // 2. Zayavka: Zayavka boshlangan (ST-1/FITO/Ichki yuklangan) - Zayavka tugallangan. Agar startedAt bo'lsa undan foydalanamiz
  const zayavkaStart = started('Zayavka') ?? completed('Invoys');
  await setDuration('Zayavka', zayavkaStart, completed('Zayavka'));

  // 3. TIR-SMR: TIR/SMR yuklangan vaqt - TIR-SMR tugallangan. Agar startedAt bo'lsa undan foydalanamiz
  const tirSmrStart = started('TIR-SMR') ?? completed('Invoys');
  await setDuration('TIR-SMR', tirSmrStart, completed('TIR-SMR'));

  // 4. ST: ST tayyor bo'lgan vaqt - Zayavka tayyor bo'lgan vaqt
  await setDuration('ST', completed('Zayavka'), completed('ST'));

  // 5. FITO: FITO tayyor bo'lgan vaqt - Zayavka tayyor bo'lgan vaqt
  // Note: Database'da "Fito" deb saqlangan bo'lishi mumkin
  const fitoCompleted = completed('Fito') || completed('FITO');
  await setDuration('Fito', completed('Zayavka'), fitoCompleted);
  if (map.has('FITO')) {
    await setDuration('FITO', completed('Zayavka'), completed('FITO'));
  }

  // 6. Deklaratsiya: Deklaratsiya shabloni yuklangan vaqt - Deklaratsiya tugallangan. Agar startedAt bo'lsa undan foydalanamiz
  const deklaratsiyaStart = started('Deklaratsiya') ?? fitoCompleted;
  await setDuration('Deklaratsiya', deklaratsiyaStart, completed('Deklaratsiya'));

  // 7. Tekshirish: 
  //    - Agar Deklaratsiya tayyor bo'lsa: Tekshirish tayyor bo'lgan vaqt - Deklaratsiya tayyor bo'lgan vaqt
  //    - Agar Deklaratsiya tayyor bo'lmasa: Tekshirish tayyor bo'lgan vaqt - FITO tayyor bo'lgan vaqt
  const deklaratsiyaCompleted = completed('Deklaratsiya');
  const tekshirishStart = deklaratsiyaCompleted ?? fitoCompleted;
  await setDuration('Tekshirish', tekshirishStart, completed('Tekshirish'));

  // 8. Topshirish: Topshirish tayyor bo'lgan vaqt - Tekshirish tayyor bo'lgan vaqt
  await setDuration('Topshirish', completed('Tekshirish'), completed('Topshirish'));

  // 9. Pochta: Pochta tayyor bo'lgan vaqt - Deklaratsiya tayyor bo'lgan vaqt
  await setDuration('Pochta', deklaratsiyaCompleted, completed('Pochta'));
}

