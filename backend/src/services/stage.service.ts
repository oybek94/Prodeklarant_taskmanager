import { Prisma } from '@prisma/client';
import { computeDurations } from './stage-duration';
import { logKpiForStage, normalizeKpiStageName } from './kpi';
import { updateTaskStatus, generateQrTokenIfNeeded } from './task-status';
import { markProcessNotificationsRead } from './notificationService';
import { createTaskVersion } from './task-version';
import { processTypeForStage } from './process-stage-map';
import { ensureCmrForInvoice } from './cmr-service';
import { ensureTirForInvoice } from './tir-service';
import { socketEmitter } from './socketEmitter';
import { prisma } from '../prisma';

/**
 * Bosqich holatini o'zgartirishning yagona yo'li.
 *
 * Ikki kirish nuqtasi bor va ikkalasi ham shu yerdan o'tishi SHART:
 *  - PATCH /tasks/:taskId/stages/:stageId (bosqichni qo'lda belgilash/qaytarish)
 *  - POST /process/confirm (eslatmadagi "Bajarildi" tugmasi)
 * Oldin har biri o'z nusxasini yozgan va eslatma yo'li versiya tarixi va socket
 * xabarini tushirib qoldirgan edi. Yangi yon ta'sir qo'shilsa — faqat shu faylga.
 *
 * Pul hisobi (Deklaratsiya BXM/to'lov snapshot'i) bu yerda EMAS — u har bir yo'lda
 * alohida va hozircha bir-biridan farq qiladi.
 */

export type StageStatus = 'BOSHLANMAGAN' | 'TAYYOR';

const stageWithAssignee = {
  assignedTo: { select: { id: true, name: true } },
} satisfies Prisma.TaskStageInclude;

export type UpdatedStage = Prisma.TaskStageGetPayload<{ include: typeof stageWithAssignee }>;

/** O'zgarishdan OLDINGI bosqich holati */
export interface StageBefore {
  id: number;
  taskId: number;
  name: string;
  status: string;
  startedAt: Date | null;
  assignedToId: number | null;
}

export interface StageChangeResult {
  updated: UpdatedStage;
  needsQrToken: boolean;
}

/**
 * Tranzaksiya ichidagi qism: bosqichni yangilash, versiya, davomiylik, KPI,
 * bog'liq jarayon bildirishnomalari va vazifa holati.
 */
export async function applyStageStatusChange(
  tx: Prisma.TransactionClient,
  params: { stage: StageBefore; newStatus: StageStatus; actorId: number; now: Date }
): Promise<StageChangeResult> {
  const { stage, newStatus, actorId, now } = params;
  const completing = newStatus === 'TAYYOR';

  const updated = await tx.taskStage.update({
    where: { id: stage.id },
    data: {
      status: newStatus,
      completedAt: completing ? now : null,
      startedAt: completing && !stage.startedAt ? now : stage.startedAt,
      assignedToId: completing ? actorId : stage.assignedToId,
    },
    include: stageWithAssignee,
  });

  if (stage.status !== newStatus) {
    await createTaskVersion(tx, stage.taskId, actorId, 'STAGE', {
      id: updated.id,
      name: updated.name,
      status: updated.status,
      assignedTo: updated.assignedTo,
    });
  }

  if (completing) {
    await computeDurations(tx, stage.taskId);
    await logKpiForStage(tx, stage.taskId, updated.name, actorId, now);

    // Bosqich tayyor — shu bosqichga bog'liq barcha jarayon eslatmalari endi keraksiz
    const relatedProcessType = processTypeForStage(stage.name);
    if (relatedProcessType) {
      const relatedProcesses = await tx.tasksProcess.findMany({
        where: { taskId: stage.taskId, processType: relatedProcessType },
        select: { id: true },
      });
      for (const rp of relatedProcesses) {
        await markProcessNotificationsRead(rp.id, tx);
      }
    }
  } else if (stage.status === 'TAYYOR' && stage.assignedToId) {
    // TAYYOR → BOSHLANMAGAN: faqat o'sha bosqichni tayyor qilgan xodimning KPI yozuvi o'chadi
    await tx.kpiLog.deleteMany({
      where: {
        taskId: stage.taskId,
        stageName: normalizeKpiStageName(stage.name),
        userId: stage.assignedToId,
      },
    });
  }

  const needsQrToken = await updateTaskStatus(tx, stage.taskId);
  return { updated, needsQrToken };
}

/**
 * Tranzaksiya commit bo'lgandan keyingi qism: QR token, Invoys tayyor bo'lganda
 * CMR/TIR hujjatlari, va boshqa xodimlar ekranini yangilovchi socket xabari.
 */
export async function afterStageStatusCommitted(params: {
  stage: StageBefore;
  newStatus: StageStatus;
  result: StageChangeResult;
  actor: { id: number; name: string };
}): Promise<void> {
  const { stage, newStatus, result, actor } = params;

  if (result.needsQrToken) {
    // Fire and forget — xato generateQrTokenIfNeeded ichida log qilinadi
    generateQrTokenIfNeeded(stage.taskId).catch(() => {});
  }

  if (stage.name === 'Invoys' && newStatus === 'TAYYOR' && stage.status !== 'TAYYOR') {
    const invoice = await prisma.invoice.findUnique({
      where: { taskId: stage.taskId },
      select: { id: true },
    });
    if (invoice) {
      await ensureCmrForInvoice({ invoiceId: invoice.id, uploadedById: actor.id });
      await ensureTirForInvoice({ invoiceId: invoice.id, uploadedById: actor.id });
    }
  }

  socketEmitter.broadcastExcept(actor.id, 'task:stageUpdated', {
    taskId: stage.taskId,
    stageId: stage.id,
    stage: result.updated,
    updatedBy: actor.name,
  });
}
