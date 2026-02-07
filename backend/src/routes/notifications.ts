import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function getCarNumber(vehicleNumber?: string | null): string {
  if (!vehicleNumber || typeof vehicleNumber !== 'string') return '';
  return vehicleNumber.split('/')[0].trim() || '';
}

function getCarNumberFromTaskTitle(title?: string | null): string {
  if (!title || typeof title !== 'string') return '';
  const parts = title.split(/\s+АВТО\s+/i);
  if (parts.length >= 2) {
    const plate = (parts[1].trim().split(/\s/)[0] || parts[1].trim());
    if (plate) return plate;
  }
  const beforeSlash = title.split('/')[0]?.trim();
  if (beforeSlash && beforeSlash.length <= 20) return beforeSlash;
  return '';
}

// GET / - Get unread notifications for current user
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.inAppNotification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      include: {
        taskProcess: {
          select: {
            id: true,
            taskId: true,
            processType: true,
            status: true,
            task: { select: { id: true, title: true } },
          },
        },
      },
    });

    // Avtomobil raqamini Invoice.additionalInfo.vehicleNumber dan olish
    const taskIds = [...new Set(notifications.map((n) => n.taskId))];
    const invoices = await prisma.invoice.findMany({
      where: { taskId: { in: taskIds } },
      select: { taskId: true, additionalInfo: true },
    });
    const carNumberByTaskId = new Map<number, string>();
    for (const inv of invoices) {
      const info = inv.additionalInfo as { vehicleNumber?: string } | null;
      const plate = getCarNumber(info?.vehicleNumber);
      if (plate) carNumberByTaskId.set(inv.taskId, plate);
    }

    const result = notifications.map((n) => {
      const carNumber = carNumberByTaskId.get(n.taskId) || getCarNumberFromTaskTitle(n.taskProcess?.task?.title);
      return { ...n, carNumber };
    });
    res.json(result);
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
