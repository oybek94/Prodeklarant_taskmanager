import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const DEFAULT_TARGET_TASKS = 2000;

const yearlyGoalSchema = z.object({
  year: z.number().int().min(2000),
  targetTasks: z.number().int().min(0),
});

// GET /yearly-goal-config - Yillik maqsadni olish
router.get('/', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const model = (prisma as any).yearlyGoalConfig;
    if (!model) {
      return res.json({ year: currentYear, targetTasks: DEFAULT_TARGET_TASKS });
    }

    let config = await model.findUnique({
      where: { year: currentYear },
    });

    if (!config) {
      config = await model.create({
        data: { year: currentYear, targetTasks: DEFAULT_TARGET_TASKS },
      });
    }

    res.json(config);
  } catch (error: any) {
    console.error('Error fetching yearly goal config:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /yearly-goal-config - Yillik maqsadni yaratish/yangilash
router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = yearlyGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const data = parsed.data;
    const model = (prisma as any).yearlyGoalConfig;
    if (!model) {
      return res.status(500).json({ error: 'Yearly goal config is not available. Run migrations and regenerate Prisma client.' });
    }
    const config = await model.upsert({
      where: { year: data.year },
      create: data,
      update: { targetTasks: data.targetTasks },
    });

    res.json(config);
  } catch (error: any) {
    console.error('Error saving yearly goal config:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;
