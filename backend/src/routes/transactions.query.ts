import { z } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * GET /transactions query'si: tekshiruv + Prisma where/sahifalash.
 * Alohida sof modul — DB'siz testlanadi.
 */

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Sana YYYY-MM-DD formatida bo\'lishi kerak');

const listQuerySchema = z.object({
  page: optional(z.coerce.number().int().min(1)),
  limit: optional(z.coerce.number().int().min(1).max(100)),
  type: optional(z.enum(['INCOME', 'EXPENSE', 'SALARY'])),
  paymentMethod: optional(z.enum(['CASH', 'CARD'])),
  clientId: optional(z.coerce.number().int().positive()),
  workerId: optional(z.coerce.number().int().positive()),
  startDate: optional(isoDate),
  endDate: optional(isoDate),
  search: optional(z.string().trim().max(200)),
});

export type TransactionListArgs =
  | { ok: true; page: number; take: number; skip: number; where: Prisma.TransactionWhereInput }
  | { ok: false; error: string };

export function buildTransactionListArgs(query: unknown, user: { id: number; role: string }): TransactionListArgs {
  const parsed = listQuerySchema.safeParse(query ?? {});
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  }
  const q = parsed.data;
  const isAdmin = user.role === 'ADMIN';
  const where: Prisma.TransactionWhereInput = {};

  if (q.type) where.type = q.type;
  if (q.paymentMethod) where.paymentMethod = q.paymentMethod;
  if (isAdmin && q.clientId) where.clientId = q.clientId;
  if (isAdmin && q.workerId) where.workerId = q.workerId;
  if (!isAdmin) where.workerId = user.id; // xodim faqat o'zini ko'radi

  if (q.startDate || q.endDate) {
    const date: Prisma.DateTimeFilter = {};
    if (q.startDate) date.gte = new Date(q.startDate);
    if (q.endDate) {
      const end = new Date(q.endDate);
      end.setHours(23, 59, 59, 999);
      date.lte = end;
    }
    where.date = date;
  }
  if (q.search) where.comment = { contains: q.search, mode: 'insensitive' };

  const page = q.page ?? 1;
  const take = q.limit ?? 15;
  return { ok: true, page, take, skip: (page - 1) * take, where };
}
