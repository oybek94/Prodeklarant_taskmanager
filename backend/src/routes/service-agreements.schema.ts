import { z } from 'zod';

const tariffRowSchema = z.object({
  name: z.string().min(1),
  unit: z.string().default(''),
  bhm: z.number().nonnegative(),
});

/**
 * Bazada nullable bo'lgan ustunlar uchun: `undefined` ham, `null` ham qabul
 * qilinadi. Frontend to'ldirilmagan maydonni `null` bilan yuboradi (GET javobi
 * ham `null` qaytaradi), shuning uchun faqat `.optional()` bo'lsa oddiy
 * shartnoma ham 400 bilan rad etilardi. PATCH'da `null` — "maydonni tozalash".
 * Quyidagi `.nullish()` maydonlari `schema.prisma` dagi `?` ustunlar bilan
 * bir xil ro'yxat; `.default()` li maydonlar (DB'da NOT NULL) tegilmaydi.
 */
const baseShape = {
  clientId: z.number().int().positive(),
  agreementNumber: z.string().min(1).max(50),
  agreementDate: z.string().min(1),
  templateVersion: z.string().default('v1'),
  status: z.enum(['DRAFT', 'ACTIVE', 'TERMINATED']).default('DRAFT'),

  customerName: z.string().min(1),
  customerInn: z.string().nullish(),
  customerAddress: z.string().nullish(),
  customerDirector: z.string().nullish(),
  customerDirectorBasis: z.string().nullish(),
  customerBankName: z.string().nullish(),
  customerBankAccount: z.string().nullish(),
  customerMfo: z.string().nullish(),
  customerOked: z.string().nullish(),
  customerPhone: z.string().nullish(),
  customerEmail: z.string().nullish(),

  executorName: z.string().min(1),
  executorInn: z.string().nullish(),
  executorAddress: z.string().nullish(),
  executorDirector: z.string().nullish(),
  executorBankName: z.string().nullish(),
  executorBankAccount: z.string().nullish(),
  executorMfo: z.string().nullish(),
  executorOked: z.string().nullish(),
  executorPhone: z.string().nullish(),
  executorEmail: z.string().nullish(),

  paymentModel: z.enum(['PREPAID', 'MONTHLY', 'PER_COUNT', 'PER_AMOUNT']),
  monthlyDueDay: z.number().int().min(1).max(28).nullish(),
  perCountThreshold: z.number().int().positive().nullish(),
  perCountDueDays: z.number().int().positive().nullish(),
  perAmountThreshold: z.number().nonnegative().nullish(),
  perAmountDueDays: z.number().int().positive().nullish(),
  creditLimit: z.number().nonnegative().nullish(),
  prepaidRevertDays: z.number().int().positive().default(10),
  mainTariffBhm: z.number().nonnegative(),
  tariffs: z.array(tariffRowSchema).default([]),
  vatPayer: z.boolean().default(false),
  jurisdictionCourt: z.string().nullish(),
  brokerRegistryNumber: z.string().nullish(),
  signingPlace: z.string().default('Олтиариқ тумани'),
  includeSeal: z.boolean().default(true),
};

/**
 * Tanlangan to'lov modeliga qarab qaysi maydonlar majburiy ekanini tekshiradi
 * (shartnomaning 5.5.1-bandi). Modelsiz maydon kelib qolsa xato bermaymiz —
 * u shunchaki PDF'da ishlatilmaydi.
 */
function requireModelFields<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx: z.RefinementCtx) => {
    // Zod generik chiqarishi tufayli `value` bu yerda `unknown` bo'ladi —
    // bir marta toraytiramiz, keyin maydonlarga bemalol murojaat qilinadi.
    const data = value as Record<string, unknown>;
    const need = (field: string) => {
      if (data[field] === undefined || data[field] === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${data.paymentModel} modeli uchun bu maydon majburiy`,
        });
      }
    };
    if (data.paymentModel === 'MONTHLY') need('monthlyDueDay');
    if (data.paymentModel === 'PER_COUNT') { need('perCountThreshold'); need('perCountDueDays'); }
    if (data.paymentModel === 'PER_AMOUNT') { need('perAmountThreshold'); need('perAmountDueDays'); }
  });
}

export const agreementCreateSchema = requireModelFields(z.object(baseShape));
export const agreementUpdateSchema = requireModelFields(z.object(baseShape).partial().extend({
  paymentModel: z.enum(['PREPAID', 'MONTHLY', 'PER_COUNT', 'PER_AMOUNT']),
}));
export const terminateSchema = z.object({
  terminationReason: z.string().min(1),
});

export type AgreementCreateInput = z.infer<typeof agreementCreateSchema>;
