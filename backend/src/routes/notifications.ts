import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET / - Get unread notifications for current user
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.inAppNotification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      include: {
        taskProcess: {
          select: { id: true, taskId: true, processType: true, status: true },
        },
      },
    });
    res.json(notifications);
  } catch (error: any) {
    console.error('Notifications get error:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// PATCH /:id/read - Mark notification as read
router.patch('/:id/read', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Noto\'g\'ri ID' });
    }
    const userId = req.user!.id;

    const notif = await prisma.inAppNotification.findUnique({
      where: { id },
    });
    if (!notif) {
      return res.status(404).json({ error: 'Bildirishnoma topilmadi' });
    }
    if (notif.userId !== userId) {
      return res.status(403).json({ error: 'Boshqa foydalanuvchi bildirishnomasini o\'zgartira olmaysiz' });
    }

    await prisma.inAppNotification.update({
      where: { id },
      data: { read: true },
    });

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Notification read error:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;
