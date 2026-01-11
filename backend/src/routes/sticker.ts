import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { isStickerReady } from '../services/task-status';
import { generateStickerPDF } from '../services/sticker-pdf';

const router = Router();

/**
 * GET /api/sticker/:taskId/pdf
 * Generate sticker PDF for a task (manual generation only)
 */
router.get('/:taskId/pdf', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.taskId);

    // Get task to check status and qrToken
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        qrToken: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if task is sticker-ready
    if (!isStickerReady(task.status)) {
      return res.status(400).json({
        error: 'Task is not ready for sticker generation. Status must be TEKSHIRILGAN.',
      });
    }

    if (!task.qrToken) {
      return res.status(400).json({
        error: 'Task does not have a QR token',
      });
    }

    // Generate sticker PDF as buffer
    const pdfBuffer = await generateStickerPDF(taskId);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sticker-${taskId}.pdf"`
    );

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating sticker PDF:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
    });
    res.status(500).json({
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
  }
});

export default router;
