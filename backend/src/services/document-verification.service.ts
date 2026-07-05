import { PrismaClient, Prisma, AiCheckType, DocumentType } from '@prisma/client';
import { analyzeDocument } from '../ai/document.analyzer';
import {
  ST1Extraction,
  CmrExtraction,
  TirExtraction,
  FitoExtraction,
} from '../ai/prompt.builder';
import {
  DbInvoiceSnapshot,
  DbInvoiceItemSnapshot,
  DocDbCheckResult,
  compareStWithDb,
  compareCmrWithDb,
  compareTirWithDb,
  compareFitoWithDb,
} from '../ai/db-rule-engine';

type VerifiableType = 'ST' | 'CMR' | 'TIR' | 'FITO';

const CHECK_TYPE_MAP: Record<VerifiableType, AiCheckType> = {
  ST: 'ST_VS_DB',
  CMR: 'CMR_VS_DB',
  TIR: 'TIR_VS_DB',
  FITO: 'FITO_VS_DB',
};

export function isVerifiableType(type: DocumentType | null): type is VerifiableType {
  return type === 'ST' || type === 'CMR' || type === 'TIR' || type === 'FITO';
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

/**
 * Yuklangan hujjatni bazadagi invoys (Invoice + InvoiceItem + Contract)
 * bilan avtomatik solishtiruvchi xizmat.
 *
 * MUHIM: verifyDocumentAgainstInvoice hech qachon throw qilmaydi va
 * Task.status'ga tegmaydi — natija faqat AiCheck hisoboti sifatida saqlanadi.
 */
export class DocumentVerificationService {
  constructor(private prisma: PrismaClient) {}

  async verifyDocumentAgainstInvoice(taskDocumentId: number): Promise<void> {
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
        return; // faqat ST/CMR/TIR/FITO tekshiriladi
      }
      const extractedText = doc.metadata?.extractedText?.trim();
      if (!extractedText) {
        console.warn(
          `[DocVerify] TaskDocument ${taskDocumentId}: matn ajratilmagan, tekshiruv o'tkazilmadi`
        );
        return;
      }

      const snapshot = await this.buildInvoiceSnapshot(doc.taskId);
      if (!snapshot) {
        console.log(
          `[DocVerify] Task ${doc.taskId}: invoys topilmadi, tekshiruv o'tkazilmadi`
        );
        return;
      }

      // Stage 1: AI extraction
      const extracted = await analyzeDocument(extractedText, doc.documentType, 30000);

      // Extraction natijasini saqlash (qayta ishlatish/diagnostika uchun)
      const structuredData = extracted as unknown as Prisma.InputJsonValue;
      await this.prisma.structuredDocument.upsert({
        where: { taskDocumentId },
        create: {
          taskDocumentId,
          taskId: doc.taskId,
          documentType: doc.documentType,
          structuredData,
        },
        update: { structuredData },
      });

      // Stage 2: deterministik taqqoslash
      let result: DocDbCheckResult;
      switch (doc.documentType) {
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

      const checkType = CHECK_TYPE_MAP[doc.documentType];
      const aiCheck = await this.prisma.aiCheck.create({
        data: {
          taskId: doc.taskId,
          taskDocumentId,
          checkType,
          result: result.status === 'XATO' ? 'FAIL' : 'PASS',
          details: {
            status: result.status,
            errors: result.errors,
            documentName: doc.name,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      const { socketEmitter } = require('../services/socketEmitter');
      socketEmitter.broadcast('aiCheck:created', {
        taskId: doc.taskId,
        taskDocumentId,
        checkId: aiCheck.id,
        checkType,
        result: aiCheck.result,
      });

      console.log(
        `[DocVerify] Task ${doc.taskId}, hujjat ${taskDocumentId} (${doc.documentType}): ${aiCheck.result} (${result.errors.length} ta nomuvofiqlik)`
      );
    } catch (error) {
      // Hech qachon throw qilmaymiz — yuklash oqimini buzmaslik kerak
      console.error(`[DocVerify] TaskDocument ${taskDocumentId} tekshiruvida xato:`, error);
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
    };
  }
}
