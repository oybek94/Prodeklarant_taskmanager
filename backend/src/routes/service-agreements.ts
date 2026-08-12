import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { nextAgreementNumber } from './service-agreements.helpers';
import {
  agreementCreateSchema,
  agreementUpdateSchema,
  terminateSchema,
  AgreementCreateInput,
} from './service-agreements.schema';

const router = Router();

/** Ro'yxat: bitta `q` maydoni korxona nomi, INN va shartnoma raqami bo'ylab qidiradi */
router.get('/', requireAuth(), async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    // Mijoz kartochkasi aynan shu mijozning shartnomalarini so'raydi
    const clientId = Number(req.query.clientId) || 0;

    const where = {
      ...(clientId > 0 ? { clientId } : {}),
      ...(status && ['DRAFT', 'ACTIVE', 'TERMINATED'].includes(status)
        ? { status: status as 'DRAFT' | 'ACTIVE' | 'TERMINATED' }
        : {}),
      ...(q
        ? {
            OR: [
              { customerName: { contains: q, mode: 'insensitive' as const } },
              { customerInn: { contains: q, mode: 'insensitive' as const } },
              { agreementNumber: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.serviceAgreement.findMany({
        where,
        orderBy: [{ agreementDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.serviceAgreement.count({ where }),
    ]);

    res.json({ items, total, page, limit });
  } catch (error: unknown) {
    console.error('[service-agreements] GET error:', error);
    res.status(500).json({ error: 'Shartnomalarni olishda xatolik' });
  }
});

/** Keyingi bo'sh shartnoma raqami */
router.get('/next-number', requireAuth(), async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const rows = await prisma.serviceAgreement.findMany({
    where: { agreementNumber: { startsWith: `${year}/` } },
    select: { agreementNumber: true },
  });
  res.json({ agreementNumber: nextAgreementNumber(year, rows.map((r) => r.agreementNumber)) });
});

router.get('/:id', requireAuth(), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const item = await prisma.serviceAgreement.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Shartnoma topilmadi' });
  res.json(item);
});

// Zod chiqarishida `agreementDate` matn (string), Prisma esa `Date` kutadi.
// Qolgan maydonlar Zod tipini saqlab qoladi — shu sababli Prisma create
// chaqiruvida `as never` kerak bo'lmaydi (u strukturaviy nomuvofiqliklarni
// butunlay yashirib qo'yardi).
type PrismaCreateData = Omit<AgreementCreateInput, 'agreementDate'> & { agreementDate: Date };

/** Zod natijasini Prisma `data` ga o'giradi (sana matndan Date ga) */
function toPrismaData(input: AgreementCreateInput): PrismaCreateData {
  const { agreementDate, ...rest } = input;
  return { ...rest, agreementDate: new Date(agreementDate) };
}

router.post('/', requireAuth(), async (req: AuthRequest, res) => {
  const parsed = agreementCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const created = await prisma.serviceAgreement.create({
      data: {
        ...toPrismaData(parsed.data),
        createdById: req.user?.id ?? null,
        updatedById: req.user?.id ?? null,
      },
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') {
      return res.status(409).json({ error: 'Bu shartnoma raqami allaqachon band' });
    }
    console.error('[service-agreements] POST error:', error);
    res.status(500).json({ error: 'Shartnoma yaratishda xatolik' });
  }
});

/**
 * PATCH uchun: `agreementDate` kelgan bo'lsa Date'ga o'giradi, kelmagan bo'lsa
 * maydonni umuman qo'shmaydi — qolgan barcha maydonlar Zod tipida o'zgarishsiz
 * o'tadi (agreementUpdateSchema qisman/partial bo'lgani uchun generik ishlatiladi).
 */
function toPrismaUpdateData<T extends { agreementDate?: string }>(
  input: T,
): Omit<T, 'agreementDate'> & { agreementDate?: Date } {
  const { agreementDate, ...rest } = input;
  return agreementDate !== undefined ? { ...rest, agreementDate: new Date(agreementDate) } : rest;
}

router.patch('/:id', requireAuth(), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = agreementUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const updated = await prisma.serviceAgreement.update({
      where: { id },
      data: {
        ...toPrismaUpdateData(parsed.data),
        updatedById: req.user?.id ?? null,
      },
    });
    res.json(updated);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') {
      return res.status(409).json({ error: 'Bu shartnoma raqami allaqachon band' });
    }
    console.error('[service-agreements] PATCH error:', error);
    res.status(500).json({ error: 'Shartnomani yangilashda xatolik' });
  }
});

router.post('/:id/terminate', requireAuth(), async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = terminateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updated = await prisma.serviceAgreement.update({
    where: { id },
    data: {
      status: 'TERMINATED',
      terminatedAt: new Date(),
      terminationReason: parsed.data.terminationReason,
      updatedById: req.user?.id ?? null,
    },
  });
  res.json(updated);
});

/**
 * Shartnomani bazadan butunlay o'chiradi — xato kiritilgan yozuvni tozalash
 * uchun. Amal QAYTARILMAYDI, shuning uchun frontend tasdiqlash so'raydi.
 * Haqiqatda tuzilgan shartnomani tugatish uchun `POST /:id/terminate` bor.
 */
router.delete('/:id', requireAuth(), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    await prisma.serviceAgreement.delete({ where: { id } });
    res.status(204).end();
  } catch (error: unknown) {
    // P2025 — o'chiriladigan yozuv topilmadi
    if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Shartnoma topilmadi' });
    }
    console.error('[service-agreements] DELETE error:', error);
    res.status(500).json({ error: 'Shartnomani o\'chirishda xatolik' });
  }
});

export default router;
