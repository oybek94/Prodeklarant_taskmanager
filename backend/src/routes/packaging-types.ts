import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

/** Barcha foydalanuvchilar o‘qishi mumkin (invoyda qadoq turi kodini tanlash, FSS backendda shu ro‘yxatdan foydalanadi) */
router.get('/', requireAuth(), async (_req, res) => {
  const list = await prisma.packagingType.findMany({
    orderBy: { orderIndex: 'asc', id: 'asc' },
  });
  res.json(list.map((p) => ({ id: String(p.id), name: p.name, code: p.code || '' })));
});

const createSchema = z.object({ name: z.string().min(1), code: z.string().optional() });

/** Sozlamalar: faqat ADMIN qo‘shishi/o‘zgartirishi/o‘chirishi mumkin */
router.post('/', requireAuth('ADMIN'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const count = await prisma.packagingType.count();
  const created = await prisma.packagingType.create({
    data: {
      name: parsed.data.name.trim(),
      code: (parsed.data.code ?? '').trim(),
      orderIndex: count,
    },
  });
  res.json({ id: String(created.id), name: created.name, code: created.code });
});

router.put('/:id', requireAuth('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = z.object({ name: z.string().min(1), code: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updated = await prisma.packagingType.update({
    where: { id },
    data: { name: parsed.data.name.trim(), code: (parsed.data.code ?? '').trim() },
  });
  res.json({ id: String(updated.id), name: updated.name, code: updated.code });
});

router.delete('/:id', requireAuth('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  await prisma.packagingType.delete({ where: { id } });
  res.json({ success: true });
});

export default router;
