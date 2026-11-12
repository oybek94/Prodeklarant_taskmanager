import { vi } from 'vitest';

// Testlarning aksariyati prisma'ni o'zicha soxtalashtiradi va tokenlarni qo'lda imzolaydi —
// ularda xodim sessiyasi bazadan tekshirilmaydi. Sessiya mantig'ining o'z testi
// (staff-session.test.ts) haqiqiy modulni vi.importActual orqali oladi.
vi.mock('./src/utils/staff-session', () => ({
  isStaffSessionValid: vi.fn(async () => true),
  invalidateStaffSession: vi.fn(),
  clearStaffSessionCache: vi.fn(),
}));
