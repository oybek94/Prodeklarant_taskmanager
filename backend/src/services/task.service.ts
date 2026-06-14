import { TaskRepository, TaskFilters } from '../repositories/task.repository';
import { TaskStatus } from '@prisma/client';

export class TaskService {
  constructor(private taskRepo: TaskRepository) {}

  async getTasks(
    filters: TaskFilters,
    pagination: { page?: number; limit?: number },
    userAuth: { role?: string; branchId?: number | null }
  ) {
    const pageNum = pagination.page;
    const limitNum = pagination.limit;
    
    const skip = pageNum && limitNum ? (pageNum - 1) * limitNum : undefined;
    const take = limitNum || 500; // Default limit
    
    // Validate status
    const validStatuses: TaskStatus[] = ['BOSHLANMAGAN', 'JARAYONDA', 'TAYYOR', 'TEKSHIRILGAN', 'TOPSHIRILDI', 'YAKUNLANDI'];
    if (filters.status && !validStatuses.includes(filters.status)) {
      filters.status = undefined;
    }

    const [tasks, total] = await Promise.all([
      this.taskRepo.findManyWithRelations(
        filters,
        skip,
        take,
        userAuth.role,
        userAuth.branchId ?? undefined
      ),
      pageNum && limitNum 
        ? this.taskRepo.count(filters, userAuth.role, userAuth.branchId ?? undefined) 
        : Promise.resolve(0),
    ]);

    if (pageNum && limitNum) {
      return {
        tasks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    }

    return tasks; // Backward compatibility
  }
}
