import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { generateQrTokenIfNeeded } from '../services/task-status';
import { generateStickerImage } from '../services/sticker-image';

const router = Router();

/**
 * GET /api/sticker/:taskId/image
 * Generate sticker image (SVG) for a task
 */
router.get('/:taskId/image', requireAuth(), async (req: AuthRequest, res) => {
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

    // Generate QR token if it doesn't exist (allow sticker download for any status)
    if (!task.qrToken) {
      await generateQrTokenIfNeeded(taskId);
      // Reload task to get the newly generated token
      const updatedTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: { qrToken: true },
      });
      if (!updatedTask?.qrToken) {
        return res.status(500).json({
          error: 'Failed to generate QR token for task',
        });
      }
    }

    // Generate sticker PNG image as buffer
    console.log(`[Sticker] Generating sticker for task ${taskId}, current status: ${task.status}`);
    let imageBuffer: Buffer;
    try {
      imageBuffer = await generateStickerImage(taskId);
    } catch (genError: any) {
      console.error(`[Sticker] Error in generateStickerImage for task ${taskId}:`, genError);
      // Re-throw to be caught by outer catch block
      throw genError;
    }

    // Validate buffer
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      return res.status(500).json({
        error: 'Failed to generate sticker image: invalid buffer',
      });
    }

    // Set response headers BEFORE sending
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', imageBuffer.length.toString());
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sticker-${taskId}.png"`
    );
    res.setHeader('Cache-Control', 'no-cache');

    // Send image buffer
    res.end(imageBuffer);
  } catch (error: any) {
    console.error('Error generating sticker image:', error);
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
