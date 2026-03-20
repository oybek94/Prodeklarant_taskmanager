import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ─── Get current BXM (latest effectiveFrom <= now) ───────────────────
router.get('/current', requireAuth(), async (req, res) => {
  try {
    const bxm = await prisma.bXMConfig.findFirst({
      where: { effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!bxm) {
      // No BXM yet — create default
      const created = await prisma.bXMConfig.create({
        data: {
          amountUsd: 34.4,
          amountUzs: 412000,
          effectiveFrom: new Date(),
          note: 'Boshlang\'ich qiymat',
        },
      });
      return res.json(created);
    }

    res.json(bxm);
  } catch (error: any) {
    console.error('Error fetching current BXM:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Get BXM that was effective at a specific date ───────────────────
router.get('/at-date', requireAuth(), async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'date parametri kerak (ISO format)' });
    }
    const targetDate = new Date(date);

    const bxm = await prisma.bXMConfig.findFirst({
      where: { effectiveFrom: { lte: targetDate } },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!bxm) {
      return res.json({ amountUsd: 34.4, amountUzs: 412000 });
    }

    res.json(bxm);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Get all BXM history (sorted by effectiveFrom desc) ──────────────
router.get('/', requireAuth('ADMIN'), async (req, res) => {
  try {
    const bxmList = await prisma.bXMConfig.findMany({
      orderBy: { effectiveFrom: 'desc' },
    });
    res.json(bxmList);
  } catch (error: any) {
    console.error('Error fetching BXM list:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Create new BXM rate ──────────────────────────────────────────────
const createBXMSchema = z.object({
  amountUsd: z.number().min(0),
  amountUzs: z.number().min(0),
  effectiveFrom: z.string().optional(), // ISO date, default now
  note: z.string().optional(),
});

router.post('/', requireAuth('ADMIN'), async (req, res) => {
  try {
    const parsed = createBXMSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const effectiveFrom = parsed.data.effectiveFrom
      ? new Date(parsed.data.effectiveFrom)
      : new Date();

    const bxm = await prisma.bXMConfig.create({
      data: {
        amountUsd: parsed.data.amountUsd,
        amountUzs: parsed.data.amountUzs,
        effectiveFrom,
        note: parsed.data.note,
      },
    });

    res.status(201).json(bxm);
  } catch (error: any) {
    console.error('Error creating BXM:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Update a BXM record ──────────────────────────────────────────────
router.put('/:id', requireAuth('ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = createBXMSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const effectiveFrom = parsed.data.effectiveFrom
      ? new Date(parsed.data.effectiveFrom)
      : undefined;

    const bxm = await prisma.bXMConfig.update({
      where: { id },
      data: {
        amountUsd: parsed.data.amountUsd,
        amountUzs: parsed.data.amountUzs,
        ...(effectiveFrom ? { effectiveFrom } : {}),
        note: parsed.data.note,
      },
    });

    res.json(bxm);
  } catch (error: any) {
    console.error('Error updating BXM:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Delete a BXM record ──────────────────────────────────────────────
router.delete('/:id', requireAuth('ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Don't allow deleting if it's the only record
    const count = await prisma.bXMConfig.count();
    if (count <= 1) {
      return res.status(400).json({ error: 'Kamida bitta BXM yozuvi bo\'lishi kerak' });
    }
    await prisma.bXMConfig.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting BXM:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Keep backward compatibility: PUT /bxm/:year (deprecated) ────────
router.put('/year/:year', requireAuth('ADMIN'), async (req, res) => {
  res.status(410).json({ error: 'Bu endpoint eskirdi. POST /bxm dan foydalaning.' });
});

export default router;
