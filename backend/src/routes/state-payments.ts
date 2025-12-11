import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const createStatePaymentSchema = z.object({
  branchId: z.number(),
  certificatePayment: z.number().min(0),
  psrPrice: z.number().min(0),
  workerPrice: z.number().min(0),
  customsPayment: z.number().min(0),
});


// GET /state-payments - Barcha davlat to'lovlarini olish (faqat ADMIN)
router.get('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { branchId } = req.query;
    const where: any = {};
    
    if (branchId) where.branchId = Number(branchId);

    const statePayments = await prisma.statePayment.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert Decimal values to numbers
    const formattedPayments = statePayments.map((payment) => ({
      ...payment,
      certificatePayment: Number(payment.certificatePayment),
      psrPrice: Number(payment.psrPrice),
      workerPrice: Number(payment.workerPrice),
      customsPayment: Number(payment.customsPayment),
    }));

    res.json(formattedPayments);
  } catch (error: any) {
    console.error('Error fetching state payments:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /state-payments/branch/:branchId - Filial bo'yicha barcha davlat to'lovlarini olish
router.get('/branch/:branchId', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const statePayments = await prisma.statePayment.findMany({
      where: { branchId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert Decimal values to numbers
    const formattedPayments = statePayments.map((payment) => ({
      ...payment,
      certificatePayment: Number(payment.certificatePayment),
      psrPrice: Number(payment.psrPrice),
      workerPrice: Number(payment.workerPrice),
      customsPayment: Number(payment.customsPayment),
    }));

    res.json(formattedPayments);
  } catch (error: any) {
    console.error('Error fetching state payments by branch:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /state-payments/:id - Bitta davlat to'lovini olish (faqat ADMIN)
router.get('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const statePayment = await prisma.statePayment.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!statePayment) {
      return res.status(404).json({ error: 'Davlat to\'lovi topilmadi' });
    }

    // Convert Decimal values to numbers
    res.json({
      ...statePayment,
      certificatePayment: Number(statePayment.certificatePayment),
      psrPrice: Number(statePayment.psrPrice),
      workerPrice: Number(statePayment.workerPrice),
      customsPayment: Number(statePayment.customsPayment),
    });
  } catch (error: any) {
    console.error('Error fetching state payment:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /state-payments - Yangi davlat to'lovi qo'shish (faqat ADMIN)
router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = createStatePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { branchId, certificatePayment, psrPrice, workerPrice, customsPayment } = parsed.data;

    // Branch mavjudligini tekshirish
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return res.status(404).json({ error: 'Filial topilmadi' });
    }

    // Yangi davlat to'lovini yaratish (har doim yangi yozuv)
    const statePayment = await prisma.statePayment.create({
      data: {
        branchId,
        certificatePayment,
        psrPrice,
        workerPrice,
        customsPayment,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Convert Decimal values to numbers
    res.status(201).json({
      ...statePayment,
      certificatePayment: Number(statePayment.certificatePayment),
      psrPrice: Number(statePayment.psrPrice),
      workerPrice: Number(statePayment.workerPrice),
      customsPayment: Number(statePayment.customsPayment),
    });
  } catch (error: any) {
    console.error('Error creating state payment:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});


// DELETE /state-payments/:id - Davlat to'lovini o'chirish (faqat ADMIN)
router.delete('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.statePayment.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Davlat to\'lovi topilmadi' });
    }

    await prisma.statePayment.delete({
      where: { id },
    });

    res.json({ message: 'Davlat to\'lovi muvaffaqiyatli o\'chirildi' });
  } catch (error: any) {
    console.error('Error deleting state payment:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;
