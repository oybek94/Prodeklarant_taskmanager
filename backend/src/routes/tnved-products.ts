import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

/** Barcha foydalanuvchilar o'qishi mumkin (invoyda mahsulot tanlash uchun) */
router.get('/', requireAuth(), async (_req, res) => {
  try {
    const list = await prisma.tnvedProduct.findMany({
      orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
    });
    res.json(list.map((p) => ({
      id: String(p.id),
      name: p.name,
      code: p.code || '',
      botanicalName: p.botanicalName || undefined,
    })));
  } catch (err: any) {
    console.error('[tnved-products] GET error:', err?.message || err);
    res.json([]);
  }
});

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  botanicalName: z.string().optional(),
});

/** Sozlamalar: faqat ADMIN qo'shishi/o'zgartirishi/o'chirishi mumkin */
router.post('/', requireAuth('ADMIN', 'DEKLARANT'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const count = await prisma.tnvedProduct.count();
  const created = await prisma.tnvedProduct.create({
    data: {
      name: parsed.data.name.trim(),
      code: (parsed.data.code ?? '').trim(),
      botanicalName: parsed.data.botanicalName?.trim() || null,
      orderIndex: count,
    },
  });
  res.json({
    id: String(created.id),
    name: created.name,
    code: created.code,
    botanicalName: created.botanicalName || undefined,
  });
});

router.put('/:id', requireAuth('ADMIN', 'DEKLARANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    
    const parsed = z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      botanicalName: z.string().optional().nullable(),
    }).safeParse(req.body);
    
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existingProduct = await prisma.tnvedProduct.findUnique({ where: { id } });
    if (!existingProduct) return res.status(404).json({ error: 'Topilmadi' });

    const newName = parsed.data.name.trim();
    const newCode = (parsed.data.code ?? '').trim();
    const newBotanicalName = parsed.data.botanicalName?.trim() || null;

    const updated = await prisma.tnvedProduct.update({
      where: { id },
      data: {
        name: newName,
        code: newCode,
        botanicalName: newBotanicalName,
      },
    });

    res.json({
      id: String(updated.id),
      name: updated.name,
      code: updated.code,
      botanicalName: updated.botanicalName || undefined,
    });
  } catch (error: any) {
    console.error('Error updating tnved product:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

router.delete('/:id', requireAuth('ADMIN', 'DEKLARANT'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  await prisma.tnvedProduct.delete({ where: { id } });
  res.json({ success: true });
});

export default router;
