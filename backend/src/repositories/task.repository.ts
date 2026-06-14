import { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../prisma';

export interface TaskFilters {
  branchId?: number;
  clientId?: number;
  status?: TaskStatus;
  hasPsr?: boolean;
  search?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

export class TaskRepository {
  async findManyWithRelations(filters: TaskFilters, skip?: number, take?: number, userRole?: string, userBranchId?: number) {
    const where = this.buildWhereClause(filters, userRole, userBranchId);

    const baseQuery = {
      where,
      select: {
        id: true,
        title: true,
        status: true,
        comments: true,
        hasPsr: true,
        afterHoursDeclaration: true,
        afterHoursPayer: true,
        driverPhone: true,
        customsPaymentMultiplier: true,
        createdAt: true,
        client: { select: { id: true, name: true, phone: true, dealAmount: true, dealAmountCurrency: true } },
        branch: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        stages: {
          select: {
            name: true,
            status: true,
            durationMin: true,
            completedAt: true,
          },
          orderBy: { stageOrder: 'asc' as const },
        },
      },
      orderBy: { createdAt: 'desc' as const },
    };

    if (skip !== undefined && take !== undefined) {
      return prisma.task.findMany({ ...baseQuery, skip, take });
    }

    return prisma.task.findMany(baseQuery);
  }

  async count(filters: TaskFilters, userRole?: string, userBranchId?: number): Promise<number> {
    const where = this.buildWhereClause(filters, userRole, userBranchId);
    return prisma.task.count({ where });
  }

  private buildWhereClause(filters: TaskFilters, userRole?: string, userBranchId?: number) {
    const where: any = {};

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
    if (filters.hasPsr !== undefined) where.hasPsr = filters.hasPsr;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        const sd = new Date(filters.startDate);
        sd.setHours(0, 0, 0, 0);
        where.createdAt.gte = sd;
      }
      if (filters.endDate) {
        const ed = new Date(filters.endDate);
        ed.setHours(23, 59, 59, 999);
        where.createdAt.lte = ed;
      }
    }

    if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { client: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return where;
  }
}
