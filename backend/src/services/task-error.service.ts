import { z } from 'zod';
import { Prisma, TaskError } from '@prisma/client';
import { prisma } from '../prisma';
import { socketEmitter } from './socketEmitter';

/**
 * Vazifa xatolari (TaskError): qo'shish, tahrirlash, o'chirish (so'rov → admin tasdig'i)
 * va admin bahosi (XP bounty). Route: routes/tasks.ts /:taskId/errors*.
 *
 * XP qoidasi: baholanganda xato qilgan ishchidan bountyXp ayriladi, topgan odamga qo'shiladi
 * (o'z xatosini topsa — faqat jarima). Baholangan xato o'chirilsa — teskarisi.
 */

export class TaskErrorError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'TaskErrorError';
  }
}

export interface ErrorActor {
  id: number;
  role: string;
}

export const createErrorSchema = z.object({
  stageName: z.string(),
  workerId: z.number().nullable(),
  isClientError: z.boolean().optional(),
  amount: z.number(),
  comment: z.string().optional(),
  date: z.coerce.date(),
});

export const updateErrorSchema = z.object({
  stageName: z.string().optional(),
  workerId: z.number().nullable().optional(),
  amount: z.number().optional(),
  comment: z.string().optional(),
  date: z.coerce.date().optional(),
});

export const rateErrorSchema = z.object({
  rating: z.number().min(0).max(100),
});

const EDIT_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const BOUNTY_UZS_PER_POINT = 5000;

const listInclude = {
  worker: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  task: { select: { id: true, title: true } },
} satisfies Prisma.TaskErrorInclude;

/** Xato summasi faqat so'mda yuritiladi — barcha pul maydonlari bir xil. */
function uzsAmountFields(amount: number) {
  return {
    amount,
    amount_uzs: amount,
    amount_original: amount,
    convertedUzsAmount: amount,
    currency: 'UZS' as const,
    currency_universal: 'UZS' as const,
  };
}

export function parseId(raw: unknown, label: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new TaskErrorError(400, `Noto'g'ri ${label}`);
  return id;
}

/** Xatoni topadi va URL dagi vazifaga tegishliligini tekshiradi. */
async function findErrorOfTask(taskId: number, errorId: number): Promise<TaskError> {
  const error = await prisma.taskError.findUnique({ where: { id: errorId } });
  if (!error || error.taskId !== taskId) throw new TaskErrorError(404, 'Xato topilmadi');
  return error;
}

function assertCanModify(error: TaskError, actor: ErrorActor, action: string): void {
  if (actor.role === 'ADMIN') return;
  const tooOld = Date.now() - new Date(error.createdAt).getTime() > EDIT_WINDOW_MS;
  if (error.createdById !== actor.id || tooOld) {
    throw new TaskErrorError(403, `Xatoni faqat 2 kun ichida qo‘shgan odam ${action}`);
  }
}

export function listTaskErrors(taskId: number) {
  return prisma.taskError.findMany({
    where: { taskId },
    include: { worker: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  });
}

export function listUnratedErrors() {
  return prisma.taskError.findMany({
    where: { adminRating: null, workerId: { not: null } },
    include: listInclude,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export function listPendingDeleteErrors() {
  return prisma.taskError.findMany({
    where: { deleteRequested: true },
    include: listInclude,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function createTaskError(taskId: number, input: z.infer<typeof createErrorSchema>, actor: ErrorActor) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, client: { select: { name: true } } },
  });
  if (!task) throw new TaskErrorError(404, 'Vazifa topilmadi');

  const created = await prisma.$transaction(async (tx) => {
    const error = await tx.taskError.create({
      data: {
        taskId,
        stageName: input.stageName,
        workerId: input.workerId,
        ...uzsAmountFields(input.amount),
        comment: input.comment,
        date: input.date,
        createdById: actor.id,
      },
      include: { worker: { select: { id: true, name: true } } },
    });

    // Mijoz xatosi — summa mijozning qarziga yoziladi
    if (input.isClientError && task.client) {
      const name = task.client.name.trim();
      const person = await tx.debtPerson.upsert({ where: { name }, update: {}, create: { name } });
      await tx.debt.create({
        data: {
          debtPersonId: person.id,
          amount: input.amount,
          currency: 'UZS',
          comment: `Xatolik: Task #${taskId} uchun mijoz xatosi. ${input.comment || ''}`.trim(),
          date: input.date,
        },
      });
    }
    return error;
  });

  socketEmitter.broadcast('admin_new_error_report', { error: created, event: 'Yangi xato hisoboti kelib tushdi' });
  socketEmitter.broadcast('task:errorUpdated', { taskId });
  return created;
}

export async function updateTaskError(
  taskId: number,
  errorId: number,
  input: z.infer<typeof updateErrorSchema>,
  actor: ErrorActor,
) {
  const error = await findErrorOfTask(taskId, errorId);
  assertCanModify(error, actor, 'o‘zgartira oladi');

  // Baholangandan keyin ishchi almashsa, o'chirishda XP boshqa odamga qaytib qolardi
  if (error.adminRating !== null && input.workerId !== undefined && input.workerId !== error.workerId) {
    throw new TaskErrorError(400, 'Baholangan xatoning ishchisini o‘zgartirib bo‘lmaydi');
  }

  const updated = await prisma.taskError.update({
    where: { id: errorId },
    data: {
      ...(input.stageName && { stageName: input.stageName }),
      ...(input.workerId !== undefined && { workerId: input.workerId }),
      ...(input.amount !== undefined && uzsAmountFields(input.amount)),
      ...(input.comment !== undefined && { comment: input.comment }),
      ...(input.date && { date: input.date }),
    },
    include: { worker: { select: { id: true, name: true } } },
  });

  socketEmitter.broadcast('task:errorUpdated', { taskId: updated.taskId });
  return updated;
}

/** Baholangan xato o'chirilganda XP ni teskari qaytaradi (rateTaskError ning aksi). */
async function revertBountyXp(tx: Prisma.TransactionClient, error: TaskError): Promise<void> {
  if (error.adminRating === null || !error.bountyXp || !error.workerId) return;
  await tx.user.update({ where: { id: error.workerId }, data: { xp: { increment: error.bountyXp } } });
  if (error.workerId !== error.createdById) {
    await tx.user.update({ where: { id: error.createdById }, data: { xp: { decrement: error.bountyXp } } });
  }
}

async function deleteWithXpRevert(error: TaskError): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await revertBountyXp(tx, error);
    await tx.taskError.delete({ where: { id: error.id } });
  });
  socketEmitter.broadcast('task:errorUpdated', { taskId: error.taskId });
}

