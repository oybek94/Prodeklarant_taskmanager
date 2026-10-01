import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { createTaskVersion } from './task-version';
import { socketEmitter } from './socketEmitter';
import { buildDealSnapshot, buildFeeSnapshot, loadPricingInputs, clientPricingSelect } from './task-create.service';
import { declarationClientSelect, declarationCompletedFields, bxmAt } from './declaration-pricing';
import { taskUsdRate } from './task-money';

/**
 * Vazifa maydonlarini tahrirlash — PATCH /tasks/:id.
 *
 * Filial yoki mijoz o'zgarsa: narx snapshot'i vazifa yaratishdagi qoida bilan qayta
 * hisoblanadi (repriceTask — to'lovlar so'mda, shartnoma yangi mijoz narxida). Filial o'zgarsa
 * invoysning filiali va filialga bog'liq avtomatik maydonlari ko'chadi
 * (rebaseInvoiceBranchInfo), commit'dan keyin CMR/TIR qayta yaratiladi.
 * Shartnoma (contractId) o'zgarsa invoys shartnomasi va shartnomadan keladigan maydonlar
 * invoys sahifasidagi shartnoma tanlash bilan bir xil yangilanadi (applyContractToInvoiceInfo).
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
  contractId: z.number().int().positive().optional(),
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
  customsPaymentMultiplier: true,
  snapshotDealAmount_exchange_rate: true,
  snapshotDealAmountExchangeRate: true,
} satisfies Prisma.TaskSelect;

type TaskBefore = Prisma.TaskGetPayload<{ select: typeof taskBeforeSelect }>;

/** Faqat "ish vaqtidan tashqari" maydonlari yuborilganmi (buni har qanday xodim o'zgartira oladi) */
export function isOnlyAfterHoursUpdate(input: UpdateTaskInput): boolean {
  const hasOtherFields = input.title !== undefined || input.clientId !== undefined
    || input.branchId !== undefined || input.comments !== undefined
    || input.hasPsr !== undefined || input.driverPhone !== undefined || input.contractId !== undefined;
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

interface ContractInvoiceFields {
  deliveryTerms: string | null;
  customsAddress: string | null;
  gln: string | null;
  paymentMethod: string | null;
}

/**
 * Shartnomadan keladigan invoys maydonlari — invoys sahifasidagi handleContractSelect bilan bir qoida:
 * birinchi yetkazib berish sharti va unga juft bojxona manzili, to'lov shartlari, GLN, to'lov usuli.
 */
export function applyContractToInvoiceInfo(
  rawInfo: Prisma.JsonValue | null,
  contract: ContractInvoiceFields
): Record<string, unknown> {
  const info: Record<string, unknown> =
    rawInfo && typeof rawInfo === 'object' && !Array.isArray(rawInfo) ? { ...(rawInfo as Record<string, unknown>) } : {};

  const deliveryTerms = String(contract.deliveryTerms ?? '').split('\n').map((s) => s.trim());
  const customsAddresses = String(contract.customsAddress ?? '').split('\n').map((s) => s.trim());
  const firstTerm = deliveryTerms.find(Boolean) ?? '';

  info.paymentTerms = contract.deliveryTerms ?? '';
  if (firstTerm) info.deliveryTerms = firstTerm;
  info.customsAddress = firstTerm ? (customsAddresses[deliveryTerms.indexOf(firstTerm)] ?? '') : '';
  if (contract.gln != null) info.gln = contract.gln;
  if (contract.paymentMethod) info.paymentMethod = contract.paymentMethod;
  return info;
}

const contractInvoiceSelect = {
  id: true,
  clientId: true,
  contractNumber: true,
  deliveryTerms: true,
  customsAddress: true,
  gln: true,
  paymentMethod: true,
} satisfies Prisma.ContractSelect;

type ContractForInvoice = Prisma.ContractGetPayload<{ select: typeof contractInvoiceSelect }>;

/**
 * Shartnoma almashtirish tekshiruvi — hech narsa yozilmasidan oldin. O'zgarish bo'lmasa null.
 * Invoysli vazifada mijoz almashtirilsa shartnoma majburiy (invoys eski mijoz shartnomasida qolmasin).
 */
async function resolveContractChange(
  taskId: number,
  contractId: number | undefined,
  targetClientId: number,
  clientChanged: boolean
): Promise<{ invoiceId: number; contract: ContractForInvoice } | null> {
  if (contractId === undefined && !clientChanged) return null;

  const invoice = await prisma.invoice.findUnique({
    where: { taskId },
    select: { id: true, invoiceNumber: true, contractId: true },
  });
  if (contractId === undefined) {
    if (invoice) throw new TaskUpdateError(400, 'Mijoz almashtirilganda invoys shartnomasini ham tanlang');
    return null;
  }
  if (!invoice) {
    throw new TaskUpdateError(400, "Vazifada invoys yo'q — shartnoma invoys yaratilganda tanlanadi");
  }
  if (invoice.contractId === contractId && !clientChanged) return null;

  const contract = await prisma.contract.findUnique({ where: { id: contractId }, select: contractInvoiceSelect });
  if (!contract || contract.clientId !== targetClientId) {
    throw new TaskUpdateError(400, 'Shartnoma topilmadi yoki bu mijozga tegishli emas');
  }
  if (invoice.contractId === contractId) return null;

  // Invoys raqami shartnoma ichida yagona
  const duplicate = await prisma.invoice.findFirst({
    where: { contractId, invoiceNumber: invoice.invoiceNumber, NOT: { id: invoice.id } },
    select: { id: true },
  });
  if (duplicate) {
    throw new TaskUpdateError(400, `Tanlangan shartnomada ${invoice.invoiceNumber}-raqamli invoys allaqachon bor — avval invoys raqamini o'zgartiring`);
  }

  return { invoiceId: invoice.id, contract };
}

const branchPlaceSelect = {
  regionText: true,
  defaultRegionCode: { select: { name: true, internalCode: true, externalCode: true } },
} satisfies Prisma.BranchSelect;

/**
 * Filial yoki mijoz almashtirilganda narx snapshot'ini qayta hisoblaydi — vazifa
 * yaratishdagi bilan BIR XIL qoida (davlat to'lovi va kurs vazifa yaratilgan paytdagi):
 * - to'lovlar (sertifikat, PSR, ishchi, bojxona) — so'mda, yangi filial tarifi bilan;
 * - mijoz almashtirilsa shartnoma summasi yangi mijoz narxidan;
 * - Deklaratsiya yakunlangan bo'lsa (koef bor) bojxona to'lovi BXM bo'yicha qoladi,
 *   mijoz almashtirilsa BXM qo'shimchasi yangi mijoz summasiga yakunlangan paytdagi BXM bilan qo'shiladi.
 */
async function repriceTask(
  tx: Prisma.TransactionClient,
  task: TaskBefore,
  target: { clientId: number; branchId: number; clientChanged: boolean }
): Promise<Prisma.TaskUncheckedUpdateInput> {
  const client = await tx.client.findUnique({
    where: { id: target.clientId },
    select: { ...clientPricingSelect, ...declarationClientSelect },
  });
  if (!client) throw new TaskUpdateError(404, 'Mijoz topilmadi');

  const pricing = await loadPricingInputs(tx, client, target.branchId, task.createdAt);
  const deal = target.clientChanged ? buildDealSnapshot(client, pricing.liveUsdRate) : null;

  // USD da kiritilgan davlat to'lovini so'mga o'girish kursi
  const dealUsdRate = deal
    ? (deal.snapshotDealAmount_currency === 'USD' ? Number(deal.snapshotDealAmount_exchange_rate) : null)
    : taskUsdRate(task);
  const usdRate = dealUsdRate ?? (pricing.liveUsdRate ? Number(pricing.liveUsdRate) : 1);
  const fees = buildFeeSnapshot(pricing.statePayment, pricing.hiredWorkerRate, usdRate);

  const out: Prisma.TaskUncheckedUpdateInput = { ...deal, ...fees };

  const multiplier = task.customsPaymentMultiplier != null ? Number(task.customsPaymentMultiplier) : null;
  if (multiplier == null) return out;

  // Deklaratsiya yakunlangan: bojxona to'lovi davlat to'lovi jadvalidan emas, BXM dan
  for (const key of Object.keys(out)) {
    if (key.startsWith('snapshotCustomsPayment')) delete (out as Record<string, unknown>)[key];
  }
  if (target.clientChanged) {
    const declarationStage = await tx.taskStage.findFirst({
      where: { taskId: task.id, name: 'Deklaratsiya' },
      select: { completedAt: true },
    });
    Object.assign(out, declarationCompletedFields({
      client,
      task: {
        snapshotDealAmount_exchange_rate: deal?.snapshotDealAmount_exchange_rate != null
          ? new Prisma.Decimal(Number(deal.snapshotDealAmount_exchange_rate))
          : task.snapshotDealAmount_exchange_rate,
        snapshotDealAmountExchangeRate: task.snapshotDealAmountExchangeRate,
      },
      multiplier,
      afterHoursDeclaration: task.afterHoursDeclaration,
      afterHoursPayer: task.afterHoursPayer,
      bxm: await bxmAt(tx, declarationStage?.completedAt ?? new Date()),
    }));
  }
  return out;
}

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
  const clientChanged = Boolean(input.clientId && input.clientId !== task.clientId);
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

  const contractChange = await resolveContractChange(id, input.contractId, input.clientId ?? task.clientId, clientChanged);
  const contractChanged = contractChange !== null;

  const updated = await prisma.$transaction(async (tx) => {
    if (changed || contractChanged) await createTaskVersion(tx, id, actor.id);

    const data: Prisma.TaskUncheckedUpdateInput = {
      ...(input.title && { title: input.title }),
      ...(input.clientId && { clientId: input.clientId }),
      ...(input.branchId && { branchId: input.branchId }),
      ...(input.comments !== undefined && { comments: input.comments || null }),
      ...(input.hasPsr !== undefined && { hasPsr: input.hasPsr }),
      ...(input.afterHoursDeclaration !== undefined && { afterHoursDeclaration: input.afterHoursDeclaration }),
      ...(input.afterHoursPayer !== undefined && { afterHoursPayer: input.afterHoursPayer }),
      ...(input.driverPhone !== undefined && { driverPhone: input.driverPhone || null }),
      ...((changed || contractChanged) && { updatedById: actor.id }),
    };

    if (branchChanged || clientChanged) {
      Object.assign(data, await repriceTask(tx, task, {
        clientId: clientChanged ? input.clientId! : task.clientId,
        branchId: branchChanged ? input.branchId! : task.branchId,
        clientChanged,
      }));
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

    if (contractChange) {
      const { invoiceId, contract } = contractChange;
      // Filial bloki additionalInfo'ni yangilagan bo'lishi mumkin — joriy qiymatdan davom etiladi
      const current = await tx.invoice.findUnique({ where: { id: invoiceId }, select: { additionalInfo: true } });
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          additionalInfo: applyContractToInvoiceInfo(current?.additionalInfo ?? null, contract) as Prisma.InputJsonObject,
        },
      });
    }

    return updatedTask;
  }, { timeout: 30000, maxWait: 10000 });

  return { updated, branchChanged, contractChanged };
}

export function broadcastTaskUpdated(taskId: number, changes: UpdateTaskInput, actor: Actor): void {
  socketEmitter.broadcastExcept(actor.id, 'task:updated', { taskId, changes, updatedBy: actor.name });
}
