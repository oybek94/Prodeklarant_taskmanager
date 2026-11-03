import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest, STAFF_ROLES } from '../middleware/auth';
import { io } from '../server';

const router = Router();

const createSchema = z.object({
  truckNumber: z
    .string()
    .transform((v) => v.replace(/\s+/g, '').toUpperCase())
    .pipe(z.string().min(3, 'Fura raqami juda qisqa').max(20, 'Fura raqami juda uzun')),
  remindAt: z.coerce.date(),
});

const reminderSelect = {
  id: true,
  truckNumber: true,
  remindAt: true,
  sentAt: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} as const;

// Kutayotgan eslatmalar + oxirgi 24 soatda yuborilganlar
router.get('/', requireAuth(...STAFF_ROLES), async (_req: AuthRequest, res) => {
  try {
    const reminders = await prisma.fumigationReminder.findMany({
      where: {
        OR: [{ sentAt: null }, { sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }],
      },
      select: reminderSelect,
      orderBy: { remindAt: 'asc' },
    });
    res.json(reminders);
  } catch (error) {
    console.error('Error fetching fumigation reminders:', error);
    res.status(500).json({ error: 'Failed to fetch fumigation reminders' });
  }
});

router.post('/', requireAuth(...STAFF_ROLES), async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Noto\'g\'ri ma\'lumot' });
  }
  const { truckNumber, remindAt } = parsed.data;
  if (Number.isNaN(remindAt.getTime())) {
    return res.status(400).json({ error: 'Vaqt noto\'g\'ri' });
  }
  if (remindAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Eslatma vaqti kelajakda bo\'lishi kerak' });
  }

  try {
    const reminder = await prisma.fumigationReminder.create({
      data: { truckNumber, remindAt, createdById: req.user!.id },
      select: reminderSelect,
    });
    io.emit('fumigation:updated');
    res.status(201).json(reminder);
  } catch (error) {
    console.error('Error creating fumigation reminder:', error);
    res.status(500).json({ error: 'Failed to create fumigation reminder' });
  }
});

// Bekor qilish / ro'yxatdan olib tashlash: faqat yaratgan xodim yoki ADMIN
router.delete('/:id', requireAuth(...STAFF_ROLES), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Noto\'g\'ri ID' });
  }
  try {
    const existing = await prisma.fumigationReminder.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (!existing) return res.status(404).json({ error: 'Eslatma topilmadi' });
    if (req.user!.role !== 'ADMIN' && existing.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Faqat yaratgan xodim yoki admin o\'chira oladi' });
    }
    await prisma.fumigationReminder.delete({ where: { id } });
    io.emit('fumigation:updated');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting fumigation reminder:', error);
    res.status(500).json({ error: 'Failed to delete fumigation reminder' });
  }
});

export default router;
