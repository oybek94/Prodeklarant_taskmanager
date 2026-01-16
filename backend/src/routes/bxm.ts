import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Get current BXM (for current year)
router.get('/current', requireAuth(), async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    let bxm = await prisma.bXMConfig.findUnique({
      where: { year: currentYear },
    });

    // If no BXM for current year, create default
    if (!bxm) {
      bxm = await prisma.bXMConfig.create({
        data: {
          year: currentYear,
          amount: 34.4,
          amountUsd: 34.4,
          amountUzs: 412000,
        },
      });
    }

    const amountUsd = bxm.amountUsd ?? bxm.amount;
    const amountUzs = bxm.amountUzs ?? 412000;

    res.json({
      ...bxm,
      amount: amountUsd,
      amountUsd,
      amountUzs,
    });
  } catch (error: any) {
    console.error('Error fetching BXM:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// Get all BXM configs
router.get('/', requireAuth('ADMIN'), async (req, res) => {
  try {
    const bxmConfigs = await prisma.bXMConfig.findMany({
      orderBy: { year: 'desc' },
    });
    res.json(
      bxmConfigs.map((bxm) => {
        const amountUsd = bxm.amountUsd ?? bxm.amount;
        const amountUzs = bxm.amountUzs ?? 412000;
        return {
          ...bxm,
          amount: amountUsd,
          amountUsd,
          amountUzs,
        };
      })
    );
  } catch (error: any) {
    console.error('Error fetching BXM configs:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// Update BXM for a year
const updateBXMSchema = z.object({
  amount: z.number().min(0).optional(),
  amountUsd: z.number().min(0).optional(),
  amountUzs: z.number().min(0).optional(),
  year: z.number().int().min(2000).max(2100),
}).refine((data) => data.amountUsd != null || data.amountUzs != null || data.amount != null, {
  message: 'amountUsd yoki amountUzs kiritilishi kerak',
});

router.put('/:year', requireAuth('ADMIN'), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const parsed = updateBXMSchema.safeParse({ ...req.body, year });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const amountUsd = parsed.data.amountUsd ?? parsed.data.amount;
    const amountUzs = parsed.data.amountUzs;

    if (amountUsd == null || amountUzs == null) {
      return res.status(400).json({ error: 'amountUsd va amountUzs ikkisi ham kiritilishi kerak' });
    }

    const bxm = await prisma.bXMConfig.upsert({
      where: { year },
      update: { amount: amountUsd, amountUsd, amountUzs },
      create: {
        year: parsed.data.year,
        amount: amountUsd,
        amountUsd,
        amountUzs,
      },
    });

    res.json({
      ...bxm,
      amount: amountUsd,
      amountUsd,
      amountUzs,
    });
  } catch (error: any) {
    console.error('Error updating BXM:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;

