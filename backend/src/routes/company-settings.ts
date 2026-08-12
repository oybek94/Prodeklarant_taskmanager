import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const companySettingsSchema = z.object({
  name: z.string().min(1),
  legalAddress: z.string().min(1),
  actualAddress: z.string().min(1),
  inn: z.string().optional(),
  director: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  bankName: z.string().optional(),
  bankAddress: z.string().optional(),
  bankAccount: z.string().optional(),
  mfo: z.string().optional(),
  swiftCode: z.string().optional(),
  correspondentBank: z.string().optional(),
  correspondentBankAddress: z.string().optional(),
  correspondentBankSwift: z.string().optional(),
});

// GET /company-settings - Kompaniya sozlamalarini olish
router.get('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const settings = await prisma.companySettings.findFirst();
    
    if (!settings) {
      return res.json(null);
    }

    res.json(settings);
  } catch (error: any) {
    console.error('Error fetching company settings:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

/**
 * GET /company-settings/requisites — shartnomadagi «БАЖАРУВЧИ» ustuni uchun.
 *
 * `GET /` faqat ADMIN uchun ochiq, shartnomani esa har qanday xodim tuzadi:
 * o'sha yerdan so'ralganda 403 qaytardi va Bajaruvchi rekvizitlari bo'sh
 * qolardi. Shu sababli faqat hujjatga tushadigan maydonlar alohida beriladi —
 * bank-korrespondent va SWIFT kabi qolgan sozlamalar bu yerga chiqmaydi.
 */
router.get('/requisites', requireAuth(), async (_req: AuthRequest, res) => {
  try {
    const settings = await prisma.companySettings.findFirst({
      select: {
        name: true,
        inn: true,
        director: true,
        legalAddress: true,
        bankName: true,
        bankAccount: true,
        mfo: true,
        phone: true,
        email: true,
      },
    });

    res.json(settings ?? null);
  } catch (error: any) {
    console.error('Error fetching company requisites:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /company-settings - Kompaniya sozlamalarini yaratish/yangilash
router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = companySettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Mavjud sozlamalarni tekshirish
    const existing = await prisma.companySettings.findFirst();

    let settings;
    if (existing) {
      // Yangilash
      settings = await prisma.companySettings.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          legalAddress: data.legalAddress,
          actualAddress: data.actualAddress,
          inn: data.inn || undefined,
          director: data.director || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          bankName: data.bankName || undefined,
          bankAddress: data.bankAddress || undefined,
          bankAccount: data.bankAccount || undefined,
          mfo: data.mfo || undefined,
          swiftCode: data.swiftCode || undefined,
          correspondentBank: data.correspondentBank || undefined,
          correspondentBankAddress: data.correspondentBankAddress || undefined,
          correspondentBankSwift: data.correspondentBankSwift || undefined,
        }
      });
    } else {
      // Yaratish
      settings = await prisma.companySettings.create({
        data: {
          name: data.name,
          legalAddress: data.legalAddress,
          actualAddress: data.actualAddress,
          inn: data.inn || undefined,
          director: data.director || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          bankName: data.bankName || undefined,
          bankAddress: data.bankAddress || undefined,
          bankAccount: data.bankAccount || undefined,
          mfo: data.mfo || undefined,
          swiftCode: data.swiftCode || undefined,
          correspondentBank: data.correspondentBank || undefined,
          correspondentBankAddress: data.correspondentBankAddress || undefined,
          correspondentBankSwift: data.correspondentBankSwift || undefined,
        }
      });
    }

    res.json(settings);
  } catch (error: any) {
    console.error('Error saving company settings:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;

