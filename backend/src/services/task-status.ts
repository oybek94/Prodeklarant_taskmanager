import { PrismaClient, Prisma, TaskStatus } from '@prisma/client';
import { archiveTaskDocuments } from './archive-documents';

/**
 * Calculate task status based on stages using the formula:
 * 1. Barcha jarayonlar bo'sh = BOSHLANMAGAN
 * 2. Deklaratsiya = TAYYOR → TAYYOR
 * 3. Tekshirish = TAYYOR → TEKSHIRILGAN
 * 4. Topshirish = TAYYOR → TOPSHIRILDI
 * 5. Pochta = TAYYOR → YAKUNLANDI
 * 6. Invoys, Zayavka, TIR-SMR, ST, FITO TAYYOR → JARAYONDA
 */
export async function calculateTaskStatus(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<TaskStatus> {
  const stages = await (tx as any).taskStage.findMany({
    where: { taskId },
    select: { name: true, status: true },
  });

  if (stages.length === 0) {
    return TaskStatus.BOSHLANMAGAN;
  }

  // Create a map of stage names to status
  const stageMap = new Map(stages.map((s: any) => [s.name, s.status]));
  
  // Helper function to check if stage is TAYYOR
  const isReady = (name: string): boolean => {
    return stageMap.get(name) === 'TAYYOR';
  };

  // 1. Check if all stages are blank (BOSHLANMAGAN)
  const allBlank = stages.every((s: any) => s.status === 'BOSHLANMAGAN');
  if (allBlank) {
    return TaskStatus.BOSHLANMAGAN;
  }

  // Priority order based on formula (check from highest to lowest priority):
  // 5. Pochta = TAYYOR → YAKUNLANDI
  if (isReady('Pochta')) {
    return TaskStatus.YAKUNLANDI;
  }

  // 4. Topshirish = TAYYOR → TOPSHIRILDI
  if (isReady('Topshirish')) {
    return TaskStatus.TOPSHIRILDI;
  }

  // 3. Tekshirish = TAYYOR → TEKSHIRILGAN
  if (isReady('Tekshirish')) {
    return TaskStatus.TEKSHIRILGAN;
  }

  // 2. Deklaratsiya = TAYYOR → TAYYOR
  if (isReady('Deklaratsiya')) {
    return TaskStatus.TAYYOR;
  }

  // 6. Invoys, Zayavka, TIR-SMR, ST, FITO TAYYOR → JARAYONDA
  const earlyStages = ['Invoys', 'Zayavka', 'TIR-SMR', 'ST', 'Fito', 'FITO'];
  const hasEarlyStageReady = earlyStages.some((name) => isReady(name));
  if (hasEarlyStageReady) {
    return TaskStatus.JARAYONDA;
  }

  // If any other stage is TAYYOR, also return JARAYONDA
  const hasAnyReady = stages.some((s: any) => s.status === 'TAYYOR');
  if (hasAnyReady) {
    return TaskStatus.JARAYONDA;
  }

  // Otherwise -> BOSHLANMAGAN
  return TaskStatus.BOSHLANMAGAN;
}

/**
 * Update task status based on its stages
 */
export async function updateTaskStatus(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<void> {
  // Eski statusni olish
  const oldTask = await (tx as any).task.findUnique({
    where: { id: taskId },
    select: { status: true },
  });

  const newStatus = await calculateTaskStatus(tx, taskId);
  await (tx as any).task.update({
    where: { id: taskId },
    data: { status: newStatus },
  });

  // Agar task YAKUNLANDI bo'lsa va oldin YAKUNLANDI bo'lmagan bo'lsa, hujjatlarni arxivga ko'chirish
  if (newStatus === TaskStatus.YAKUNLANDI && oldTask?.status !== TaskStatus.YAKUNLANDI) {
    try {
      await archiveTaskDocuments(tx, taskId);
    } catch (error) {
      console.error('Error archiving task documents:', error);
      // Xatolik bo'lsa ham task status o'zgarishi kerak, shuning uchun error'ni log qilamiz lekin throw qilmaymiz
    }
  }
}

