import { prisma } from '../prisma';
import { removeUnreferencedUploads } from './uploaded-file-cleanup';

export class TaskDeleteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface TaskDeleteActor {
  id: number;
  role: string;
}

/**
 * Vazifani o'chirish — DELETE /tasks/:id.
 *
 * Faqat ADMIN yoki yaratuvchi, va faqat hech bir bosqichi boshlanmagan vazifa.
 * Vazifaga tranzaksiya bog'langan bo'lsa o'chirilmaydi: avval ular jimgina o'chirilar,
 * hisob (AccountBalance) qoldig'i esa qaytarilmas edi — pul yozuvi yo'qolib, kassa
 * haqiqatdan farq qilib qolardi. Tranzaksiyani Moliya bo'limidan o'chirish kerak
 * (u yerda qoldiq to'g'ri qaytariladi).
 * Hujjat fayllari yozuvlar o'chirilgach diskdan ham olib tashlanadi.
 */
export async function deleteTask(id: number, actor: TaskDeleteActor): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      status: true,
      createdById: true,
      stages: { select: { status: true } },
      documents: { select: { fileUrl: true } },
      _count: { select: { transactions: true } },
    },
  });
  if (!task) throw new TaskDeleteError(404, 'Task not found');

  if (actor.role !== 'ADMIN' && task.createdById !== actor.id) {
    throw new TaskDeleteError(403, 'Ruxsat yo\'q — faqat admin yoki task yaratuvchisi o\'chirishi mumkin');
  }
  if (task.status === 'JARAYONDA') {
    throw new TaskDeleteError(400, 'Jarayonda bo\'lgan taskni o\'chirish mumkin emas');
  }
  if (task.stages.some((stage) => stage.status !== 'BOSHLANMAGAN')) {
    throw new TaskDeleteError(400, 'Taskni o\'chirish uchun barcha jarayonlar boshlanmagan (BOSHLANMAGAN) bo\'lishi kerak');
  }
  if (task._count.transactions > 0) {
    throw new TaskDeleteError(
      400,
      `Taskga ${task._count.transactions} ta tranzaksiya bog'langan. Avval ularni Moliya bo'limidan o'chiring`
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskError.deleteMany({ where: { taskId: id } });
    await tx.taskStage.deleteMany({ where: { taskId: id } });
    await tx.kpiLog.deleteMany({ where: { taskId: id } });
    // Tekshiruvdan keyin qo'shilib qolgan tranzaksiya o'chmaydi: bazada Transaction.taskId — ON DELETE SET NULL
    await tx.task.delete({ where: { id } });
  });

  await removeUnreferencedUploads(task.documents.map((doc) => doc.fileUrl));
}
