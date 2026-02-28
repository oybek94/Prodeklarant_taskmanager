import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { getWorkerKpiStats } from '../services/kpi';

const router = Router();

router.get('/configs', requireAuth(), async (_req, res) => {
  const cfg = await prisma.kpiConfig.findMany({ orderBy: { stageName: 'asc' } });
  res.json(cfg);
});

const updateSchema = z.object({
  stageName: z.string(),
  price: z.number().nonnegative(),
});

router.put('/configs', requireAuth('ADMIN'), async (req, res) => {
  const parsed = updateSchema.array().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await prisma.$transaction(
    parsed.data.map((item) =>
      prisma.kpiConfig.upsert({
        where: { stageName: item.stageName },
        update: { price: item.price },
        create: { stageName: item.stageName, price: item.price },
      })
    )
  );
  res.json(result);
});

router.get('/logs', requireAuth('ADMIN'), async (_req, res) => {
  const logs = await prisma.kpiLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(logs);
});

// Yangi API: Worker Performance Stats
router.get('/worker-stats/:workerId', requireAuth(), async (req, res) => {
  try {
    const workerId = parseInt(req.params.workerId, 10);
    if (isNaN(workerId)) {
      return res.status(400).json({ error: "Noto'g'ri ishchi IDsi" });
    }

    const { startDate, endDate } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
    }
    if (endDate) {
      end = new Date(endDate as string);
    }

    const stats = await getWorkerKpiStats(workerId, start, end);
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching worker KPI stats:', error);
    res.status(500).json({ error: "Ishchi statistikasini yuklashda xatolik yuz berdi" });
  }
});

export default router;

