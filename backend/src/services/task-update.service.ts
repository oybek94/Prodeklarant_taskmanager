import { Currency, Prisma, StatePayment } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { createTaskVersion } from './task-version';
import { ensureCmrForInvoice } from './cmr-service';
import { ensureTirForInvoice } from './tir-service';
import { socketEmitter } from './socketEmitter';

/**
 * Vazifa maydonlarini tahrirlash — PATCH /tasks/:id.
 *
 * Filial o'zgarsa: davlat to'lovi snapshot'lari qayta yoziladi (branchSnapshotUpdate),
 * invoysning filiali va filialga bog'liq avtomatik maydonlari ko'chadi
 * (rebaseInvoiceBranchInfo), commit'dan keyin CMR/TIR qayta yaratiladi.
 */

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  clientId: z.number().optional(),
  branchId: z.number().optional(),
  comments: z.string().optional(),
  hasPsr: z.boolean().optional(),
  afterHoursDeclaration: z.boolean().optional(),
  afterHoursPayer: z.enum(['CLIENT', 'COMPANY']).optional(),
  driverPhone: z.string().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export class TaskUpdateError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'TaskUpdateError';
  }
}

export interface Actor {
  id: number;
  name: string;
  role: string;
}

const taskBeforeSelect = {
  id: true,
  title: true,
  clientId: true,
  branchId: true,
  comments: true,
  hasPsr: true,
  afterHoursDeclaration: true,
  afterHoursPayer: true,
  driverPhone: true,
  createdById: true,
  createdAt: true,
} satisfies Prisma.TaskSelect;

type TaskBefore = Prisma.TaskGetPayload<{ select: typeof taskBeforeSelect }>;

/** Faqat "ish vaqtidan tashqari" maydonlari yuborilganmi (buni har qanday xodim o'zgartira oladi) */
export function isOnlyAfterHoursUpdate(input: UpdateTaskInput): boolean {
  const hasOtherFields = input.title !== undefined || input.clientId !== undefined
    || input.branchId !== undefined || input.comments !== undefined
    || input.hasPsr !== undefined || input.driverPhone !== undefined;
  return !hasOtherFields && (input.afterHoursDeclaration !== undefined || input.afterHoursPayer !== undefined);
}

/** Haqiqiy o'zgarish bormi — versiya va updatedById faqat shunda yoziladi */
export function hasRealChanges(input: UpdateTaskInput, task: TaskBefore): boolean {
  return Boolean(
    (input.title && input.title !== task.title)
    || (input.clientId && input.clientId !== task.clientId)
    || (input.branchId && input.branchId !== task.branchId)
    || (input.comments !== undefined && input.comments !== task.comments)
    || (input.hasPsr !== undefined && input.hasPsr !== task.hasPsr)
    || (input.afterHoursDeclaration !== undefined && input.afterHoursDeclaration !== task.afterHoursDeclaration)
    || (input.afterHoursPayer !== undefined && input.afterHoursPayer !== task.afterHoursPayer)
    || (input.driverPhone !== undefined && input.driverPhone !== task.driverPhone)
  );
}

type BranchSnapshotFields = Pick<
  Prisma.TaskUncheckedUpdateInput,
  | 'snapshotCertificatePayment' | 'snapshotCertificatePayment_amount_original' | 'snapshotCertificatePayment_currency'
  | 'snapshotCertificatePayment_amount_uzs' | 'snapshotCertificatePayment_exchange_rate' | 'snapshotCertificatePayment_exchange_source'
  | 'snapshotPsrPrice' | 'snapshotPsrPrice_amount_original' | 'snapshotPsrPrice_currency'
  | 'snapshotPsrPrice_amount_uzs' | 'snapshotPsrPrice_exchange_rate' | 'snapshotPsrPrice_exchange_source'
  | 'snapshotWorkerPrice' | 'snapshotWorkerPrice_amount_original' | 'snapshotWorkerPrice_currency'
  | 'snapshotWorkerPrice_amount_uzs' | 'snapshotWorkerPrice_exchange_rate' | 'snapshotWorkerPrice_exchange_source'
>;

/**
 * Filial o'zgarganda sertifikat/PSR/ishchi narxi snapshot'lari (sof funksiya).
 * DIQQAT (eski xatti-harakat, vazifa yaratishdagidan farq qiladi): kurs doim 1 yoziladi;
 * hiredWorkerRate bu yerda "UZS" deb belgilanadi (yaratishda mijoz valyutasi bilan).
 * Bojxona (Deklaratsiya) to'lovi va shartnoma summasiga tegilmaydi.
 */
