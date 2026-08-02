import { z } from 'zod';

const tariffRowSchema = z.object({
  name: z.string().min(1),
  unit: z.string().default(''),
  bhm: z.number().nonnegative(),
});

const baseShape = {
  clientId: z.number().int().positive(),
  agreementNumber: z.string().min(1).max(50),
  agreementDate: z.string().min(1),
  templateVersion: z.string().default('v1'),
  status: z.enum(['DRAFT', 'ACTIVE', 'TERMINATED']).default('DRAFT'),

  customerName: z.string().min(1),
  customerInn: z.string().optional(),
  customerAddress: z.string().optional(),
  customerDirector: z.string().optional(),
  customerDirectorBasis: z.string().optional(),
  customerBankName: z.string().optional(),
  customerBankAccount: z.string().optional(),
  customerMfo: z.string().optional(),
  customerOked: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),

  executorName: z.string().min(1),
  executorInn: z.string().optional(),
  executorAddress: z.string().optional(),
  executorDirector: z.string().optional(),
  executorBankName: z.string().optional(),
  executorBankAccount: z.string().optional(),
  executorMfo: z.string().optional(),
  executorOked: z.string().optional(),
  executorPhone: z.string().optional(),
  executorEmail: z.string().optional(),

  paymentModel: z.enum(['PREPAID', 'MONTHLY', 'PER_COUNT', 'PER_AMOUNT']),
  monthlyDueDay: z.number().int().min(1).max(28).optional(),
  perCountThreshold: z.number().int().positive().optional(),
  perCountDueDays: z.number().int().positive().optional(),
  perAmountThreshold: z.number().nonnegative().optional(),
  perAmountDueDays: z.number().int().positive().optional(),
  creditLimit: z.number().nonnegative().optional(),
  prepaidRevertDays: z.number().int().positive().default(10),
  mainTariffBhm: z.number().nonnegative(),
  tariffs: z.array(tariffRowSchema).default([]),
  vatPayer: z.boolean().default(false),
  jurisdictionCourt: z.string().optional(),
  brokerRegistryNumber: z.string().optional(),
  signingPlace: z.string().default('Олтиариқ тумани'),
  includeSeal: z.boolean().default(true),
};

/**
 * Tanlangan to'lov modeliga qarab qaysi maydonlar majburiy ekanini tekshiradi
 * (shartnomaning 5.5.1-bandi). Modelsiz maydon kelib qolsa xato bermaymiz —
 * u shunchaki PDF'da ishlatilmaydi.
 */
function requireModelFields<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data: Record<string, unknown>, ctx: z.RefinementCtx) => {
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
