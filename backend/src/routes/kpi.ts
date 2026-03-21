import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { getWorkerKpiStats } from '../services/kpi';

const router = Router();

// ─── Barcha aktiv stage nomlarini olish (distinct) ───
router.get('/stages', requireAuth(), async (_req, res) => {
  const configs = await prisma.kpiConfig.findMany({
    select: { stageName: true },
    distinct: ['stageName'],
    orderBy: { stageName: 'asc' },
  });
  res.json(configs.map(c => c.stageName));
});

// ─── Yangi stage qo'shish (boshlang'ich narx bilan) ───
router.post('/stages', requireAuth('ADMIN'), async (req, res) => {
  const schema = z.object({
    stageName: z.string().min(1),
    price: z.number().nonnegative(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // Tekshiruv — allaqachon mavjudmi
  const existing = await prisma.kpiConfig.findFirst({
    where: { stageName: parsed.data.stageName },
  });
  if (existing) {
    return res.status(400).json({ error: 'Bu nomdagi jarayon allaqachon mavjud' });
  }

  const result = await prisma.kpiConfig.create({
    data: {
      stageName: parsed.data.stageName,
      price: parsed.data.price,
      effectiveFrom: new Date(),
      note: 'Yangi jarayon qo\'shildi',
    },
  });
  res.json(result);
});

// ─── Stage'ni o'chirish (KpiConfig yozuvlarini o'chirish, KpiLog'lar saqlanadi) ───
router.delete('/stages/:stageName', requireAuth('ADMIN'), async (req, res) => {
  const stageName = decodeURIComponent(req.params.stageName);

  // KpiLog'dagi tarixiy yozuvlar saqlanadi — faqat KpiConfig'lar o'chiriladi
  const deleted = await prisma.kpiConfig.deleteMany({
    where: { stageName },
  });

  res.json({
    success: true,
    deletedCount: deleted.count,
    message: `"${stageName}" jarayoni o'chirildi. Tarixiy hisob-kitoblar saqlanib qoldi.`,
  });
});

// ─── Joriy narxlarni olish (har bir stage uchun eng so'nggi effectiveFrom <= now) ───
router.get('/configs/current', requireAuth(), async (_req, res) => {
  const now = new Date();
  const allConfigs = await prisma.kpiConfig.findMany({
    where: { effectiveFrom: { lte: now } },
    orderBy: [{ stageName: 'asc' }, { effectiveFrom: 'desc' }],
  });

  // Har bir stageName uchun eng so'nggi yozuvni olish
  const currentMap = new Map<string, typeof allConfigs[0]>();
  for (const cfg of allConfigs) {
    if (!currentMap.has(cfg.stageName)) {
      currentMap.set(cfg.stageName, cfg);
    }
  }

  res.json(Array.from(currentMap.values()));
});

// ─── Barcha tarixni olish (guruhlab) ───
router.get('/configs/history', requireAuth(), async (_req, res) => {
  const configs = await prisma.kpiConfig.findMany({
    orderBy: [{ effectiveFrom: 'desc' }, { stageName: 'asc' }],
  });
  res.json(configs);
});

// ─── Eski endpoint - backward compat ───
router.get('/configs', requireAuth(), async (_req, res) => {
  const now = new Date();
  const allConfigs = await prisma.kpiConfig.findMany({
    where: { effectiveFrom: { lte: now } },
    orderBy: [{ stageName: 'asc' }, { effectiveFrom: 'desc' }],
  });

  const currentMap = new Map<string, typeof allConfigs[0]>();
  for (const cfg of allConfigs) {
    if (!currentMap.has(cfg.stageName)) {
      currentMap.set(cfg.stageName, cfg);
    }
  }

  res.json(Array.from(currentMap.values()));
});

// ─── Yangi narxlar to'plami qo'shish (bir vaqtda barcha stagelar uchun) ───
const batchCreateSchema = z.object({
  effectiveFrom: z.string().transform((s) => new Date(s)),
  note: z.string().optional(),
  prices: z.array(z.object({
    stageName: z.string(),
    price: z.number().nonnegative(),
  })),
});

router.post('/configs/batch', requireAuth('ADMIN'), async (req, res) => {
  const parsed = batchCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { effectiveFrom, note, prices } = parsed.data;

  const result = await prisma.$transaction(
    prices.map((item) =>
      prisma.kpiConfig.create({
        data: {
          stageName: item.stageName,
          price: item.price,
          effectiveFrom,
          note: note || null,
        },
      })
    )
  );
  res.json(result);
});

// ─── Eski PUT endpoint (backward compat - joriy narxlarni yangilash) ───
const updateSchema = z.object({
  stageName: z.string(),
  price: z.number().nonnegative(),
});

router.put('/configs', requireAuth('ADMIN'), async (req, res) => {
  const parsed = updateSchema.array().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await prisma.$transaction(
    parsed.data.map((item) =>
      prisma.kpiConfig.create({
        data: {
          stageName: item.stageName,
          price: item.price,
          effectiveFrom: new Date(),
        },
      })
    )
  );
  res.json(result);
});

// ─── Yozuvni yangilash ───
router.put('/configs/:id', requireAuth('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Noto'g'ri ID" });

  const schema = z.object({
    price: z.number().nonnegative().optional(),
    note: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await prisma.kpiConfig.update({
    where: { id },
    data: parsed.data,
  });
  res.json(updated);
});

// ─── Yozuvni o'chirish ───
router.delete('/configs/:id', requireAuth('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Noto'g'ri ID" });

  await prisma.kpiConfig.delete({ where: { id } });
  res.json({ success: true });
});

// ─── KPI Logs ───
router.get('/logs', requireAuth('ADMIN'), async (_req, res) => {
  const logs = await prisma.kpiLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(logs);
});

// ─── Worker Performance Stats ───
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
