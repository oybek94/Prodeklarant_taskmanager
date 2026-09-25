import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { getNextInvoiceNumber } from '../utils/invoice-number';
import { checkItemsTare, TareWarning } from './packaging-tare';
import { ensureCmrForInvoice } from './cmr-service';
import { ensureTirForInvoice } from './tir-service';
import { socketEmitter } from './socketEmitter';

/**
 * Invoysni saqlash (yaratish yoki vazifaga bog'langan mavjudini yangilash) — POST /invoices.
 *
 * Yozish qismi bitta tranzaksiyada: oldin eski tovar qatorlari o'chirilib, keyin
 * xato (masalan shartnoma tekshiruvi) bilan chiqilganda invoys tovarlarsiz qolardi.
 * Barcha tekshiruvlar endi hech narsa yozilmasidan OLDIN bajariladi.
 */

// Invoice yaratish/update uchun schema (null yuborilganda undefined ga aylantiramiz)
const optionalString = () => z.string().optional().nullable().transform((v) => v ?? undefined);
/** PDF bo'limi shrifti (pt) — kalit yo'q yoki null bo'lsa "Avto" */
const pdfFontSize = () => z.number().int().min(5).max(14).optional().nullable().transform((v) => v ?? undefined);
export const invoiceSchema = z.object({
  taskId: z.number().optional(),
  clientId: z.number().optional(),
  invoiceNumber: optionalString(),
  contractNumber: optionalString(),
  contractId: z.number().optional().nullable().transform((v) => v ?? undefined),
  date: optionalString(),
  currency: z.enum(['USD', 'UZS']).optional().nullable().transform((v) => v ?? undefined),
  totalAmount: z.number().optional(),
  notes: optionalString(),
  additionalInfo: z.object({
    // To'lov va shartnoma
    paymentTerms: z.string().max(500).optional(),
    dueDate: z.string().max(200).optional(),
    poNumber: z.string().max(100).optional(),
    terms: z.string().max(2000).optional(),
    tax: z.number().min(0).max(1e9).optional(),
    discount: z.number().min(0).max(1e9).optional(),
    shipping: z.number().min(0).max(1e9).optional(),
    amountPaid: z.number().min(0).max(1e9).optional(),
    paymentMethod: z.string().max(100).optional(),
    freightCost: z.number().min(0).max(1e9).optional(),
    usdToRubRate: z.number().min(0).max(1e6).optional(),
    // Transport va logistika
    deliveryTerms: z.string().max(500).optional(),
    vehicleNumber: z.string().max(200).regex(/^[^Ѐ-ӿ]*$/, 'Номер автотранспорта faqat lotin harflarida bo\'lishi kerak').optional(),
    trailerNumber: z.string().max(200).optional(),
    smrNumber: z.string().max(100).optional(),
    tirNumber: z.string().max(100).optional(),
    carrier: z.string().max(500).optional(),
    loaderWeight: z.union([z.string().max(50), z.number()]).optional(),
    trailerWeight: z.union([z.string().max(50), z.number()]).optional(),
    palletWeight: z.union([z.string().max(50), z.number()]).optional(),
    // Joylar
    shipmentPlace: z.string().max(500).optional(),
    customsAddress: z.string().max(500).optional(),
    destination: z.string().max(500).optional(),
    origin: z.string().max(500).optional(),
    // Mahsulot
    manufacturer: z.string().max(500).optional(),
    orderNumber: z.string().max(100).optional(),
    gln: z.string().max(100).optional(),
    harvestYear: z.string().max(200).optional(),
    temperature: z.string().max(200).optional(),
    documents: z.string().max(2000).optional(),
    // FSS
    fssRegionInternalCode: z.string().max(50).optional(),
    fssRegionName: z.string().max(200).optional(),
    fssRegionExternalCode: z.string().max(50).optional(),
    // Qadoq kodlari
    packagingTypeCodes: z.array(z.object({
      name: z.string().max(200),
      code: z.string().max(50),
    })).max(100).optional(),
    // Custom fieldlar
    customFields: z.array(z.object({
      id: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? String(v) : undefined),
      label: z.string().max(200),
      value: z.string().max(1000),
    })).max(20).optional(),
    specCustomFields: z.array(z.object({
      id: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? String(v) : undefined),
      label: z.string().max(200),
      value: z.string().max(1000).optional().nullable().transform(v => v ?? ''),
    })).max(20).optional(),
    // Faqat "Упаковочный лист" tabida ko'rinadigan maydonlar
    packingCustomFields: z.array(z.object({
      id: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? String(v) : undefined),
      label: z.string().max(200),
      value: z.string().max(1000).optional().nullable().transform(v => v ?? ''),
    })).max(20).optional(),
    // Ustunlar sozlamalari
    visibleColumns: z.record(z.string(), z.boolean()).optional(),
    columnLabels: z.record(z.string(), z.string().max(200)).optional(),
    visibleAdditionalInfoFields: z.record(z.string(), z.boolean()).optional(),
    additionalFieldsOrder: z.array(z.string()).optional(),
    // PDF bo'limlari uchun qo'lda belgilangan shrift o'lchamlari (pt).
    // Oraliq frontend'dagi PDF_FONT_MIN/PDF_FONT_MAX bilan bir xil.
    // Har bir kalit ALOHIDA ixtiyoriy: frontend'da tip Partial<Record<...>> va
    // "Avto" holatida kalit umuman yuborilmaydi. z.record(z.enum(...), ...)
    // ishlatib bo'lmaydi — Zod v4 da enum kalitli record to'liq bo'lishini talab
    // qiladi va bo'sh {} uchun ham "expected number, received undefined" beradi.
    pdfFontSizes: z.object({
      parties: pdfFontSize(),
      additionalInfo: pdfFontSize(),
      itemsTable: pdfFontSize(),
      notes: pdfFontSize(),
    }).optional(),
    // O'zgarishlar jurnali
    changeLog: z.array(z.object({
      timestamp: z.string().max(50).optional(),
      field: z.string().max(200).optional(),
      oldValue: z.unknown().optional(),
      newValue: z.unknown().optional(),
    }).passthrough()).max(500).optional(),
  }).passthrough().optional(),
  items: z.array(z.object({
    tnvedCode: z.string().optional().nullable().transform(v => v ?? undefined),
    pluCode: z.string().optional().nullable().transform(v => v ?? undefined),
    name: z.string(),
    nameEn: z.string().optional().nullable().transform(v => v ?? undefined),
    packageType: z.string().optional().nullable().transform(v => v ?? undefined),
    unit: z.string(),
    quantity: z.number(),
    packagesCount: z.number().optional().nullable().transform(v => v ?? undefined),
    grossWeight: z.number().optional(),
    netWeight: z.number().optional(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    orderIndex: z.number().optional(),
    customFields: z.unknown().optional().nullable().transform(v => v ?? undefined),
  })).optional(),
}).refine((data) => data.taskId || data.clientId, {
  message: "taskId yoki clientId bo'lishi kerak",
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
type InvoiceItemInput = NonNullable<InvoiceInput['items']>[number];

/** Foydalanuvchiga ko'rsatiladigan xato — route uni shu status bilan qaytaradi */
export class InvoiceSaveError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'InvoiceSaveError';
  }
}

