import { PrismaClient, Prisma, TaskStatus } from '@prisma/client';

/**
 * Calculate task status based on stages:
 * - BOSHLANMAGAN: All stages are not started
 * - JARAYONDA: At least one stage is completed but not all
 * - TAYYOR: All stages are completed
 */
export async function calculateTaskStatus(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<TaskStatus> {
  const stages = await tx.taskStage.findMany({
    where: { taskId },
    select: { status: true },
  });

  if (stages.length === 0) {
    return TaskStatus.BOSHLANMAGAN;
  }

  const completedCount = stages.filter((s) => s.status === 'TAYYOR').length;
  const totalCount = stages.length;

  if (completedCount === 0) {
    return TaskStatus.BOSHLANMAGAN;
  } else if (completedCount === totalCount) {
    return TaskStatus.TAYYOR;
  } else {
    return TaskStatus.JARAYONDA;
  }
}

/**
 * Update task status based on its stages
 */
export async function updateTaskStatus(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<void> {
  const newStatus = await calculateTaskStatus(tx, taskId);
  await tx.task.update({
    where: { id: taskId },
    data: { status: newStatus },
  });
}

