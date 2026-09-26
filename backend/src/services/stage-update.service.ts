import { z } from 'zod';
import { prisma } from '../prisma';
import { ValidationService } from './validation.service';
import { applyStageStatusChange, afterStageStatusCommitted, UpdatedStage } from './stage.service';
import { declarationClientSelect, declarationCompletedFields, declarationResetFields, bxmAt } from './declaration-pricing';

/**
 * PATCH /tasks/:taskId/stages/:stageId — bosqichni qo'lda belgilash/qaytarish.
 * Holat o'zgarishining o'zi va yon ta'sirlari — stage.service.ts; bu yerda faqat
 * ruxsat tekshiruvlari va Deklaratsiya pul snapshot'i (BXM × koef, declaration-pricing.ts).
 */

export const updateStageSchema = z.object({
  status: z.enum(['BOSHLANMAGAN', 'TAYYOR']),
  customsPaymentMultiplier: z.coerce.number().min(0.5).max(4).optional(), // BXM koeffitsienti (0.5–4)
  afterHoursDeclaration: z.boolean().optional(),
  afterHoursPayer: z.enum(['CLIENT', 'COMPANY']).optional(),
  skipValidation: z.boolean().optional(),
  force: z.boolean().optional(), // Admin boshqa ishchining jarayonini qaytarish uchun
});

export type UpdateStageInput = z.infer<typeof updateStageSchema>;

export class StageUpdateError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Javobga qo'shiladigan qo'shimcha maydonlar (409 tasdiqlash uchun) */
    public readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'StageUpdateError';
  }
}

export interface StageActor {
  id: number;
  role: string;
  name: string;
}

export async function updateStageFromApi(
  taskId: number,
  stageId: number,
  input: UpdateStageInput,
  actor: StageActor,
): Promise<UpdatedStage> {
  const canAccess = await new ValidationService(prisma).canUserAccessTask(taskId, actor.id, actor.role);
  if (!canAccess) throw new StageUpdateError(403, 'Bu taskga kirish huquqingiz yo\'q');

  const stage = await prisma.taskStage.findUnique({
    where: { id: stageId },
    include: { assignedTo: { select: { id: true, name: true } } },
  });
  if (!stage || stage.taskId !== taskId) throw new StageUpdateError(404, 'Stage not found');

  // Pochta: tayyor qilish uchun kamida bitta hujjat
  if (stage.name === 'Pochta' && input.status === 'TAYYOR' && stage.status !== 'TAYYOR') {
    const documentCount = await prisma.taskDocument.count({ where: { taskId } });
    if (documentCount === 0) {
      throw new StageUpdateError(400, 'Pochta jarayonini tayyor qilish uchun kamida bitta hujjat yuklanishi kerak');
    }
  }

  // TAYYOR → BOSHLANMAGAN: faqat bajargan odam yoki admin (boshqa odamniki bo'lsa — force bilan)
  if (stage.status === 'TAYYOR' && input.status !== 'TAYYOR') {
    const isStageOwner = stage.assignedToId === actor.id;
    const isAdmin = actor.role === 'ADMIN';
    if (!isStageOwner && !isAdmin) {
      throw new StageUpdateError(403, 'Faqat jarayonni tayyor qilgan odam yoki admin jarayon statusini o\'zgartirishi mumkin');
    }
    if (isAdmin && !isStageOwner && !input.force) {
      throw new StageUpdateError(409, 'Bu jarayonni boshqa ishchi tugatgan. Qaytarishni tasdiqlang.', {
        requireConfirmation: true,
        completedBy: stage.assignedTo?.name || 'Noma\'lum',
        completedById: stage.assignedToId,
        stageName: stage.name,
      });
    }
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    // Deklaratsiya narxi (BXM × koef): bojxona to'lovi so'mda, CASH_ALL_INCLUSIVE da
    // mijoz summasiga qo'shimcha — qarang services/declaration-pricing.ts
    const isDeclaration = stage.name === 'Deklaratsiya';
    const multiplier = input.status === 'TAYYOR' ? input.customsPaymentMultiplier : undefined;
    const reverting = input.status === 'BOSHLANMAGAN' && stage.status === 'TAYYOR';
    if (isDeclaration && (multiplier || reverting)) {
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          afterHoursDeclaration: true,
          afterHoursPayer: true,
          snapshotDealAmount_exchange_rate: true,
          snapshotDealAmountExchangeRate: true,
          client: { select: declarationClientSelect },
        },
      });
      if (task && multiplier) {
        await tx.task.update({
          where: { id: taskId },
          data: declarationCompletedFields({
            client: task.client,
            task,
            multiplier: Number(multiplier),
            afterHoursDeclaration: input.afterHoursDeclaration ?? task.afterHoursDeclaration ?? false,
            afterHoursPayer: input.afterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT',
            bxm: await bxmAt(tx, new Date()),
          }),
        });
      } else if (task && reverting) {
        await tx.task.update({ where: { id: taskId }, data: declarationResetFields(task.client, task) });
      }
    }

    return applyStageStatusChange(tx, { stage, newStatus: input.status, actorId: actor.id, now });
  }, {
    maxWait: 30000,
    timeout: 30000, // masofaviy baza uchun
  });

  await afterStageStatusCommitted({
    stage,
    newStatus: input.status,
    result,
    actor: { id: actor.id, name: actor.name },
  });

  return result.updated;
}