const DUPLICATE_NUMBER_MESSAGE = 'Bu invoice raqami allaqachon mavjud. Ozgartirish kerak';
const CONTRACT_MISMATCH_MESSAGE = 'Shartnoma topilmadi yoki bu mijozga tegishli emas';

/**
 * Faqat fizik imkonsiz og'irliklar bloklanadi. Tara oralig'i (qadoq turi
 * noto'g'ri tanlanganini aniqlash) bloklamaydi — u ogohlantirish sifatida qaytadi.
 * @returns birinchi xato matni yoki null
 */
export function validateItemWeights(items: InvoiceItemInput[]): string | null {
  const eps = 1e-6;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const ptLower = (item.packageType || '').trim().toLowerCase();
    const gross = Number(item.grossWeight) || 0;
    const net = Number(item.netWeight) || 0;
    const prefix = `${i + 1}-qatordagi tovar (${item.name || 'Nomsiz'}): `;

    if (ptLower === 'навалом') {
      if (net > gross + eps) {
        return `${prefix}Навалом qadoq turida netto og‘irligi brutto og‘irligidan katta bo‘lishi mumkin emas.`;
      }
    } else {
      if (Math.abs(net - gross) < eps) {
        return `${prefix}Навалом bo‘lmagan qadoq turida netto va brutto og‘irligi teng bo‘lishi mumkin emas.`;
      }
      if (net > gross + eps) {
        return `${prefix}Netto og‘irligi brutto og‘irligidan kichik bo‘lishi kerak.`;
      }
    }
  }
  return null;
}

