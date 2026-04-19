import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Zod schema
const certifierFeeSchema = z.object({
  branchId: z.coerce.number().int().positive(),
  st1Rate: z.coerce.number().min(0),
  fitoRate: z.coerce.number().min(0),
  aktRate: z.coerce.number().min(0),
  hiredWorkerRate: z.coerce.number().min(0).default(0),
});

// GET /certifier-fee-config - Barcha filiallar uchun eng oxirgi tariflarni olish
router.get('/', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  try {
    const certifierModel = (prisma as any).certifierFeeConfig;
    if (!certifierModel) {
      return res.json([]);
    }

    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });

    const configs = await Promise.all(
      branches.map(async (branch) => {
        let config = await certifierModel.findFirst({
          where: { branchId: branch.id },
          orderBy: { createdAt: 'desc' },
        });

        if (!config) {
          config = {
            id: -branch.id, // placeholder id
            branchId: branch.id,
            st1Rate: 0,
            fitoRate: 0,
            aktRate: 0,
            hiredWorkerRate: 0,
            createdAt: new Date(),
          };
        }

        return {
          ...config,
          branch,
          st1Rate: Number(config.st1Rate),
          fitoRate: Number(config.fitoRate),
          aktRate: Number(config.aktRate),
          hiredWorkerRate: Number(config.hiredWorkerRate || 0),
        };
      })
    );

    res.json(configs);
  } catch (error: any) {
    console.error('Error fetching certifier fee config:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /certifier-fee-config - Filial uchun tarif kiritish
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
      data: {
        branchId: data.branchId,
        st1Rate: data.st1Rate,
        fitoRate: data.fitoRate,
        aktRate: data.aktRate,
        hiredWorkerRate: data.hiredWorkerRate,
      },
      include: { branch: true },
    });

    res.json({
      ...config,
      st1Rate: Number(config.st1Rate),
      fitoRate: Number(config.fitoRate),
      aktRate: Number(config.aktRate),
      hiredWorkerRate: Number(config.hiredWorkerRate || 0),
    });
  } catch (error: any) {
    console.error('Error saving certifier fee config:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// DELETE /certifier-fee-config/:id - Tarifni o'chirish
router.delete('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const certifierModel = (prisma as any).certifierFeeConfig;
    if (!certifierModel) {
      return res.status(500).json({ error: 'Certifier fee config is not available' });
    }

    if (id < 0) {
      return res.status(400).json({ error: 'Bu filialda hali tarif yo\'q' });
    }

    await certifierModel.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting certifier fee config:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;
