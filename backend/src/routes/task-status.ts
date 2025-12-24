import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ValidationService } from '../services/validation.service';
import { DocumentService } from '../services/document.service';
import { AiService } from '../services/ai.service';
import { TaskStatus } from '@prisma/client';

const router = Router();

const updateStatusSchema = z.object({
  status: z.enum([
    'BOSHLANMAGAN',
    'JARAYONDA',
    'TAYYOR',
    'TEKSHIRILGAN',
    'TOPSHIRILDI',
    'YAKUNLANDI',
    'INVOICE_READY',
    'ST_READY',
    'FITO_READY',
    'PASSED_AI_CHECK',
    'RETURNED',
  ]),
});

/**
 * POST /tasks/:id/status
 * Update task status with document validation
 */
router.post('/:id/status', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const newStatus = parsed.data.status as TaskStatus;

    // Check user access
    const validationService = new ValidationService(prisma);
    const canAccess = await validationService.canUserAccessTask(
      taskId,
      user.id,
      user.role
    );

    if (!canAccess) {
      return res.status(403).json({ error: 'Bu taskga kirish huquqingiz yo\'q' });
    }

    // Validate document requirements
    try {
      await validationService.validateStatusChange(taskId, newStatus);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Document validation failed',
      });
    }

    // Update status
    const updatedTask = await prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          updatedById: user.id,
        },
        select: {
          id: true,
          status: true,
          title: true,
        },
      });

      // If status is ST_READY, trigger AI comparison
      if (newStatus === 'ST_READY') {
        try {
          const aiService = new AiService(tx);
          const comparison = await aiService.runInvoiceStComparison(taskId);

          // Backend decides status based on AI findings
          let finalStatus: TaskStatus = newStatus;
          if (comparison.result === 'FAIL') {
            finalStatus = 'RETURNED';
          } else {
            finalStatus = 'PASSED_AI_CHECK';
          }

          // Update status if changed
          if (finalStatus !== newStatus) {
            return await tx.task.update({
              where: { id: taskId },
              data: {
                status: finalStatus,
                updatedById: user.id,
              },
              select: {
                id: true,
                status: true,
                title: true,
              },
            });
          }
        } catch (aiError) {
          // Log AI error but don't fail the status update
          console.error('AI comparison error:', aiError);
          // Status remains ST_READY, can be checked manually later
        }
      }

      return task;
    });

    res.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;

