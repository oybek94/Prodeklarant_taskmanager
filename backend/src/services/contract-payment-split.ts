import { ContractPaymentType } from '@prisma/client';

export interface ContractPaymentSplit {
  cashAmount: number;
  transferAmount: number;
}

/**
 * CASH_ALL_INCLUSIVE (legacy) turida dealAmount ichiga davlat to'lovlari
 * (sertifikat, bojxona) allaqachon kiritilgan deb hisoblanadi — kompaniya
 * ularni o'z hisobidan to'laydi, shuning uchun netProfit'dan ayiriladi.
 * Boshqa 3 turda mijoz davlat to'lovini o'zi to'g'ridan-to'g'ri to'laydi.
 */
export function shouldDeductGovernmentFees(contractPaymentType: ContractPaymentType): boolean {
  return contractPaymentType === 'CASH_ALL_INCLUSIVE';
}

/**
 * Xizmat haqining naqt/perechisleniya taqsimoti (faqat ko'rsatish uchun).
 * `transferUzsConfig` — MIXED turi uchun mijozda sozlangan qat'iy UZS summa
 * (doim UZS, `dealAmountUzs` valyutasidan qat'i nazar).
 */
export function computeContractPaymentSplit(
  contractPaymentType: ContractPaymentType,
  dealAmountUzs: number,
  transferUzsConfig: number | null | undefined
): ContractPaymentSplit {
  if (contractPaymentType === 'TRANSFER_ONLY') {
    return { cashAmount: 0, transferAmount: dealAmountUzs };
  }
  if (contractPaymentType === 'MIXED') {
    const configured = Math.max(0, Number(transferUzsConfig || 0));
    const transferAmount = Math.min(configured, dealAmountUzs);
    return { cashAmount: dealAmountUzs - transferAmount, transferAmount };
  }
  // CASH_ALL_INCLUSIVE, CASH_ONLY
  return { cashAmount: dealAmountUzs, transferAmount: 0 };
}
