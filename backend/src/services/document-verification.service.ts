import { PrismaClient, Prisma, AiCheckType, AiCheckResult, DocumentType } from '@prisma/client';
import { analyzeDocumentDetailed } from '../ai/document.analyzer';
import {
  InvoiceExtraction,
  ST1Extraction,
  CmrExtraction,
  TirExtraction,
  FitoExtraction,
  AnyExtraction,
} from '../ai/prompt.builder';
import { ExtractionError } from '../ai/extraction.schemas';
import {
  DbInvoiceSnapshot,
  DbInvoiceItemSnapshot,
  DocDbCheckResult,
  compareInvoiceWithDb,
  compareStWithDb,
  compareCmrWithDb,
  compareTirWithDb,
  compareFitoWithDb,
} from '../ai/db-rule-engine';
import { VERIFICATION_CONFIG } from '../ai/verification.config';

type VerifiableType = 'INVOICE' | 'ST' | 'CMR' | 'TIR' | 'FITO';

const CHECK_TYPE_MAP: Record<VerifiableType, AiCheckType> = {
  INVOICE: 'INVOICE_VS_DB',
  ST: 'ST_VS_DB',
  CMR: 'CMR_VS_DB',
  TIR: 'TIR_VS_DB',
  FITO: 'FITO_VS_DB',
};

/** Tekshiruv o'tkazilmaganda NEEDS_REVIEW sababi (machine-readable) */
export type VerificationSkipReason =
  | 'NO_EXTRACTED_TEXT'
  | 'NO_INVOICE'
  | 'EXTRACTION_FAILED'
  | 'LOW_CONFIDENCE';

const SKIP_MESSAGES: Record<VerificationSkipReason, string> = {
  NO_EXTRACTED_TEXT:
    "Hujjatdan matn ajratilmagan — tekshiruv o'tkazilmadi. Faylni qayta yuklab ko'ring.",
  NO_INVOICE:
    "Bazada bu vazifa uchun invoys topilmadi — tekshiruv o'tkazilmadi. Avval invoysni kiriting.",
  EXTRACTION_FAILED:
    "AI hujjatdan ma'lumot ajrata olmadi — tekshiruvni qayta ishga tushiring yoki hujjatni qo'lda tekshiring.",
  LOW_CONFIDENCE:
    "Hujjat sifati past (o'qib bo'lmagan qismlar ko'p) — natijani qo'lda tekshirib chiqing.",
};

export function isVerifiableType(type: DocumentType | null): type is VerifiableType {
  return (
    type === 'INVOICE' || type === 'ST' || type === 'CMR' || type === 'TIR' || type === 'FITO'
  );
}

/**
 * Hujjat turini nomi/fayl nomidan aniqlash (umumiy yuklash oqimi uchun,
 * bunda foydalanuvchi turini tanlamaydi).
 */
function inferFromOne(source: string): DocumentType | null {
  const s = source.trim();
  if (!s) return null;
  if (/fito|фито|phyto/i.test(s)) return 'FITO';
  if (/(^|[^a-zа-яё])(cmr|smr|смр)([^a-zа-яё]|$)/i.test(s)) return 'CMR';
  if (/(^|[^a-zа-яё])(tir|тир)([^a-zа-яё]|$)/i.test(s)) return 'TIR';
  if (/(^|[^a-zа-яё0-9])(st|ст)[-_. ]?1([^0-9]|$)/i.test(s)) return 'ST';
  if (/^(st|ст)$/i.test(s)) return 'ST';
  if (/invoys|invoice|инвойс|счёт|счет/i.test(s)) return 'INVOICE';
  return null;
}

export function inferDocumentType(
  ...sources: Array<string | null | undefined>
): DocumentType | null {
  for (const source of sources) {
    if (!source) continue;
    const inferred = inferFromOne(source);
    if (inferred) return inferred;
  }
  return null;
}

function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

/* ===================== CONFIDENCE ===================== */

