import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

/**
 * GET /q/:token
 * Public QR verification endpoint (no authentication required)
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find task by QR token
    const task = await prisma.task.findUnique({
      where: { qrToken: token },
      include: {
        stages: {
          where: { name: 'Tekshirish' },
          select: { completedAt: true },
        },
        documents: {
          select: {
            id: true,
            name: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
            description: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // Parse vehicle plate number from task title (look for "АВТО" keyword)
    let vehiclePlate: string | null = null;
    if (task.title) {
      const autoIndex = task.title.indexOf('АВТО');
      if (autoIndex !== -1) {
        // Extract text after "АВТО" (skip "АВТО" and any spaces)
        const afterAuto = task.title.substring(autoIndex + 4).trim();
        // Take first word/token as plate number (typically format like "01А123ВС" or similar)
        const plateMatch = afterAuto.match(/^\S+/);
        if (plateMatch) {
          vehiclePlate = plateMatch[0];
        }
      }
    }

    // Get verification date (when Tekshirish stage was completed)
    const verificationDate = task.stages.length > 0 && task.stages[0].completedAt
      ? task.stages[0].completedAt
      : null;

    res.json({
      vehiclePlate,
      status: task.status,
      verificationDate,
      documents: task.documents,
    });
  } catch (error) {
    console.error('Error in QR verification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
