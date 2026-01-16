import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { validateStatePayment } from '../services/monetary-validation';

const router = Router();

const createStatePaymentSchema = z.object({
  branchId: z.number(),
  certificatePaymentUsd: z.number().min(0),
  certificatePaymentUzs: z.number().min(0),
  psrPriceUsd: z.number().min(0),
  psrPriceUzs: z.number().min(0),
  workerPriceUsd: z.number().min(0),
  workerPriceUzs: z.number().min(0),
  customsPaymentUsd: z.number().min(0).optional().default(0),
  customsPaymentUzs: z.number().min(0).optional().default(0),
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
    const formattedPayments = statePayments.map((payment: any) => ({
      ...payment,
      certificatePayment: Number(payment.certificatePayment),
      psrPrice: Number(payment.psrPrice),
      workerPrice: Number(payment.workerPrice),
      customsPayment: Number(payment.customsPayment),
      certificatePaymentUsd: Number(payment.certificatePayment_amount_original ?? payment.certificatePayment),
      certificatePaymentUzs: Number(payment.certificatePayment_amount_uzs ?? payment.certificatePayment),
      psrPriceUsd: Number(payment.psrPrice_amount_original ?? payment.psrPrice),
      psrPriceUzs: Number(payment.psrPrice_amount_uzs ?? payment.psrPrice),
      workerPriceUsd: Number(payment.workerPrice_amount_original ?? payment.workerPrice),
      workerPriceUzs: Number(payment.workerPrice_amount_uzs ?? payment.workerPrice),
      customsPaymentUsd: Number(payment.customsPayment_amount_original ?? payment.customsPayment),
      customsPaymentUzs: Number(payment.customsPayment_amount_uzs ?? payment.customsPayment),
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
    const formattedPayments = statePayments.map((payment: any) => ({
      ...payment,
      certificatePayment: Number(payment.certificatePayment),
      psrPrice: Number(payment.psrPrice),
      workerPrice: Number(payment.workerPrice),
      customsPayment: Number(payment.customsPayment),
      certificatePaymentUsd: Number(payment.certificatePayment_amount_original ?? payment.certificatePayment),
      certificatePaymentUzs: Number(payment.certificatePayment_amount_uzs ?? payment.certificatePayment),
      psrPriceUsd: Number(payment.psrPrice_amount_original ?? payment.psrPrice),
      psrPriceUzs: Number(payment.psrPrice_amount_uzs ?? payment.psrPrice),
      workerPriceUsd: Number(payment.workerPrice_amount_original ?? payment.workerPrice),
      workerPriceUzs: Number(payment.workerPrice_amount_uzs ?? payment.workerPrice),
      customsPaymentUsd: Number(payment.customsPayment_amount_original ?? payment.customsPayment),
      customsPaymentUzs: Number(payment.customsPayment_amount_uzs ?? payment.customsPayment),
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
      certificatePaymentUsd: Number(statePayment.certificatePayment_amount_original ?? statePayment.certificatePayment),
      certificatePaymentUzs: Number(statePayment.certificatePayment_amount_uzs ?? statePayment.certificatePayment),
      psrPriceUsd: Number(statePayment.psrPrice_amount_original ?? statePayment.psrPrice),
      psrPriceUzs: Number(statePayment.psrPrice_amount_uzs ?? statePayment.psrPrice),
      workerPriceUsd: Number(statePayment.workerPrice_amount_original ?? statePayment.workerPrice),
      workerPriceUzs: Number(statePayment.workerPrice_amount_uzs ?? statePayment.workerPrice),
      customsPaymentUsd: Number(statePayment.customsPayment_amount_original ?? statePayment.customsPayment),
      customsPaymentUzs: Number(statePayment.customsPayment_amount_uzs ?? statePayment.customsPayment),
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

    const {
      branchId,
      certificatePaymentUsd,
      certificatePaymentUzs,
      psrPriceUsd,
      psrPriceUzs,
      workerPriceUsd,
      workerPriceUzs,
      customsPaymentUsd,
      customsPaymentUzs,
    } = parsed.data;

    // Validate StatePayment
    const validationResult = validateStatePayment({
      currency: 'UZS',
      certificatePayment: certificatePaymentUzs,
      psrPrice: psrPriceUzs,
      workerPrice: workerPriceUzs,
      customsPayment: customsPaymentUzs ?? 0,
    });

    if (!validationResult.isValid) {
      return res.status(400).json({
        error: 'StatePayment validation failed',
        details: validationResult.errors,
      });
    }

    // Keep legacy fields in UZS for backward compatibility
    const finalCurrency: Currency = 'UZS';

    // Convert amounts to Decimal
    const certPaymentUzsDec = new Decimal(certificatePaymentUzs);
    const psrPriceUzsDec = new Decimal(psrPriceUzs);
    const workerPriceUzsDec = new Decimal(workerPriceUzs);
    const customsPaymentUzsDec = new Decimal(customsPaymentUzs ?? 0);

    const certPaymentUsdDec = new Decimal(certificatePaymentUsd);
    const psrPriceUsdDec = new Decimal(psrPriceUsd);
    const workerPriceUsdDec = new Decimal(workerPriceUsd);
    const customsPaymentUsdDec = new Decimal(customsPaymentUsd ?? 0);

    // Branch mavjudligini tekshirish
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return res.status(404).json({ error: 'Filial topilmadi' });
    }

    // Yangi davlat to'lovini yaratish (har doim yangi yozuv)
    const statePayment = await prisma.statePayment.create({
      data: {
        branchId,
        // Keep old fields for backward compatibility
        certificatePayment: certPaymentUzsDec,
        psrPrice: psrPriceUzsDec,
        workerPrice: workerPriceUzsDec,
        customsPayment: customsPaymentUzsDec,
        // Dual currency fields
        certificatePayment_amount_original: certPaymentUsdDec,
        certificatePayment_amount_uzs: certPaymentUzsDec,
        psrPrice_amount_original: psrPriceUsdDec,
        psrPrice_amount_uzs: psrPriceUzsDec,
        workerPrice_amount_original: workerPriceUsdDec,
        workerPrice_amount_uzs: workerPriceUzsDec,
        customsPayment_amount_original: customsPaymentUsdDec,
        customsPayment_amount_uzs: customsPaymentUzsDec,
        currency: finalCurrency,
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
      certificatePaymentUsd: Number(statePayment.certificatePayment_amount_original ?? statePayment.certificatePayment),
      certificatePaymentUzs: Number(statePayment.certificatePayment_amount_uzs ?? statePayment.certificatePayment),
      psrPriceUsd: Number(statePayment.psrPrice_amount_original ?? statePayment.psrPrice),
      psrPriceUzs: Number(statePayment.psrPrice_amount_uzs ?? statePayment.psrPrice),
      workerPriceUsd: Number(statePayment.workerPrice_amount_original ?? statePayment.workerPrice),
      workerPriceUzs: Number(statePayment.workerPrice_amount_uzs ?? statePayment.workerPrice),
      customsPaymentUsd: Number(statePayment.customsPayment_amount_original ?? statePayment.customsPayment),
      customsPaymentUzs: Number(statePayment.customsPayment_amount_uzs ?? statePayment.customsPayment),
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
