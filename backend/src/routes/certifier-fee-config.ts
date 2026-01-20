import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const DEFAULT_FEES = {
  st1Rate: 95000,
  fitoRate: 80000,
  aktRate: 25000,
};

const certifierFeeSchema = z.object({
  st1Rate: z.coerce.number().min(0),
  fitoRate: z.coerce.number().min(0),
  aktRate: z.coerce.number().min(0),
});

// GET /certifier-fee-config - Sertifikatchi tariflarini olish
router.get('/', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  try {
    const certifierModel = (prisma as any).certifierFeeConfig;
    if (!certifierModel) {
      return res.json(DEFAULT_FEES);
    }

    let config = await certifierModel.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!config) {
      config = await certifierModel.create({
        data: DEFAULT_FEES,
      });
    }

    res.json({
      ...config,
      st1Rate: Number(config.st1Rate),
      fitoRate: Number(config.fitoRate),
      aktRate: Number(config.aktRate),
    });
  } catch (error: any) {
    console.error('Error fetching certifier fee config:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /certifier-fee-config - Sertifikatchi tariflarini yaratish/yangilash
router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = certifierFeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const data = parsed.data;
    const certifierModel = (prisma as any).certifierFeeConfig;
    if (!certifierModel) {
      return res.status(500).json({ error: 'Certifier fee config is not available. Run migrations and regenerate Prisma client.' });
    }

    const config = await certifierModel.create({
      data,
    });

    res.json({
      ...config,
      st1Rate: Number(config.st1Rate),
      fitoRate: Number(config.fitoRate),
      aktRate: Number(config.aktRate),
    });
  } catch (error: any) {
    console.error('Error saving certifier fee config:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;
