import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

/** Barcha foydalanuvchilar o‘qishi mumkin (invoyda qadoq turi kodini tanlash, FSS backendda shu ro‘yxatdan foydalanadi) */
router.get('/', requireAuth(), async (_req, res) => {
  try {
    const list = await prisma.packagingType.findMany({
      orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
    });
    res.json(list.map(toDto));
  } catch (err: any) {
    // Jadval mavjud emas bo‘lsa (migration ishlamagan) bo‘sh ro‘yxat qaytaramiz, 500 emas
    console.error('[packaging-types] GET error:', err?.message || err);
    res.json([]);
  }
});

/** Prisma Decimal -> number, invoys tekshiruvi raqam bilan ishlaydi */
function toDto(p: { id: number; name: string; code: string | null; tareMin: unknown; tareMax: unknown }) {
  return {
    id: String(p.id),
    name: p.name,
    code: p.code || '',
    tareMin: p.tareMin != null ? Number(p.tareMin) : null,
    tareMax: p.tareMax != null ? Number(p.tareMax) : null,
  };
}

// Tara oralig'i ixtiyoriy — belgilanmasa bu tur uchun tekshiruv bo'lmaydi
const tareField = z.number().nonnegative().nullable().optional();
const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  tareMin: tareField,
  tareMax: tareField,
});

/** min > max bo'lsa tekshiruv hech qachon o'tmaydi — buni oldindan rad etamiz */
function tareRangeError(tareMin?: number | null, tareMax?: number | null): string | null {
  if (tareMin != null && tareMax != null && tareMin > tareMax) {
    return 'Tara min qiymati max qiymatidan katta bo‘lishi mumkin emas';
  }
  return null;
}

/** Sozlamalar: faqat ADMIN qo‘shishi/o‘zgartirishi/o‘chirishi mumkin */
router.post('/', requireAuth(), async (req: AuthRequest, res) => {
  if (req.user?.role === 'SELLER') {
    return res.status(403).json({ error: 'Sizga ruxsat berilmagan' });
  }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const rangeError = tareRangeError(parsed.data.tareMin, parsed.data.tareMax);
  if (rangeError) return res.status(400).json({ error: rangeError });
  const count = await prisma.packagingType.count();
  const created = await prisma.packagingType.create({
    data: {
      name: parsed.data.name.trim(),
      code: (parsed.data.code ?? '').trim(),
      orderIndex: count,
      tareMin: parsed.data.tareMin ?? null,
      tareMax: parsed.data.tareMax ?? null,
    },
  });
  res.json(toDto(created));
});

router.put('/:id', requireAuth(), async (req: AuthRequest, res) => {
  if (req.user?.role === 'SELLER') {
    return res.status(403).json({ error: 'Sizga ruxsat berilmagan' });
  }
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const rangeError = tareRangeError(parsed.data.tareMin, parsed.data.tareMax);
  if (rangeError) return res.status(400).json({ error: rangeError });
  const updated = await prisma.packagingType.update({
    where: { id },
    data: {
      name: parsed.data.name.trim(),
      code: (parsed.data.code ?? '').trim(),
      tareMin: parsed.data.tareMin ?? null,
      tareMax: parsed.data.tareMax ?? null,
    },
  });
  res.json(toDto(updated));
});

router.delete('/:id', requireAuth(), async (req: AuthRequest, res) => {
  if (req.user?.role === 'SELLER') {
    return res.status(403).json({ error: 'Sizga ruxsat berilmagan' });
  }
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  await prisma.packagingType.delete({ where: { id } });
  res.json({ success: true });
});

export default router;
