import { PrismaClient, TaskStatus, DocumentType } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Validation service for status-driven document enforcement
 * Ensures required documents are uploaded before status changes
 */
export class ValidationService {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  /**
   * Validate that required documents exist for a status change
   * @param taskId Task ID
   * @param newStatus Target status
   * @throws Error if validation fails
   */
  async validateStatusChange(taskId: number, newStatus: TaskStatus): Promise<void> {
    // Get all documents for this task
    const documents = await this.prisma.taskDocument.findMany({
      where: { taskId },
      select: { documentType: true },
    });

    const documentTypes = documents
      .map((d) => d.documentType)
      .filter((t): t is DocumentType => t !== null);

    // Status-specific validation rules
    switch (newStatus) {
      case 'INVOICE_READY':
        if (!documentTypes.includes('INVOICE')) {
          throw new Error('INVOICE_READY status uchun Invoice PDF yuklanishi shart');
        }
        break;

      case 'ST_READY':
        if (!documentTypes.includes('INVOICE')) {
          throw new Error('ST_READY status uchun Invoice PDF yuklanishi shart');
        }
        if (!documentTypes.includes('ST')) {
          throw new Error('ST_READY status uchun ST PDF yuklanishi shart');
        }
        break;

      case 'FITO_READY':
        if (!documentTypes.includes('INVOICE')) {
          throw new Error('FITO_READY status uchun Invoice PDF yuklanishi shart');
        }
        if (!documentTypes.includes('ST')) {
          throw new Error('FITO_READY status uchun ST PDF yuklanishi shart');
        }
        if (!documentTypes.includes('FITO')) {
          throw new Error('FITO_READY status uchun FITO PDF yuklanishi shart');
        }
        break;

      // Other statuses don't require specific documents
      default:
        break;
    }
  }

  /**
   * Check if user can access this task
   * @param taskId Task ID
   * @param userId User ID
   * @param userRole User role
   * @returns true if user can access
   */
  async canUserAccessTask(
    taskId: number,
    userId: number,
    userRole: string
  ): Promise<boolean> {
    // ADMIN and MANAGER can access all tasks
    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      return true;
    }

    // DEKLARANT can only access tasks in their branch
    if (userRole === 'DEKLARANT') {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: { branchId: true },
      });

      if (!task) return false;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { branchId: true },
      });

      return user?.branchId === task.branchId;
    }

    return false;
  }
}