/** Qadoq turi tekshiruvi (tara og'irligi bo'yicha). Diapazonlar bazadan — Sozlamalarda qo'shilgan tur ham tekshiriladi. */
async function computeTareWarnings(items: InvoiceItemInput[]): Promise<TareWarning[]> {
  try {
    const packagingTypes = await prisma.packagingType.findMany({
      select: { name: true, tareMin: true, tareMax: true },
    });
    return checkItemsTare(
      items,
      packagingTypes.map((p) => ({
        name: p.name,
        tareMin: p.tareMin != null ? Number(p.tareMin) : null,
        tareMax: p.tareMax != null ? Number(p.tareMax) : null,
      }))
    );
  } catch (err) {
    // Ogohlantirish hech qachon saqlashni to'xtatmasligi kerak
    console.error('[invoice] tare check failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

async function assertNumberFree(
  invoiceNumber: string,
  contractId: number | undefined,
  exceptInvoiceId?: number
): Promise<void> {
  const duplicate = await prisma.invoice.findFirst({
    where: { contractId: contractId ?? null, invoiceNumber },
    select: { id: true },
  });
  if (duplicate && duplicate.id !== exceptInvoiceId) {
    throw new InvoiceSaveError(400, DUPLICATE_NUMBER_MESSAGE);
  }
}

/** Avtomatik invoice raqami: shartnoma bo'lsa shu shartnoma bo'yicha, bo'lmasa global */
async function nextAutoNumber(contractId: number | undefined): Promise<string> {
  if (contractId) {
    const lastInvoice = await prisma.invoice.findFirst({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
    return lastInvoice ? getNextInvoiceNumber(lastInvoice.invoiceNumber) : '1';
  }
  const lastInvoice = await prisma.invoice.findFirst({ orderBy: { invoiceNumber: 'desc' } });
  const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber, 10) : 0;
  return (isNaN(lastNumber) ? 0 : lastNumber + 1).toString();
}

function toItemRows(invoiceId: number, items: InvoiceItemInput[]): Prisma.InvoiceItemCreateManyInput[] {
  return items.map((item, index) => ({
    invoiceId,
    tnvedCode: item.tnvedCode || undefined,
    pluCode: item.pluCode || undefined,
    name: item.name,
    nameEn: item.nameEn || undefined,
    packageType: item.packageType || undefined,
    unit: item.unit,
    quantity: item.quantity,
    packagesCount: item.packagesCount ?? undefined,
    grossWeight: item.grossWeight || undefined,
    netWeight: item.netWeight || undefined,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    orderIndex: item.orderIndex ?? index,
    customFields: item.customFields ? (item.customFields as Prisma.InputJsonValue) : undefined,
  }));
}

const savedInvoiceInclude = {
  items: { orderBy: { orderIndex: 'asc' } },
  client: true,
  task: {
    select: {
      id: true,
      title: true,
      status: true,
      _count: { select: { errors: true } },
    },
  },
  branch: { select: { id: true, name: true } },
} satisfies Prisma.InvoiceInclude;

export type SavedInvoice = Prisma.InvoiceGetPayload<{ include: typeof savedInvoiceInclude }>;

export interface SaveInvoiceResult {
  invoice: SavedInvoice;
  isNew: boolean;
  warnings: TareWarning[];
}

/**
 * Invoysni saqlaydi. Tekshiruv xatolarida InvoiceSaveError tashlaydi (hech narsa yozilmagan bo'ladi).
 * Saqlangandan keyingi yon ta'sirlar (CMR/TIR, socket) — afterInvoiceSaved.
 */
export async function saveInvoice(input: InvoiceInput): Promise<SaveInvoiceResult> {
  const { taskId, clientId, invoiceNumber, contractNumber, contractId, date, currency, totalAmount, notes, additionalInfo, items } = input;

  if (items && items.length > 0) {
    const weightError = validateItemWeights(items);
    if (weightError) throw new InvoiceSaveError(400, weightError);
  }
  const warnings = items && items.length > 0 ? await computeTareWarnings(items) : [];

  // Task va Client ma'lumotlarini olish
  let task: Prisma.TaskGetPayload<{ include: { client: true } }> | null = null;
  let client: Prisma.ClientGetPayload<object> | null = null;

  if (taskId) {
    task = await prisma.task.findUnique({ where: { id: taskId }, include: { client: true } });
    if (!task) throw new InvoiceSaveError(404, 'Task topilmadi');
    client = task.client;
  } else if (clientId) {
    client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new InvoiceSaveError(404, 'Mijoz topilmadi');
  } else {
    throw new InvoiceSaveError(400, 'taskId yoki clientId bo\'lishi kerak');
  }

  // Shartnoma: contractId bo'lmasa lekin contractNumber bo'lsa, mijoz bo'yicha shartnomani topib
  // contractId ni o'rnatamiz (task modalda "Shartnoma" ko'rinishi uchun)
  const currentClientId = task?.clientId || clientId;
  let resolvedContractId: number | undefined = contractId ?? undefined;
  if (resolvedContractId == null && contractNumber && String(contractNumber).trim() && currentClientId) {
    // Bir xil raqamli bir nechta shartnoma bo'lishi mumkin — eng oxirgisini (katta ID) tanlaymiz
    const contractByNumber = await prisma.contract.findFirst({
      where: { clientId: currentClientId, contractNumber: String(contractNumber).trim() },
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    if (contractByNumber) resolvedContractId = contractByNumber.id;
  }

  const existingInvoice = taskId ? await prisma.invoice.findUnique({ where: { taskId } }) : null;

  // Invoice.taskId va branchId sxemada majburiy — vazifasiz invoys bazaga yozilmaydi
  // (oldin bu yo'l Prisma xatosi bilan 500 berardi). Frontend avval vazifa yaratadi.
  if (!existingInvoice && !task) {
    throw new InvoiceSaveError(400, 'Invoys faqat vazifaga bog\'lab yaratiladi — avval vazifa tanlang');
  }

  // Raqam tekshiruvi / avtomatik raqam
  let finalInvoiceNumber: string;
  if (existingInvoice) {
    finalInvoiceNumber = invoiceNumber || existingInvoice.invoiceNumber;
    if (invoiceNumber && invoiceNumber !== existingInvoice.invoiceNumber) {
      await assertNumberFree(invoiceNumber, resolvedContractId, existingInvoice.id);
    }
  } else if (invoiceNumber) {
    await assertNumberFree(invoiceNumber, resolvedContractId);
    finalInvoiceNumber = invoiceNumber;
  } else {
    finalInvoiceNumber = await nextAutoNumber(resolvedContractId);
  }

  // Shartnoma shu mijozga tegishlimi — HECH NARSA yozilmasidan oldin
  if (resolvedContractId) {
    const contract = await prisma.contract.findUnique({ where: { id: resolvedContractId } });
    if (!contract || contract.clientId !== currentClientId) {
      throw new InvoiceSaveError(400, CONTRACT_MISMATCH_MESSAGE);
    }
  }

  const common = {
    invoiceNumber: finalInvoiceNumber,
    contractNumber: contractNumber || client?.contractNumber || undefined,
    contractId: resolvedContractId || undefined,
    currency: currency || client?.dealAmountCurrency || 'USD',
    totalAmount: totalAmount || (task ? task.snapshotDealAmount : 0) || 0,
    notes: notes || undefined,
  };

  const invoiceId = await prisma.$transaction(async (tx) => {
    let id: number;
    if (existingInvoice) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: existingInvoice.id } });

      // additionalInfo birlashtiriladi: mavjud kalitlar (jumladan changeLog) saqlanib qoladi
      const existingAi = (existingInvoice.additionalInfo && typeof existingInvoice.additionalInfo === 'object')
        ? (existingInvoice.additionalInfo as Record<string, unknown>)
        : {};
      const incomingAi = (additionalInfo && typeof additionalInfo === 'object') ? (additionalInfo as Record<string, unknown>) : {};

      const updated = await tx.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          ...common,
          date: date ? new Date(date) : undefined,
          additionalInfo: { ...existingAi, ...incomingAi } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      id = updated.id;
    } else {
      const created = await tx.invoice.create({
        data: {
          ...common,
          taskId: task!.id,
          clientId: task!.clientId,
          branchId: task!.branchId,
          date: date ? new Date(date) : new Date(),
          additionalInfo: additionalInfo ? (additionalInfo as Prisma.InputJsonValue) : undefined,
        },
        select: { id: true },
      });
      id = created.id;
    }

    if (items && items.length > 0) {
      await tx.invoiceItem.createMany({ data: toItemRows(id, items) });
    }
    return id;
  });

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: savedInvoiceInclude });
  if (!invoice) throw new InvoiceSaveError(404, 'Invoice topilmadi');

  return { invoice, isNew: !existingInvoice, warnings };
}