export function branchSnapshotUpdate(
  statePayment: StatePayment | null,
  clientCurrency: Currency,
  hiredWorkerRate: number | null
): BranchSnapshotFields {
  const pick = (original: Prisma.Decimal | null, uzs: Prisma.Decimal | null, base: Prisma.Decimal) =>
    clientCurrency === 'USD' ? Number(original ?? base) : Number(uzs ?? base);

  const cert = statePayment
    ? { original: pick(statePayment.certificatePayment_amount_original, statePayment.certificatePayment_amount_uzs, statePayment.certificatePayment),
        uzs: Number(statePayment.certificatePayment_amount_uzs ?? statePayment.certificatePayment) }
    : { original: 0, uzs: 0 };
  const psr = statePayment
    ? { original: pick(statePayment.psrPrice_amount_original, statePayment.psrPrice_amount_uzs, statePayment.psrPrice),
        uzs: Number(statePayment.psrPrice_amount_uzs ?? statePayment.psrPrice) }
    : { original: 0, uzs: 0 };
  const worker = statePayment
    ? { original: pick(statePayment.workerPrice_amount_original, statePayment.workerPrice_amount_uzs, statePayment.workerPrice),
        uzs: Number(statePayment.workerPrice_amount_uzs ?? statePayment.workerPrice) }
    : { original: 0, uzs: 0 };

  const out: BranchSnapshotFields = {
    snapshotCertificatePayment: cert.original,
    snapshotCertificatePayment_amount_original: cert.original,
    snapshotCertificatePayment_currency: clientCurrency,
    snapshotCertificatePayment_amount_uzs: cert.uzs,
    snapshotCertificatePayment_exchange_rate: 1,
    snapshotCertificatePayment_exchange_source: 'MANUAL',

    snapshotPsrPrice: psr.original,
    snapshotPsrPrice_amount_original: psr.original,
    snapshotPsrPrice_currency: clientCurrency,
    snapshotPsrPrice_amount_uzs: psr.uzs,
    snapshotPsrPrice_exchange_rate: 1,
    snapshotPsrPrice_exchange_source: 'MANUAL',

    snapshotWorkerPrice: worker.original,
    snapshotWorkerPrice_amount_original: worker.original,
    snapshotWorkerPrice_currency: clientCurrency,
    snapshotWorkerPrice_amount_uzs: worker.uzs,
    snapshotWorkerPrice_exchange_rate: 1,
    snapshotWorkerPrice_exchange_source: 'MANUAL',
  };

  // CertifierFeeConfig bo'lsa undagi hiredWorkerRate ustun
  if (hiredWorkerRate != null) {
    Object.assign(out, {
      snapshotWorkerPrice: hiredWorkerRate,
      snapshotWorkerPrice_amount_original: hiredWorkerRate,
      snapshotWorkerPrice_currency: 'UZS',
      snapshotWorkerPrice_amount_uzs: hiredWorkerRate,
      snapshotWorkerPrice_exchange_rate: 1,
      snapshotWorkerPrice_exchange_source: 'MANUAL',
    } satisfies BranchSnapshotFields);
  }
  return out;
}

interface BranchPlaceInfo {
  regionText: string | null;
  defaultRegionCode: { name: string; internalCode: string | null; externalCode: string | null } | null;
}

/**
 * Filialga bog'liq avtomatik invoys maydonlari (Место отгрузки груза, FSS tumani) yangi filialga o'tadi.
 * Foydalanuvchi qo'lda o'zgartirgan (eski filial qiymatiga teng bo'lmagan) qiymatlarga tegilmaydi.
 * @returns yangi additionalInfo yoki o'zgarish bo'lmasa null
 */
export function rebaseInvoiceBranchInfo(
  rawInfo: Prisma.JsonValue | null,
  oldBranch: BranchPlaceInfo | null,
  newBranch: BranchPlaceInfo
): Record<string, unknown> | null {
  const info: Record<string, unknown> =
    rawInfo && typeof rawInfo === 'object' && !Array.isArray(rawInfo) ? { ...(rawInfo as Record<string, unknown>) } : {};
  let changed = false;

  const currentPlace = String(info.shipmentPlace ?? '').trim();
  const oldPlace = (oldBranch?.regionText ?? '').trim();
  const newPlace = (newBranch.regionText ?? '').trim();
  if ((currentPlace === '' || currentPlace === oldPlace) && currentPlace !== newPlace) {
    info.shipmentPlace = newPlace;
    changed = true;
  }

  const currentRegionCode = String(info.fssRegionInternalCode ?? '').trim();
  const oldRegionCode = oldBranch?.defaultRegionCode?.internalCode?.trim() ?? '';
  const newRegion = newBranch.defaultRegionCode;
  if (currentRegionCode === '' || currentRegionCode === oldRegionCode) {
    const nextCode = newRegion?.internalCode?.trim() ?? '';
    if (currentRegionCode !== nextCode) {
      info.fssRegionInternalCode = nextCode;
      info.fssRegionName = newRegion?.name ?? '';
      info.fssRegionExternalCode = newRegion?.externalCode ?? '';
      changed = true;
    }
  }

  return changed ? info : null;
}

const branchPlaceSelect = {
  regionText: true,
  defaultRegionCode: { select: { name: true, internalCode: true, externalCode: true } },
} satisfies Prisma.BranchSelect;

