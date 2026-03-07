import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const regionCodeSchema = z.object({
  name: z.string().min(1, 'Hudud nomi bo\'sh bo\'lmasligi kerak'),
  internalCode: z.string().min(1, 'Ichki kod bo\'sh bo\'lmasligi kerak'),
  externalCode: z.string().min(1, 'Tashqi kod bo\'sh bo\'lmasligi kerak'),
});

// GET /api/region-codes - Get all region codes
router.get('/', requireAuth(), async (_req, res) => {
  try {
    const regionCodes = await prisma.regionCode.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(regionCodes);
  } catch (error: any) {
    console.error('Error fetching region codes:', error);
    res.status(500).json({ error: 'Hudud kodlarini yuklashda xatolik yuz berdi' });
  }
});

// POST /api/region-codes - Create new region code
router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = regionCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const regionCode = await prisma.regionCode.create({
      data: {
        name: parsed.data.name,
        internalCode: parsed.data.internalCode,
        externalCode: parsed.data.externalCode,
      },
    });
    res.status(201).json(regionCode);
  } catch (error: any) {
    console.error('Error creating region code:', error);
    res.status(500).json({
      error: 'Hudud kodini yaratishda xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// DELETE /api/region-codes/:id - Delete region code
router.delete('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.regionCode.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Hudud kodi topilmadi' });
    }
    await prisma.regionCode.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting region code:', error);
    res.status(500).json({
      error: 'Hudud kodini o\'chirishda xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
