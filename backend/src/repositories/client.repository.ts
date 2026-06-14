import { Prisma, Client } from '@prisma/client';
import { prisma } from '../prisma';

export interface ClientFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class ClientRepository {
  async findManyWithRelations(filters: ClientFilters, skip?: number, take?: number) {
    const where = this.buildWhereClause(filters);

    const baseQuery = {
      where,
      include: {
        tasks: {
          select: {
            id: true,
            hasPsr: true,
            snapshotDealAmount: true,
            snapshotPsrPrice: true,
          },
        },
        transactions: {
          where: { type: 'INCOME' as const },
          select: {
            amount: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' as const },
    };

    if (skip !== undefined && take !== undefined) {
      return prisma.client.findMany({ ...baseQuery, skip, take });
    }

    return prisma.client.findMany(baseQuery);
  }

  async count(filters: ClientFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.client.count({ where });
  }

  private buildWhereClause(filters: ClientFilters) {
    const where: any = {};
    if (filters.search) {
      where.OR = [
        { name: { contains: String(filters.search), mode: 'insensitive' } },
        { phone: { contains: String(filters.search), mode: 'insensitive' } },
        { inn: { contains: String(filters.search), mode: 'insensitive' } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(String(filters.dateFrom));
      if (filters.dateTo) {
        const toDate = new Date(String(filters.dateTo));
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }
    return where;
  }

  async findByIdWithRelations(id: number) {
    return prisma.client.findUnique({
      where: { id },
      include: {
        tasks: {
          include: { branch: true },
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          where: { type: 'INCOME' as const },
          orderBy: { date: 'desc' },
        },
      },
    });
  }
}
