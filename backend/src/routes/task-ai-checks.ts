import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ValidationService } from '../services/validation.service';

const router = Router();

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

    // Get AI checks
    const aiChecks = await prisma.aiCheck.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        checkType: true,
        result: true,
        details: true,
        createdAt: true,
      },
    });

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

export default router;

