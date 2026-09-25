import { Prisma } from '@prisma/client';

/**
 * Vazifaning joriy holatini (barcha bosqichlari bilan) TaskVersion jadvaliga yozadi.
 * `tasks.ts` dan ko'chirildi — endi stage.service ham ishlatadi.
 */
export async function createTaskVersion(tx: Prisma.TransactionClient, taskId: number, changedBy: number, changeType: 'TASK' | 'STAGE' = 'TASK', stageInfo?: any) {
  // Get current version number
  const lastVersion = await tx.taskVersion.findFirst({
    where: { taskId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (lastVersion?.version || 0) + 1;

  // Get current task data
  const task = await tx.task.findUnique({ 
    where: { id: taskId },
    include: {
      stages: {
        orderBy: { stageOrder: 'asc' },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  if (!task) return;

  // Detect changes
  const changes: any = {
    changeType,
  };
  
  if (changeType === 'TASK') {
    // Task field changes
    if (task.title) changes.title = task.title;
    if (task.status) changes.status = task.status;
    if (task.comments) changes.comments = task.comments;
    if (task.hasPsr !== undefined) changes.hasPsr = task.hasPsr;
    if (task.afterHoursDeclaration !== undefined) changes.afterHoursDeclaration = task.afterHoursDeclaration;
    if (task.afterHoursPayer) changes.afterHoursPayer = task.afterHoursPayer;
    if (task.driverPhone) changes.driverPhone = task.driverPhone;
  } else if (changeType === 'STAGE' && stageInfo) {
    // Stage changes
    changes.stage = {
      id: stageInfo.id,
      name: stageInfo.name,
      status: stageInfo.status,
      assignedTo: stageInfo.assignedTo ? {
        id: stageInfo.assignedTo.id,
        name: stageInfo.assignedTo.name,
      } : null,
    };
  }

  // Include all stages in the version
  const stagesData = task.stages.map((stage: any) => ({
    id: stage.id,
    name: stage.name,
    status: stage.status,
    stageOrder: stage.stageOrder,
    assignedTo: stage.assignedTo ? {
      id: stage.assignedTo.id,
      name: stage.assignedTo.name,
    } : null,
    startedAt: stage.startedAt,
    completedAt: stage.completedAt,
  }));

  // Create version
  await tx.taskVersion.create({
    data: {
      taskId,
      version: nextVersion,
      title: task.title,
      status: task.status,
      comments: task.comments || null,
      hasPsr: task.hasPsr,
      driverPhone: task.driverPhone || null,
      clientId: task.clientId,
      branchId: task.branchId,
      changedBy,
      changes: {
        ...changes,
        stages: stagesData,
      } as any,
    },
  });
}