/** Admin darhol o'chiradi; boshqalar o'chirish so'rovini yuboradi. */
export async function deleteTaskError(
  taskId: number,
  errorId: number,
  actor: ErrorActor,
): Promise<'deleted' | 'requested'> {
  const error = await findErrorOfTask(taskId, errorId);
  assertCanModify(error, actor, 'o‘chira oladi');

  if (actor.role !== 'ADMIN') {
    await prisma.taskError.update({ where: { id: errorId }, data: { deleteRequested: true } });
    return 'requested';
  }
  await deleteWithXpRevert(error);
  return 'deleted';
}

export async function approveDeleteRequest(taskId: number, errorId: number): Promise<void> {
  const error = await findErrorOfTask(taskId, errorId);
  await deleteWithXpRevert(error);
}

export async function rejectDeleteRequest(taskId: number, errorId: number): Promise<void> {
  await findErrorOfTask(taskId, errorId);
  await prisma.taskError.update({ where: { id: errorId }, data: { deleteRequested: false } });
}

function xpMetadata(type: 'XP_LOSS' | 'XP_GAIN', xp: number, error: { stageName: string; comment: string | null; task: { title: string } | null }) {
  return {
    isXpAnimation: true,
    type,
    xpAmount: xp,
    stageName: error.stageName,
    taskTitle: error.task?.title || '',
    comment: error.comment || '',
  };
}

export async function rateTaskError(taskId: number, errorId: number, rating: number) {
  const error = await findErrorOfTask(taskId, errorId);
  if (error.adminRating !== null) throw new TaskErrorError(400, 'Bu xato allaqachon baholangan');
  if (error.workerId === null) throw new TaskErrorError(400, 'Mijoz tomonidan qilingan xato baholanmaydi');

  const bountyXp = rating;
  const { updated, notifications } = await prisma.$transaction(async (tx) => {
    // Shartli yangilash: parallel ikki baho XP ni ikki marta o'tkazmasin
    const claimed = await tx.taskError.updateMany({
      where: { id: errorId, adminRating: null },
      data: {
        adminRating: rating,
        adminRatedAt: new Date(),
        bountyRewardUzs: rating * BOUNTY_UZS_PER_POINT,
        bountyXp,
      },
    });
    if (claimed.count === 0) throw new TaskErrorError(400, 'Bu xato allaqachon baholangan');

    const rated = await tx.taskError.findUniqueOrThrow({ where: { id: errorId }, include: listInclude });
    const workerId = rated.workerId as number;
    const selfFound = workerId === rated.createdById;
    const created: { userId: number; id: number; metadata: Prisma.JsonValue }[] = [];

    await tx.user.update({ where: { id: workerId }, data: { xp: { decrement: bountyXp } } });
    const lossMessage = selfFound
      ? `O'z xatoyingizni tasdiqlaganingiz uchun ${bountyXp} XP jarima.`
      : `${rated.stageName} da xato qilganingiz uchun ${bountyXp} XP ayrildi.`;
    created.push(await tx.notification.create({
      data: { userId: workerId, type: 'SYSTEM', title: 'XP Ayrildi', message: lossMessage, metadata: xpMetadata('XP_LOSS', bountyXp, rated) },
    }));

    if (!selfFound) {
      await tx.user.update({ where: { id: rated.createdById }, data: { xp: { increment: bountyXp } } });
      created.push(await tx.notification.create({
        data: {
          userId: rated.createdById,
          type: 'SYSTEM',
          title: 'XP Qo\'shildi',
          message: `${rated.stageName} dagi xatoni topganingiz uchun ${bountyXp} XP qo'shildi.`,
          metadata: xpMetadata('XP_GAIN', bountyXp, rated),
        },
      }));
    }
    return { updated: rated, notifications: created };
  });

  for (const n of notifications) {
    socketEmitter.toUser(n.userId, 'XP_ANIMATION', { ...(n.metadata as Prisma.JsonObject), notificationId: n.id });
  }
  socketEmitter.broadcast('user:bounty_awarded', updated);
  return updated;
}
