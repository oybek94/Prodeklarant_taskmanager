import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ValidationService } from '../services/validation.service';
import { DocumentVerificationService } from '../services/document-verification.service';

const router = Router();

async function canAccess(taskId: number, userId: number, role: string): Promise<boolean> {
  const validationService = new ValidationService(prisma);
  return validationService.canUserAccessTask(taskId, userId, role);
}

/**
 * GET /tasks/:id/ai-checks
 * Get AI check results for a task
 */
router.get('/:id/ai-checks', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!(await canAccess(taskId, user.id, user.role))) {
      return res.status(403).json({ error: 'Bu taskga kirish huquqingiz yo\'q' });
    }

    // Get AI checks - handle case when table doesn't exist
    let aiChecks: unknown[] = [];
    try {
      aiChecks = await prisma.aiCheck.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          taskDocumentId: true,
          checkType: true,
          result: true,
          details: true,
          createdAt: true,
        },
      });
    } catch (dbError: any) {
      // If table doesn't exist, return empty array
      const isTableMissing =
        dbError?.code === 'P2021' ||
        dbError?.code === 'P2010' ||
        dbError?.prismaError?.code === '42P01' ||
        dbError?.message?.includes('does not exist') ||
        dbError?.message?.includes('не существует') ||
        dbError?.message?.includes('relation') && dbError?.message?.includes('does not exist');

      if (isTableMissing) {
        console.warn('AiCheck table does not exist, returning empty array');
        aiChecks = [];
      } else {
        // Other database error - rethrow
        throw dbError;
      }
    }

    res.json({
      success: true,
      checks: aiChecks,
    });
  } catch (error) {
    console.error('Error fetching AI checks:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

const rerunSchema = z.object({
  taskDocumentId: z.number().int().positive(),
});

/**
 * POST /tasks/:id/ai-checks/rerun
 * Hujjat tekshiruvini qayta ishga tushirish (yangi AiCheck qatori yaratiladi,
 * tarix saqlanadi). Natija sinxron qaytariladi.
 */
router.post('/:id/ai-checks/rerun', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = rerunSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    if (!(await canAccess(taskId, user.id, user.role))) {
      return res.status(403).json({ error: 'Bu taskga kirish huquqingiz yo\'q' });
    }

    const { taskDocumentId } = parsed.data;

    const doc = await prisma.taskDocument.findFirst({
      where: { id: taskDocumentId, taskId },
      select: { id: true },
    });
    if (!doc) {
      return res.status(404).json({ error: 'Hujjat topilmadi' });
    }

    await new DocumentVerificationService(prisma).verifyDocumentAgainstInvoice(taskDocumentId);

    const latestCheck = await prisma.aiCheck.findFirst({
      where: { taskId, taskDocumentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        taskDocumentId: true,
        checkType: true,
        result: true,
        details: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      check: latestCheck,
    });
  } catch (error) {
    console.error('Error re-running AI check:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

const dismissSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

/**
 * PATCH /tasks/:id/ai-checks/:checkId/dismiss
 * Noto'g'ri-ijobiy (false positive) natijani tan olish — details JSON'ga
 * dismissed {by, reason, at} yoziladi, natijaning o'zi o'zgarmaydi.
 */
router.patch('/:id/ai-checks/:checkId/dismiss', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const checkId = parseInt(req.params.checkId);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = dismissSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    if (!(await canAccess(taskId, user.id, user.role))) {
      return res.status(403).json({ error: 'Bu taskga kirish huquqingiz yo\'q' });
    }

    const check = await prisma.aiCheck.findFirst({
      where: { id: checkId, taskId },
    });
    if (!check) {
      return res.status(404).json({ error: 'AI tekshiruv topilmadi' });
    }

    const existingDetails =
      check.details && typeof check.details === 'object' && !Array.isArray(check.details)
        ? (check.details as Prisma.JsonObject)
        : {};

    const updated = await prisma.aiCheck.update({
      where: { id: checkId },
      data: {
        details: {
          ...existingDetails,
          dismissed: {
            by: user.id,
            reason: parsed.data.reason ?? null,
            at: new Date().toISOString(),
          },
        } as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        taskDocumentId: true,
        checkType: true,
        result: true,
        details: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      check: updated,
    });
  } catch (error) {
    console.error('Error dismissing AI check:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
