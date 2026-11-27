import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { tashkentDateKey } from '../utils/tashkent-time';
import type { AuthorMap, DraftData } from './client-cargo-draft';
import { buildCargoInvoiceInput, cargoTaskTitle, parseInvoiceText, type ProductSources } from './client-cargo-invoice';
import { shipmentPlaceOf } from './client-cargo-miniapp.service';
import {
  assertNumberFree,
  broadcastInvoiceSaved,
  insertInvoiceInTx,
  InvoiceSaveError,
  invoiceSchema,
  nextAutoNumber,
  validateInvoiceDate,
  validateItemWeights,
  type InvoiceInput,
} from './invoice-save.service';
import { afterTaskCreated, createTaskInTx, type CreateTaskInput } from './task-create.service';

// Yakunlangan yuk arizasidan vazifa (PSR yo'q) va invoys: bazadan o'qish, tekshirish va chaqiruvchi tranzaksiyasida yozish.

const HISTORY_LIMIT = 500;

export interface CargoInvoicePlan {
  task: CreateTaskInput;
  creatorId: number;
  input: InvoiceInput;
  invoiceNumber: string;
}
export type PrepareResult = { ok: true; plan: CargoInvoicePlan } | { ok: false; error: string };

export interface CreatedCargoInvoice {
  task: Awaited<ReturnType<typeof createTaskInTx>>;
  invoice: { id: number; taskId: number; invoiceNumber: string };
}

const reject = (reason: string): PrepareResult => ({ ok: false, error: `Invoys yaratilmadi: ${reason}` });

const optionalText = z.string().optional().catch(undefined);
const specRowSchema = z.object({
  productName: optionalText,
  tnvedCode: optionalText,
  unitPrice: z.union([z.number(), z.string()]).optional().catch(undefined),
});

/** Contract.specification — massiv yoki JSON matn; tushunarsiz bo'lsa bo'sh */
function parseSpec(raw: unknown): ProductSources['spec'] {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  const rows = z.array(specRowSchema).safeParse(value);
  if (!rows.success) return [];
  return rows.data.map((row) => {
    const price = row.unitPrice === undefined || row.unitPrice === '' ? undefined : Number(row.unitPrice);
    return { productName: row.productName, tnvedCode: row.tnvedCode, unitPrice: Number.isFinite(price) ? price : undefined };
  });
}

const asRecord = (value: Prisma.JsonValue | undefined): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : null;

/** Formani to'ldirganlar ichida (birinchi kiritgan vaqti bo'yicha) Telegram hisobi xodimga mos kelgani; bo'lmasa birinchi faol ADMIN */
async function findCreatorId(authors: AuthorMap): Promise<number | null> {
  const ordered = Object.values(authors).sort((a, b) => a.at.localeCompare(b.at));
  const telegramIds = [...new Set(ordered.map((a) => String(a.tgUserId)))];
  const staff = await prisma.user.findMany({
    where: { active: true, telegramChatId: { in: telegramIds } },
    select: { id: true, telegramChatId: true },
  });
  for (const telegramId of telegramIds) {
    const match = staff.find((user) => user.telegramChatId === telegramId);
    if (match) return match.id;
  }
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', active: true }, orderBy: { id: 'asc' }, select: { id: true } });
  return admin?.id ?? null;
}