/** Saqlangandan keyin: vazifaga bog'langan invoys uchun CMR/TIR hujjatlari */
export async function ensureInvoiceDerivedDocs(invoice: SavedInvoice, actorId: number): Promise<void> {
  if (!invoice.taskId) return;
  await ensureCmrForInvoice({ invoiceId: invoice.id, uploadedById: actorId });
  await ensureTirForInvoice({ invoiceId: invoice.id, uploadedById: actorId });
}

/** Real-time: boshqa foydalanuvchilarga invoys saqlangani haqida xabar */
export function broadcastInvoiceSaved(invoice: SavedInvoice, isNew: boolean, actor: { id: number; name: string }): void {
  socketEmitter.broadcastExcept(actor.id, 'invoice:saved', {
    invoiceId: invoice.id,
    taskId: invoice.taskId,
    isNew,
    savedBy: actor.name,
  });
}

/** API javobi: Decimal maydonlar raqamga */
export function serializeSavedInvoice(invoice: SavedInvoice, warnings: TareWarning[]) {
  return {
    ...invoice,
    totalAmount: Number(invoice.totalAmount),
    items: invoice.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      packagesCount: item.packagesCount != null ? Number(item.packagesCount) : null,
      grossWeight: item.grossWeight ? Number(item.grossWeight) : null,
      netWeight: item.netWeight ? Number(item.netWeight) : null,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })),
    // Qadoq turi shubhali bo'lgan qatorlar. Saqlash amalga oshgan — bu faqat ogohlantirish.
    warnings,
  };
}
