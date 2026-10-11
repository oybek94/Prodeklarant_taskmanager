import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

interface ContractCustomsFields {
  deliveryTerms: string | null;
  customsAddress: string | null;
}

const splitLines = (value: string | null | undefined): string[] =>
  String(value ?? '').split('\n').map((s) => s.trim());

/**
 * Invoys additionalInfo'dagi bojxona manzili shartnomadan ko'chirilgan nusxa. Shartnomadagi manzil
 * o'zgarganda nusxa yangilanadi — faqat qo'lda yozilmagan bo'lsa (eski shartnoma qatorlaridan biri).
 * Qator yetkazib berish sharti bo'yicha, topilmasa eski qator o'rni bo'yicha tanlanadi.
 * O'zgarish bo'lmasa null.
 */
export function syncCustomsAddressInInfo(
  rawInfo: Prisma.JsonValue | null,
  before: ContractCustomsFields,
  after: ContractCustomsFields
): Record<string, unknown> | null {
  if (!rawInfo || typeof rawInfo !== 'object' || Array.isArray(rawInfo)) return null;
  const info = { ...(rawInfo as Record<string, unknown>) };

  const current = String(info.customsAddress ?? '').trim();
  if (!current) return null;

  const oldAddresses = splitLines(before.customsAddress);
  const oldIndex = oldAddresses.indexOf(current);
  if (oldIndex === -1) return null; // qo'lda kiritilgan — tegilmaydi

  const newAddresses = splitLines(after.customsAddress);
  const invoiceTerm = String(info.deliveryTerms ?? '').trim();
  const termIndex = invoiceTerm ? splitLines(after.deliveryTerms).indexOf(invoiceTerm) : -1;
  const next = newAddresses[termIndex !== -1 ? termIndex : oldIndex] ?? '';

  if (next === current) return null;
  info.customsAddress = next;
  return info;
}

/** Shartnoma bojxona manzili/yetkazib berish sharti o'zgarganda unga bog'liq invoyslarni yangilaydi. */
export async function syncContractCustomsToInvoices(
  contract: { id: number; clientId: number; contractNumber: string },
  before: ContractCustomsFields,
  after: ContractCustomsFields
): Promise<number> {
  if (before.customsAddress === after.customsAddress && before.deliveryTerms === after.deliveryTerms) return 0;

  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { contractId: contract.id },
        { contractId: null, clientId: contract.clientId, contractNumber: contract.contractNumber },
      ],
    },
    select: { id: true, additionalInfo: true },
  });

  const updates = invoices.flatMap((inv) => {
    const info = syncCustomsAddressInInfo(inv.additionalInfo, before, after);
    return info
      ? [prisma.invoice.update({ where: { id: inv.id }, data: { additionalInfo: info as Prisma.InputJsonObject } })]
      : [];
  });
  if (updates.length > 0) await prisma.$transaction(updates);
  return updates.length;
}