/** Hech narsa yozmasdan arizani tekshiradi va yoziladigan vazifa + invoysni tayyorlaydi */
export async function prepareCargoInvoice(params: {
  clientId: number;
  data: DraftData;
  authors: AuthorMap;
  now?: Date;
}): Promise<PrepareResult> {
  const { clientId, data, authors, now = new Date() } = params;
  if (data.branchId === null) return reject('filial tanlanmagan');
  if (parseInvoiceText(data.header.invoiceNumber).invalidDate) {
    return reject("«Инвойс №» dagi sana noto'g'ri. Namuna: 12 от 01.02.2026");
  }

  const contract = data.contractId
    ? await prisma.contract.findFirst({
        where: { id: data.contractId, clientId },
        select: { id: true, contractNumber: true, contractCurrency: true, gln: true, specification: true },
      })
    : null;
  if (data.contractId && !contract) return reject('shartnoma topilmadi');

  const branch = await prisma.branch.findUnique({
    where: { id: data.branchId },
    select: { name: true, regionText: true, defaultRegionCode: { select: { name: true, internalCode: true, externalCode: true } } },
  });
  if (!branch) return reject('filial topilmadi');

  const [previous, history, tnved, packagingTypes] = await Promise.all([
    contract
      ? prisma.invoice.findFirst({ where: { contractId: contract.id }, orderBy: { createdAt: 'desc' }, select: { additionalInfo: true } })
      : null,
    contract
      ? prisma.invoiceItem.findMany({
          where: { invoice: { contractId: contract.id }, tnvedCode: { not: null } },
          orderBy: { id: 'desc' },
          take: HISTORY_LIMIT,
          select: { name: true, tnvedCode: true },
        })
      : [],
    prisma.tnvedProduct.findMany({ orderBy: { orderIndex: 'asc' }, select: { name: true, code: true } }),
    prisma.packagingType.findMany({ orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }], select: { name: true, code: true } }),
  ]);

  const built = buildCargoInvoiceInput(
    data,
    {
      contract,
      shipmentPlace: shipmentPlaceOf(branch),
      region: branch.defaultRegionCode,
      previousAdditionalInfo: asRecord(previous?.additionalInfo),
      packagingTypes,
      sources: {
        global: tnved,
        spec: parseSpec(contract?.specification),
        history: history.map((item) => ({ name: item.name, code: item.tnvedCode ?? '' })),
      },
    },
    tashkentDateKey(now)
  );

  // Dasturdagi POST /invoices bilan bir xil sxema: aks holda invoys keyin tahrirda saqlanmay qolardi
  const parsed = invoiceSchema.safeParse({ ...built, clientId });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return reject(`${issue?.path.join('.') ?? ''}: ${issue?.message ?? "ma'lumot noto'g'ri"}`);
  }
  const input = parsed.data;
  const weightError = validateItemWeights(input.items ?? []);
  if (weightError) return reject(weightError);
  const dateError = validateInvoiceDate(input.date, now);
  if (dateError) return reject(dateError);

  let invoiceNumber = input.invoiceNumber;
  if (invoiceNumber) {
    try {
      await assertNumberFree(invoiceNumber, contract?.id);
    } catch (error) {
      if (error instanceof InvoiceSaveError) return reject(error.message);
      throw error;
    }
  } else {
    invoiceNumber = await nextAutoNumber(contract?.id);
  }

  const creatorId = await findCreatorId(authors);
  if (creatorId === null) return reject('vazifa muallifi uchun faol xodim topilmadi');

  return {
    ok: true,
    plan: {
      creatorId,
      invoiceNumber,
      input,
      task: {
        clientId,
        branchId: data.branchId,
        title: cargoTaskTitle(invoiceNumber, data.header.vehicleNumber, contract?.contractNumber),
        hasPsr: false,
        afterHoursDeclaration: false,
        afterHoursPayer: 'CLIENT',
      },
    },
  };
}

export async function createCargoInvoiceInTx(tx: Prisma.TransactionClient, plan: CargoInvoicePlan): Promise<CreatedCargoInvoice> {
  const task = await createTaskInTx(tx, plan.task, plan.creatorId);
  const invoice = await insertInvoiceInTx(tx, { input: plan.input, invoiceNumber: plan.invoiceNumber, task });
  return { task, invoice };
}

/** Commit'dan keyin: socket va bildirishnoma. id 0 — hech bir xodim (jumladan vazifa muallifi) chetlab o'tilmaydi */
export function announceCargoInvoice(created: CreatedCargoInvoice, completedByName: string): void {
  const actor = { id: 0, name: `Yuk boti (${completedByName})` };
  afterTaskCreated(created.task, actor);
  broadcastInvoiceSaved(created.invoice, true, actor);
}
