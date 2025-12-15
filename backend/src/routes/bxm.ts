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
        },
      });
    }

    res.json(bxm);
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
    res.json(bxmConfigs);
  } catch (error: any) {
    console.error('Error fetching BXM configs:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// Update BXM for a year
const updateBXMSchema = z.object({
  amount: z.number().min(0),
  year: z.number().int().min(2000).max(2100),
});

router.put('/:year', requireAuth('ADMIN'), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const parsed = updateBXMSchema.safeParse({ ...req.body, year });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const bxm = await prisma.bXMConfig.upsert({
      where: { year },
      update: { amount: parsed.data.amount },
      create: {
        year: parsed.data.year,
        amount: parsed.data.amount,
      },
    });

    res.json(bxm);
  } catch (error: any) {
    console.error('Error updating BXM:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;