/** Har bir hujjat turi uchun "kutiladigan" asosiy maydonlar (null bo'lsa jarima) */
const KEY_FIELDS: Record<VerifiableType, string[]> = {
  INVOICE: ['invoice_number', 'invoice_date', 'seller_name', 'total_amount'],
  ST: ['st_number', 'exporter_name', 'importer_name', 'certification_date'],
  CMR: ['sender_name', 'consignee_name', 'total_gross_weight', 'total_package_count'],
  TIR: ['consignee_name', 'total_gross_weight', 'total_package_count'],
  FITO: ['exporter', 'importer', 'total_net_weight'],
};

/**
 * Deterministik ishonch bali (0..1) — model o'z-o'zini baholamaydi,
 * faqat kuzatiladigan signallar ishlatiladi:
 * OCR'dagi [unreadable] belgilar, bo'sh asosiy maydonlar, bo'sh products,
 * repair-retry ishlatilgani.
 */
export function computeConfidence(params: {
  extractedText: string;
  extraction: AnyExtraction;
  docType: VerifiableType;
  repairUsed: boolean;
}): number {
  const { extractedText, extraction, docType, repairUsed } = params;
  let score = 1;

  const unreadableCount = (extractedText.match(/\[unreadable\]/gi) ?? []).length;
  score -= Math.min(0.3, unreadableCount * 0.05);

  const record = extraction as unknown as Record<string, unknown>;
  const keyFields = KEY_FIELDS[docType];
  const nullCount = keyFields.filter((f) => record[f] === null || record[f] === undefined).length;
  score -= Math.min(0.3, (nullCount / keyFields.length) * 0.3);

  const products = record.products;
  if (Array.isArray(products) && products.length === 0 && (docType === 'INVOICE' || docType === 'ST')) {
    score -= 0.2;
  }

  if (repairUsed) score -= 0.1;

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

/** Odam ko'rishi uchun taqqoslanmaydigan, lekin foydali maydonlar */
function informationalFields(
  extraction: AnyExtraction,
  docType: VerifiableType
): Record<string, string> {
  const record = extraction as unknown as Record<string, unknown>;
  const FIELDS: Record<VerifiableType, Record<string, string>> = {
    INVOICE: {},
    ST: { st_number: 'ST-1 raqami', transport_method: 'Transport turi' },
    CMR: {
      vehicle_number: 'Avtomobil raqami',
      loading_place: 'Yuk ortish joyi',
      delivery_place: 'Yetkazish joyi',
    },
    TIR: {
      tir_carnet_number: 'TIR karnet raqami',
      departure_customs: "Jo'nash bojxonasi",
      destination_customs: 'Manzil bojxonasi',
    },
    FITO: { certificate_number: 'Sertifikat raqami', origin_country: 'Kelib chiqish mamlakati' },
  };
  const out: Record<string, string> = {};
  for (const [field, label] of Object.entries(FIELDS[docType])) {
    const value = record[field];
    if (typeof value === 'string' && value.trim() !== '') {
      out[label] = value;
    }
  }
  return out;
}

/**
 * Yuklangan hujjatni bazadagi invoys (Invoice + InvoiceItem + Contract)
 * bilan avtomatik solishtiruvchi xizmat.
 *
 * MUHIM: verifyDocumentAgainstInvoice hech qachon throw qilmaydi va
 * Task.status'ga tegmaydi — natija faqat AiCheck hisoboti sifatida saqlanadi.
 * Tekshiruv o'tkazilolmagan HAR QANDAY holatda ham AiCheck yoziladi
 * (NEEDS_REVIEW + sabab) — foydalanuvchi hech qachon "jim" holat ko'rmaydi.
 */
export class DocumentVerificationService {
  constructor(private prisma: PrismaClient) {}

  async verifyDocumentAgainstInvoice(taskDocumentId: number): Promise<void> {
    let taskIdForCatch: number | null = null;
    let docNameForCatch: string | null = null;
    let checkTypeForCatch: AiCheckType | null = null;
    try {
      const doc = await this.prisma.taskDocument.findUnique({
        where: { id: taskDocumentId },
        include: { metadata: true },
      });

      if (!doc) {
        console.warn(`[DocVerify] TaskDocument ${taskDocumentId} topilmadi`);
        return;
      }
      if (!isVerifiableType(doc.documentType)) {
        return; // faqat INVOICE/ST/CMR/TIR/FITO tekshiriladi
      }
      const docType = doc.documentType;
      const checkType = CHECK_TYPE_MAP[docType];
      taskIdForCatch = doc.taskId;
      docNameForCatch = doc.name;
      checkTypeForCatch = checkType;

      const extractedText = doc.metadata?.extractedText?.trim();
      if (!extractedText) {
        await this.writeSkippedCheck(doc.taskId, taskDocumentId, checkType, doc.name, 'NO_EXTRACTED_TEXT');
        return;
      }

      const snapshot = await this.buildInvoiceSnapshot(doc.taskId);
      if (!snapshot) {
        await this.writeSkippedCheck(doc.taskId, taskDocumentId, checkType, doc.name, 'NO_INVOICE');
        return;
      }

      // Stage 1: AI extraction (strict structured outputs + repair-retry)
      const { data: extracted, repairUsed } = await analyzeDocumentDetailed(
        extractedText,
        docType,
        60000
      );

      // Extraction natijasini saqlash (qayta ishlatish/diagnostika uchun)
      const structuredData = extracted as unknown as Prisma.InputJsonValue;
      await this.prisma.structuredDocument.upsert({
        where: { taskDocumentId },
        create: {
          taskDocumentId,
          taskId: doc.taskId,
          documentType: docType,
          structuredData,
        },
        update: { structuredData },
      });

      // Stage 2: deterministik taqqoslash
      let result: DocDbCheckResult;
      switch (docType) {
        case 'INVOICE':
          result = compareInvoiceWithDb(extracted as InvoiceExtraction, snapshot);
          break;
        case 'ST':
          result = compareStWithDb(extracted as ST1Extraction, snapshot);
          break;
        case 'CMR':
          result = compareCmrWithDb(extracted as CmrExtraction, snapshot);
          break;
        case 'TIR':
          result = compareTirWithDb(extracted as TirExtraction, snapshot);
          break;
        case 'FITO':
          result = compareFitoWithDb(extracted as FitoExtraction, snapshot);
          break;
      }

      // Natija xaritasi: critical → FAIL, faqat warning → NEEDS_REVIEW, toza → PASS.
      // Past confidence PASS'ni ham NEEDS_REVIEW'ga túshiradi — "hech narsa
      // o'qiy olmagan extraction PASS bo'ladi" teshigi yopiladi.
      const confidence = computeConfidence({
        extractedText,
        extraction: extracted,
        docType,
        repairUsed,
      });
      const hasCritical = result.errors.some((e) => e.severity === 'critical');
      const lowConfidence = confidence < VERIFICATION_CONFIG.confidence.needsReviewBelow;

      let checkResult: AiCheckResult;
      if (hasCritical) {
        checkResult = 'FAIL';
      } else if (result.errors.length > 0 || lowConfidence) {
        checkResult = 'NEEDS_REVIEW';
      } else {
        checkResult = 'PASS';
      }

      const details: Record<string, unknown> = {
        status: result.status,
        errors: result.errors,
        documentName: doc.name,
        confidence,
      };
      if (lowConfidence) {
        details.reason = 'LOW_CONFIDENCE';
        details.message = SKIP_MESSAGES.LOW_CONFIDENCE;
      }
      const extra = informationalFields(extracted, docType);
      if (Object.keys(extra).length > 0) {
        details.extra = extra;
      }

      const aiCheck = await this.prisma.aiCheck.create({
        data: {
          taskId: doc.taskId,
          taskDocumentId,
          checkType,
          result: checkResult,
          details: details as Prisma.InputJsonValue,
        },
      });

      this.broadcastCheck(doc.taskId, taskDocumentId, aiCheck.id, checkType, aiCheck.result);

      console.log(
        `[DocVerify] Task ${doc.taskId}, hujjat ${taskDocumentId} (${docType}): ${aiCheck.result} ` +
          `(${result.errors.length} ta nomuvofiqlik, confidence: ${confidence})`
      );
    } catch (error) {
      // Hech qachon throw qilmaymiz — yuklash oqimini buzmaslik kerak.
      // Lekin xato JIM yutilmaydi: NEEDS_REVIEW hisobot yoziladi.
      console.error(`[DocVerify] TaskDocument ${taskDocumentId} tekshiruvida xato:`, error);
      if (taskIdForCatch !== null && checkTypeForCatch !== null) {
        const message = SKIP_MESSAGES.EXTRACTION_FAILED;
        const errorDetail =
          error instanceof ExtractionError
            ? `${error.reason}: ${error.message}`
            : error instanceof Error
              ? error.message
              : String(error);
        await this.prisma.aiCheck
          .create({
            data: {
              taskId: taskIdForCatch,
              taskDocumentId,
              checkType: checkTypeForCatch,
              result: 'NEEDS_REVIEW',
              details: {
                reason: 'EXTRACTION_FAILED',
                message,
                error: errorDetail,
                documentName: docNameForCatch,
              } as Prisma.InputJsonValue,
            },
          })
          .then((check) => {
            this.broadcastCheck(
              taskIdForCatch as number,
              taskDocumentId,
              check.id,
              checkTypeForCatch as AiCheckType,
              check.result
            );
          })
          .catch((dbError) => {
            console.error(`[DocVerify] NEEDS_REVIEW yozishda ham xato:`, dbError);
          });
      }
    }
  }

  /** Tekshiruv o'tkazilmagan holat uchun NEEDS_REVIEW hisobot yozish */
  private async writeSkippedCheck(
    taskId: number,
    taskDocumentId: number,
    checkType: AiCheckType,
    documentName: string,
    reason: VerificationSkipReason
  ): Promise<void> {
    console.warn(`[DocVerify] TaskDocument ${taskDocumentId}: ${reason} — NEEDS_REVIEW yozildi`);
    const check = await this.prisma.aiCheck.create({
      data: {
        taskId,
        taskDocumentId,
        checkType,
        result: 'NEEDS_REVIEW',
        details: {
          reason,
          message: SKIP_MESSAGES[reason],
          documentName,
        } as Prisma.InputJsonValue,
      },
    });
    this.broadcastCheck(taskId, taskDocumentId, check.id, checkType, check.result);
  }

  private broadcastCheck(
    taskId: number,
    taskDocumentId: number,
    checkId: number,
    checkType: AiCheckType,
    result: AiCheckResult
  ): void {
    try {
      const { socketEmitter } = require('../services/socketEmitter');
      socketEmitter.broadcast('aiCheck:created', {
        taskId,
        taskDocumentId,
        checkId,
        checkType,
        result,
      });
    } catch (socketError) {
      console.error('[DocVerify] Socket broadcast xatosi:', socketError);
    }
  }

  private async buildInvoiceSnapshot(taskId: number): Promise<DbInvoiceSnapshot | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { taskId },
      include: {
        items: { orderBy: { orderIndex: 'asc' } },
        contract: true,
      },
    });

    if (!invoice) return null;

    const items: DbInvoiceItemSnapshot[] = invoice.items.map((item) => ({
      name: item.name,
      nameEn: item.nameEn,
      tnvedCode: item.tnvedCode,
      unit: item.unit,
      quantity: item.quantity.toNumber(),
      grossWeight: decimalToNumber(item.grossWeight),
      netWeight: decimalToNumber(item.netWeight),
      packagesCount: decimalToNumber(item.packagesCount),
    }));

    const sumOrNull = (values: Array<number | null>): number | null => {
      const present = values.filter((v): v is number => v !== null);
      return present.length > 0 ? present.reduce((a, b) => a + b, 0) : null;
    };

    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.date.toISOString().split('T')[0],
      sellerName: invoice.contract?.sellerName ?? null,
      buyerName: invoice.contract?.buyerName ?? null,
      consigneeName: invoice.contract?.consigneeName ?? null,
      items,
      totalGrossWeight: sumOrNull(items.map((i) => i.grossWeight)),
      totalNetWeight: sumOrNull(items.map((i) => i.netWeight)),
      totalPackagesCount: sumOrNull(items.map((i) => i.packagesCount)),
      totalAmount: decimalToNumber(invoice.totalAmount),
      currency: invoice.currency,
    };
  }
}
