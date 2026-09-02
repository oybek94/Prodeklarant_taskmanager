/**
 * Transaksiya route'lari uchun rol tekshiruvlari.
 * Alohida faylda — DB va servislarga bog'liq emas, shuning uchun testlash oson.
 */

export interface SelfSalaryInput {
  type: 'INCOME' | 'EXPENSE' | 'SALARY';
  date: Date;
  workerId?: number;
  clientId?: number;
  expenseCategory?: string;
  taskId?: number;
  branchId?: number;
  virtualCardId?: number | null;
  isLegacyPayment?: boolean;
}

/**
 * Admin bo'lmagan xodim faqat o'zi olgan pulni (SALARY) yozishi mumkin.
 * Faqat admin belgilaydigan maydonlar (mijoz, xarajat, virtual karta,
 * o'tgan mavsum qarzi) tashlab yuboriladi, workerId esa o'ziga majburlanadi.
 * Xatolik matni qaytsa — so'rov rad etiladi.
 */
export function applySelfSalaryRestrictions(
  data: SelfSalaryInput,
  userId: number,
  now: Date = new Date()
): string | null {
  if (data.type !== 'SALARY') {
    return 'Siz faqat o\'zingiz olgan pulni qo\'sha olasiz';
  }
  if (data.workerId !== undefined && data.workerId !== userId) {
    return 'Siz faqat o\'zingiz uchun transaksiya qo\'sha olasiz';
  }

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  if (data.date > endOfToday) {
    return 'Kelajakdagi sanaga transaksiya qo\'shib bo\'lmaydi';
  }

  data.workerId = userId;
  data.clientId = undefined;
  data.expenseCategory = undefined;
  data.taskId = undefined;
  data.branchId = undefined;
  data.virtualCardId = undefined;
  data.isLegacyPayment = false;
  return null;
}

/**
 * Xodim o'chira oladigan yozuv: faqat o'zining SALARY yozuvi va faqat
 * qo'shilgan kuni ichida. Admin uchun bu tekshiruv chaqirilmaydi.
 */
export function canWorkerDeleteTransaction(
  transaction: { type: string; workerId: number | null; createdAt: Date },
  userId: number,
  now: Date = new Date()
): boolean {
  if (transaction.type !== 'SALARY' || transaction.workerId !== userId) return false;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return transaction.createdAt >= startOfToday;
}
