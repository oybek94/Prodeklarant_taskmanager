import { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../prisma';
import { tashkentDate } from '../utils/tashkent-time';

export interface TaskFilters {
  branchId?: number;
  clientId?: number;
  status?: TaskStatus;
  /** Faol ro'yxat: YAKUNLANDI'dan boshqa barcha statuslar (status berilsa e'tiborsiz) */
  excludeCompleted?: boolean;
  hasPsr?: boolean;
  search?: string;
  /** "YYYY-MM-DD" — Toshkent kuni */
  startDate?: string;
  endDate?: string;
}

/**
 * "YYYY-MM-DD" (Toshkent kuni) → createdAt oralig'i. Server TZ'ga bog'liq emas:
 * Toshkentda 00:00–05:00 da yaratilgan vazifalar oldingi kunga tushib qolmaydi.
 */
export function tashkentDayRange(startDate?: string, endDate?: string): { gte?: Date; lte?: Date } | undefined {
  if (!startDate && !endDate) return undefined;
  const parse = (s: string) => s.split('-').map(Number);
  const range: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    const [y, m, d] = parse(startDate);
    range.gte = tashkentDate(y, m - 1, d);
  }
  if (endDate) {
    const [y, m, d] = parse(endDate);
    range.lte = tashkentDate(y, m - 1, d, 23, 59, 59, 999);
  }
  return range;
}

export class TaskRepository {
  async findManyWithRelations(filters: TaskFilters, skip?: number, take?: number, userRole?: string, userBranchId?: number) {
    const where = this.buildWhereClause(filters, userRole, userBranchId);

    // Faqat ro'yxat jadvali va Excel eksporti uchun kerakli maydonlar.
    // Mijoz telefoni/shartnoma summasi bu yerda yuborilmaydi — ular vazifa kartochkasida.
    const baseQuery = {
      where,
      select: {
        id: true,
        title: true,
        status: true,
        comments: true,
        hasPsr: true,
        driverPhone: true,
        customsPaymentMultiplier: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        // Umumiy vaqt (durationMin yig'indisi) uchun
        stages: { select: { durationMin: true } },
      },
      orderBy: { createdAt: 'desc' as const },
    };

    // take doim qo'llanadi — pagination bo'lmaganda ham javob hajmi cheklanadi.
    // Ilgari `skip !== undefined &&` sharti tufayli take butunlay e'tiborsiz qolar,
    // natijada limitsiz so'rovlar butun jadvalni qaytarardi.
    return prisma.task.findMany({
      ...baseQuery,
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    });
  }

  async count(filters: TaskFilters, userRole?: string, userBranchId?: number): Promise<number> {
    const where = this.buildWhereClause(filters, userRole, userBranchId);
    return prisma.task.count({ where });
  }

  private buildWhereClause(filters: TaskFilters, userRole?: string, userBranchId?: number): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {};

    if (userRole === 'DEKLARANT' && userBranchId) {
      where.branchId = userBranchId;
    } else if (userRole === 'MANAGER' || userRole === 'ADMIN') {
      if (filters.branchId) where.branchId = filters.branchId;
    } else {
      if (userBranchId) where.branchId = userBranchId;
      else if (filters.branchId) where.branchId = filters.branchId;
    }

    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.status) where.status = filters.status;
    else if (filters.excludeCompleted) where.status = { not: 'YAKUNLANDI' };
    if (filters.hasPsr !== undefined) where.hasPsr = filters.hasPsr;

    const createdAt = tashkentDayRange(filters.startDate, filters.endDate);
    if (createdAt) where.createdAt = createdAt;

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { client: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return where;
  }
}
