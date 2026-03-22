import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { NOTIFICATION_CONFIG } from '../services/notificationService';

const router = Router();

// GET / - Foydalanuvchining bildirishnomalarini olish
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const onlyUnread = req.query.unread === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const whereClause = onlyUnread
      ? `WHERE "userId" = ${userId} AND "read" = false`
      : `WHERE "userId" = ${userId}`;

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT "id", "userId", "type"::text, "title", "message", "actionUrl", "read", "taskId", "metadata", "createdAt" FROM "Notification" ${whereClause} ORDER BY "createdAt" DESC LIMIT ${limit}`
    );

    const result = rows.map(n => ({
      ...n,
      icon: (NOTIFICATION_CONFIG as any)[n.type]?.icon || 'ℹ️',
      color: (NOTIFICATION_CONFIG as any)[n.type]?.color || 'gray',
    }));

    res.json(result);
  } catch (error: any) {
    console.error('Notifications get error:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /unread-count - O'qilmagan bildirishnomalar soni
router.get('/unread-count', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const result: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM "Notification" WHERE "userId" = ${userId} AND "read" = false`
    );
    res.json({ count: result[0]?.count || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:id/read - Bitta bildirishnomani o'qilgan deb belgilash
router.patch('/:id/read', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Noto\'g\'ri ID' });
    }
    const userId = req.user!.id;

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT "id", "userId" FROM "Notification" WHERE "id" = ${id}`
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bildirishnoma topilmadi' });
    }
    if (rows[0].userId !== userId) {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "Notification" SET "read" = true WHERE "id" = ${id}`
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Notification read error:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// PATCH /read-all - Barcha bildirishnomalarni o'qilgan deb belgilash
router.patch('/read-all', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    await prisma.$executeRawUnsafe(
      `UPDATE "Notification" SET "read" = true WHERE "userId" = ${userId} AND "read" = false`
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - Bitta bildirishnomani o'chirish
router.delete('/:id', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Noto\'g\'ri ID' });
    }
    const userId = req.user!.id;

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT "id", "userId" FROM "Notification" WHERE "id" = ${id}`
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    if (rows[0].userId !== userId) return res.status(403).json({ error: 'Ruxsat yo\'q' });

    await prisma.$executeRawUnsafe(`DELETE FROM "Notification" WHERE "id" = ${id}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