/** Vazifani yangilaydi. Tekshiruv xatolarida TaskUpdateError tashlaydi. */
export async function updateTask(id: number, input: UpdateTaskInput, actor: Actor) {
  const task = await prisma.task.findUnique({ where: { id }, select: taskBeforeSelect });
  if (!task) throw new TaskUpdateError(404, 'Task not found');

  const isCreator = task.createdById === actor.id;
  const isAdmin = actor.role === 'ADMIN' || actor.role === 'MANAGER';
  // Faqat "ish vaqtidan tashqari" maydonlarini yangilashda har qanday xodimga ruxsat
  if (!isAdmin && !isCreator && !isOnlyAfterHoursUpdate(input)) {
    throw new TaskUpdateError(403, 'Faqat task yaratgan ishchi taskni o\'zgartirishi mumkin');
  }

  const branchChanged = Boolean(input.branchId && input.branchId !== task.branchId);
  const changed = hasRealChanges(input, task);

  // Oldin mavjud bo'lmagan mijoz/filial FK xatosi bilan 500 berardi
  const [clientExists, branchExists] = await Promise.all([
    input.clientId && input.clientId !== task.clientId
      ? prisma.client.findUnique({ where: { id: input.clientId }, select: { id: true } })
      : true,
    branchChanged
      ? prisma.branch.findUnique({ where: { id: input.branchId }, select: { id: true } })
      : true,
  ]);
  if (!clientExists) throw new TaskUpdateError(404, 'Mijoz topilmadi');
  if (!branchExists) throw new TaskUpdateError(404, 'Filial topilmadi');

  const updated = await prisma.$transaction(async (tx) => {
    if (changed) await createTaskVersion(tx, id, actor.id);

    const data: Prisma.TaskUncheckedUpdateInput = {
      ...(input.title && { title: input.title }),
      ...(input.clientId && { clientId: input.clientId }),
      ...(input.branchId && { branchId: input.branchId }),
      ...(input.comments !== undefined && { comments: input.comments || null }),
      ...(input.hasPsr !== undefined && { hasPsr: input.hasPsr }),
      ...(input.afterHoursDeclaration !== undefined && { afterHoursDeclaration: input.afterHoursDeclaration }),
      ...(input.afterHoursPayer !== undefined && { afterHoursPayer: input.afterHoursPayer }),
      ...(input.driverPhone !== undefined && { driverPhone: input.driverPhone || null }),
      ...(changed && { updatedById: actor.id }),
    };

    if (branchChanged && input.branchId) {
      // DIQQAT: mijoz valyutasi vazifaning ESKI mijozidan (shu so'rovda clientId ham o'zgarsa ham)
      const [statePayment, client, certConfig] = await Promise.all([
        tx.statePayment.findFirst({ where: { createdAt: { lte: task.createdAt } }, orderBy: { createdAt: 'desc' } }),
        tx.client.findUnique({ where: { id: task.clientId }, select: { dealAmount_currency: true, dealAmountCurrency: true } }),
        tx.certifierFeeConfig.findFirst({
          where: { branchId: input.branchId, createdAt: { lte: task.createdAt } },
          orderBy: { createdAt: 'desc' },
          select: { hiredWorkerRate: true },
        }),
      ]);
      const clientCurrency: Currency = client?.dealAmount_currency || client?.dealAmountCurrency || 'USD';
      Object.assign(data, branchSnapshotUpdate(statePayment, clientCurrency, certConfig ? Number(certConfig.hiredWorkerRate) : null));
    }

    const updatedTask = await tx.task.update({ where: { id }, data });

    if (branchChanged && input.branchId) {
      // Invoyslar jadvalida to'g'ri filial ko'rinsin
      await tx.invoice.updateMany({ where: { taskId: id }, data: { branchId: input.branchId } });

      const [oldBranch, newBranch, invoice] = await Promise.all([
        tx.branch.findUnique({ where: { id: task.branchId }, select: branchPlaceSelect }),
        tx.branch.findUnique({ where: { id: input.branchId }, select: branchPlaceSelect }),
        tx.invoice.findUnique({ where: { taskId: id }, select: { id: true, additionalInfo: true } }),
      ]);
      if (invoice && newBranch) {
        const info = rebaseInvoiceBranchInfo(invoice.additionalInfo, oldBranch, newBranch);
        if (info) {
          await tx.invoice.update({ where: { id: invoice.id }, data: { additionalInfo: info as Prisma.InputJsonObject } });
        }
      }
    }

    return updatedTask;
  }, { timeout: 30000, maxWait: 10000 });

  return { updated, branchChanged };
}

/** Commit'dan keyin: filial o'zgargan bo'lsa CMR/TIR (viloyat matni filialdan) qayta yaratiladi */
export async function regenerateTransportDocs(taskId: number, actorId: number): Promise<void> {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { taskId }, select: { id: true } });
    if (invoice) {
      await ensureCmrForInvoice({ invoiceId: invoice.id, uploadedById: actorId });
      await ensureTirForInvoice({ invoiceId: invoice.id, uploadedById: actorId });
    }
  } catch (error) {
    console.error('Filial o\'zgargandan keyin TIR/CMR qayta yaratilmadi:', error);
  }
}

export function broadcastTaskUpdated(taskId: number, changes: UpdateTaskInput, actor: Actor): void {
  socketEmitter.broadcastExcept(actor.id, 'task:updated', { taskId, changes, updatedBy: actor.name });
}
