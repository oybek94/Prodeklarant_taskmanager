import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { NOTIFICATION_CONFIG } from '../services/notificationService';

const router = Router();

const parseId = (raw: string): number | null => {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
};

// GET / - Foydalanuvchining bildirishnomalarini olish
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const onlyUnread = req.query.unread === 'true';
    const limit = Math.min(Number.parseInt(req.query.limit as string, 10) || 50, 100);

    const rows = await prisma.notification.findMany({
      where: { userId, ...(onlyUnread ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(rows.map((n) => ({
      ...n,
      icon: NOTIFICATION_CONFIG[n.type]?.icon || 'ℹ️',
      color: NOTIFICATION_CONFIG[n.type]?.color || 'gray',
    })));
  } catch (error) {
    console.error('Notifications get error:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// GET /unread-count - O'qilmagan bildirishnomalar soni
router.get('/unread-count', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    });
    res.json({ count });
  } catch (error) {
    console.error('Notifications unread-count error:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// PATCH /:id/read - Bitta bildirishnomani o'qilgan deb belgilash
router.patch('/:id/read', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Noto\'g\'ri ID' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!notification) {
      return res.status(404).json({ error: 'Bildirishnoma topilmadi' });
    }
    if (notification.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }

    await prisma.notification.update({ where: { id }, data: { read: true } });
    res.json({ success: true });
  } catch (error) {
    console.error('Notification read error:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// PATCH /read-all - Barcha bildirishnomalarni o'qilgan deb belgilash
router.patch('/read-all', requireAuth(), async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Notifications read-all error:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// DELETE /:id - Bitta bildirishnomani o'chirish
router.delete('/:id', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Noto\'g\'ri ID' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!notification) return res.status(404).json({ error: 'Topilmadi' });
    if (notification.userId !== req.user!.id) return res.status(403).json({ error: 'Ruxsat yo\'q' });

    await prisma.notification.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Notification delete error:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

export default router;
