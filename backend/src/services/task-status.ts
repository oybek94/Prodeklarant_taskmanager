import { PrismaClient, Prisma, TaskStatus } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../prisma';

/**
 * Calculate task status based on stages using the formula:
 * 1. Barcha jarayonlar bo'sh = BOSHLANMAGAN
 * 2. Deklaratsiya = TAYYOR → TAYYOR
 * 3. Tekshirish = TAYYOR → TEKSHIRILGAN
 * 4. Topshirish = TAYYOR → TOPSHIRILDI
 * 5. Pochta = TAYYOR → YAKUNLANDI
 * 6. Invoys, Zayavka, TIR-SMR, ST, FITO TAYYOR → JARAYONDA
 */
export async function calculateTaskStatus(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<TaskStatus> {
  const stages = await (tx as any).taskStage.findMany({
    where: { taskId },
    select: { name: true, status: true },
  });

  if (stages.length === 0) {
    return TaskStatus.BOSHLANMAGAN;
  }

  // Create a map of stage names to status
  const stageMap = new Map(stages.map((s: any) => [s.name, s.status]));
  
  // Helper function to check if stage is TAYYOR
  const isReady = (name: string): boolean => {
    return stageMap.get(name) === 'TAYYOR';
  };

  // 1. Check if all stages are blank (BOSHLANMAGAN)
  const allBlank = stages.every((s: any) => s.status === 'BOSHLANMAGAN');
  if (allBlank) {
    return TaskStatus.BOSHLANMAGAN;
  }

  // Priority order based on formula (check from highest to lowest priority):
  // 5. Pochta = TAYYOR → YAKUNLANDI
  if (isReady('Pochta')) {
    return TaskStatus.YAKUNLANDI;
  }

  // 4. Topshirish = TAYYOR → TOPSHIRILDI
  if (isReady('Topshirish')) {
    return TaskStatus.TOPSHIRILDI;
  }

  // 3. Tekshirish = TAYYOR → TEKSHIRILGAN
  if (isReady('Tekshirish')) {
    return TaskStatus.TEKSHIRILGAN;
  }

  // 2. Deklaratsiya = TAYYOR → TAYYOR
  if (isReady('Deklaratsiya')) {
    return TaskStatus.TAYYOR;
  }

  // 6. Invoys, Zayavka, TIR-SMR, ST, FITO TAYYOR → JARAYONDA
  const earlyStages = ['Invoys', 'Zayavka', 'TIR-SMR', 'ST', 'Fito', 'FITO'];
  const hasEarlyStageReady = earlyStages.some((name) => isReady(name));
  if (hasEarlyStageReady) {
    return TaskStatus.JARAYONDA;
  }

  // If any other stage is TAYYOR, also return JARAYONDA
  const hasAnyReady = stages.some((s: any) => s.status === 'TAYYOR');
  if (hasAnyReady) {
    return TaskStatus.JARAYONDA;
  }

  // Otherwise -> BOSHLANMAGAN
  return TaskStatus.BOSHLANMAGAN;
}

/**
 * Check if a task is ready for sticker generation
 * A task is sticker-ready when its status is TEKSHIRILGAN
 */
export function isStickerReady(status: TaskStatus): boolean {
  return status === TaskStatus.TEKSHIRILGAN;
}

/**
 * Update task status based on its stages
 * Returns true if task entered TEKSHIRILGAN status (QR token generation needed)
 */
export async function updateTaskStatus(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<boolean> {
  // Eski statusni olish
  const oldTask = await (tx as any).task.findUnique({
    where: { id: taskId },
    select: { status: true },
  });

  const newStatus = await calculateTaskStatus(tx, taskId);
  const oldStatus = oldTask?.status;
  
  await (tx as any).task.update({
    where: { id: taskId },
    data: { status: newStatus },
  });

  // Return true if task entered TEKSHIRILGAN status (QR token generation needed)
  return oldStatus !== TaskStatus.TEKSHIRILGAN && newStatus === TaskStatus.TEKSHIRILGAN;
}

/**
 * Generate QR token for a task if it doesn't already have one.
 * This function is idempotent and safe against concurrent calls.
 * Should be called AFTER the transaction commits.
 */
export async function generateQrTokenIfNeeded(taskId: number): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        // Check if task exists and doesn't have a QR token
        const task = await (tx as any).task.findUnique({
          where: { id: taskId },
          select: { id: true, qrToken: true },
        });

        if (!task) {
          // Task not found - skip silently (task may have been deleted)
          return;
        }

        if (task.qrToken) {
          // Task already has a QR token - idempotent, skip
          return;
        }

        // Generate unique, secure token (16 bytes = 128 bits, base64url encoded = 22 chars)
        const tokenBytes = crypto.randomBytes(16);
        const qrToken = tokenBytes.toString('base64url');

        // Update with retry logic for unique constraint violations (race condition handling)
        try {
          await (tx as any).task.update({
            where: { id: taskId },
            data: { qrToken },
          });
        } catch (updateError: any) {
          // If unique constraint violation (P2002), another concurrent call succeeded
          // Check if token was set by another process (idempotency check)
          const updatedTask = await (tx as any).task.findUnique({
            where: { id: taskId },
            select: { qrToken: true },
          });

          if (updatedTask?.qrToken) {
            // Token was set by concurrent process - success (idempotent)
            return;
          }

          // Re-throw if it's not a unique constraint violation or token wasn't set
          throw updateError;
        }
      },
      {
        isolationLevel: 'ReadCommitted', // Standard isolation level
        maxWait: 5000, // 5 seconds max wait
        timeout: 10000, // 10 seconds timeout
      }
    );
  } catch (error) {
    // Log error but don't fail - QR token generation is non-critical
    console.error(`Error generating QR token for task ${taskId}:`, error);
  }
}

