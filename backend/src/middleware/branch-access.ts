import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma';
import type { AuthRequest } from './auth';

/**
 * Obyekt darajasidagi filial chegarasi. Ro'yxat endpointlari (GET /tasks, GET /invoices)
 * xodimni o'z filiali bilan cheklaydi, lekin bitta yozuvni ID bo'yicha olish (GET /tasks/:id,
 * /invoices/:id, /documents/task/:id ...) cheklanmagan edi — boshqa filial yozuvini ID ni
 * almashtirib ko'rish mumkin edi (IDOR).
 *
 * Qoida ro'yxatlar bilan bir xil: ADMIN/MANAGER hamma narsani ko'radi; filiali belgilanmagan
 * xodim ro'yxatda ham hammasini ko'radi; qolganlar faqat o'z filialini. Istisno — vazifada
 * o'ziga bosqich (stage) tayinlangan xodim: u boshqa filial vazifasida ham ishlay oladi.
 */
type Actor = NonNullable<AuthRequest['user']>;

export type BranchAccess = 'ok' | 'not_found' | 'forbidden';

const sameBranchOrUnrestricted = (user: Actor, resourceBranchId: number | null): boolean => {
  if (user.role === 'ADMIN' || user.role === 'MANAGER') return true;
  if (user.branchId == null) return true;
  return resourceBranchId != null && resourceBranchId === user.branchId;
};

const hasAssignedStage = async (taskId: number, userId: number): Promise<boolean> =>
  (await prisma.taskStage.findFirst({ where: { taskId, assignedToId: userId }, select: { id: true } })) !== null;

export const checkTaskAccess = async (user: Actor, taskId: number): Promise<BranchAccess> => {
  if (user.role === 'ADMIN' || user.role === 'MANAGER') return 'ok';
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { branchId: true } });
  if (!task) return 'not_found';
  if (sameBranchOrUnrestricted(user, task.branchId)) return 'ok';
  return (await hasAssignedStage(taskId, user.id)) ? 'ok' : 'forbidden';
};

export const checkInvoiceAccess = async (user: Actor, invoiceId: number): Promise<BranchAccess> => {
  if (user.role === 'ADMIN' || user.role === 'MANAGER') return 'ok';
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { branchId: true, taskId: true, task: { select: { branchId: true } } },
  });
  if (!invoice) return 'not_found';
  if (sameBranchOrUnrestricted(user, invoice.branchId ?? invoice.task?.branchId ?? null)) return 'ok';
  return invoice.taskId != null && (await hasAssignedStage(invoice.taskId, user.id)) ? 'ok' : 'forbidden';
};

const FORBIDDEN_MESSAGE = "Bu yozuvga kirish huquqingiz yo'q";

/**
 * `router.param(name, ...)` uchun: URL'dagi ID bo'yicha filial tekshiruvi. Noto'g'ri ko'rinishdagi
 * ID rad etiladi (400), topilmagan yozuvni esa endpointning o'zi 404 qiladi. Param
 * handler route middleware'dan OLDIN ishlaydi, shuning uchun foydalanuvchi bo'lmasa (yoki
 * mijoz tokeni bo'lsa) ham o'tkazadi — autentifikatsiyani requireAuth/authenticateApi hal qiladi.
 */
const guardParam =
  (check: (user: Actor, id: number) => Promise<BranchAccess>) =>
  async (req: Request, res: Response, next: NextFunction, value: string) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) return next();
      // Faqat kanonik o'nlik ID. Handlerlar ID ni turlicha o'qiydi (Number, parseInt, z.coerce),
      // "7e1" ni esa biri 70, boshqasi 7 deb o'qiydi — tekshiruv bitta ID ga, handler boshqasiga
      // ishlamasligi uchun boshqa ko'rinishdagi qiymat (e-yozuv, 0x, bo'shliq, kasr) rad etiladi.
      if (!/^\d{1,15}$/.test(value)) return res.status(400).json({ error: "Noto'g'ri ID" });
      const access = await check(user, Number(value));
      if (access === 'forbidden') return res.status(403).json({ error: FORBIDDEN_MESSAGE });
      return next();
    } catch (error) {
      return next(error);
    }
  };

export const taskBranchParam = guardParam(checkTaskAccess);
export const invoiceBranchParam = guardParam(checkInvoiceAccess);

/** Ro'yxat so'rovi (masalan mijozning invoyslari) uchun: foydalanuvchi ko'ra oladigan filial sharti. */
export const branchScopeWhere = (user: AuthRequest['user']): { branchId: number } | Record<string, never> => {
  if (!user || user.role === 'ADMIN' || user.role === 'MANAGER' || user.branchId == null) return {};
  return { branchId: user.branchId };
};
