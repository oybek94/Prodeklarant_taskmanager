import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();

const createStatePaymentSchema = z.object({
  certificatePaymentUsd: z.number().min(0).optional().default(0),
  certificatePaymentUzs: z.number().min(0).optional().default(0),
  psrPriceUsd: z.number().min(0).optional().default(0),
  psrPriceUzs: z.number().min(0).optional().default(0),
  workerPriceUsd: z.number().min(0).optional().default(0),
  workerPriceUzs: z.number().min(0).optional().default(0),
  customsPaymentUsd: z.number().min(0).optional().default(0),
  customsPaymentUzs: z.number().min(0).optional().default(0),
  st1Payment: z.number().min(0),
  fitoPayment: z.number().min(0),
  fumigationPayment: z.number().min(0),
  internalCertPayment: z.number().min(0),
});

const formatPayment = (payment: any) => ({
  ...payment,
  certificatePayment: Number(payment.certificatePayment),
  psrPrice: Number(payment.psrPrice),
  workerPrice: Number(payment.workerPrice),
  customsPayment: Number(payment.customsPayment),
  st1Payment: Number(payment.st1Payment),
  fitoPayment: Number(payment.fitoPayment),
  fumigationPayment: Number(payment.fumigationPayment),
  internalCertPayment: Number(payment.internalCertPayment),
  certificatePaymentUsd: Number(payment.certificatePayment_amount_original ?? payment.certificatePayment),
  certificatePaymentUzs: Number(payment.certificatePayment_amount_uzs ?? payment.certificatePayment),
  psrPriceUsd: Number(payment.psrPrice_amount_original ?? payment.psrPrice),
  psrPriceUzs: Number(payment.psrPrice_amount_uzs ?? payment.psrPrice),
  workerPriceUsd: Number(payment.workerPrice_amount_original ?? payment.workerPrice),
  workerPriceUzs: Number(payment.workerPrice_amount_uzs ?? payment.workerPrice),
  customsPaymentUsd: Number(payment.customsPayment_amount_original ?? payment.customsPayment),
  customsPaymentUzs: Number(payment.customsPayment_amount_uzs ?? payment.customsPayment),
});

// GET /state-payments - Barcha davlat to'lovlarini olish (faqat ADMIN)
router.get('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const statePayments = await prisma.statePayment.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(statePayments.map(formatPayment));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /state-payments/current - Eng ohirgi davlat to'lovini olish
router.get('/current', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const statePayment = await prisma.statePayment.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!statePayment) return res.json(null);
    res.json(formatPayment(statePayment));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /state-payments/:id
router.get('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const statePayment = await prisma.statePayment.findUnique({ where: { id } });
    if (!statePayment) return res.status(404).json({ error: 'Topilmadi' });
    res.json(formatPayment(statePayment));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /state-payments
router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = createStatePaymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const data = parsed.data;
    const finalCurrency: Currency = 'UZS';

    const statePayment = await prisma.statePayment.create({
      data: {
        certificatePayment: new Decimal(data.certificatePaymentUzs),
        psrPrice: new Decimal(data.psrPriceUzs),
        workerPrice: new Decimal(data.workerPriceUzs),
        customsPayment: new Decimal(data.customsPaymentUzs),
        st1Payment: new Decimal(data.st1Payment),
        fitoPayment: new Decimal(data.fitoPayment),
        fumigationPayment: new Decimal(data.fumigationPayment),
        internalCertPayment: new Decimal(data.internalCertPayment),

        certificatePayment_amount_original: new Decimal(data.certificatePaymentUsd),
        certificatePayment_amount_uzs: new Decimal(data.certificatePaymentUzs),
        psrPrice_amount_original: new Decimal(data.psrPriceUsd),
        psrPrice_amount_uzs: new Decimal(data.psrPriceUzs),
        workerPrice_amount_original: new Decimal(data.workerPriceUsd),
        workerPrice_amount_uzs: new Decimal(data.workerPriceUzs),
        customsPayment_amount_original: new Decimal(data.customsPaymentUsd),
        customsPayment_amount_uzs: new Decimal(data.customsPaymentUzs),
        currency: finalCurrency,
      },
    });

    res.status(201).json(formatPayment(statePayment));
  } catch (error: any) {
    console.error('Error creating state payment:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// DELETE /state-payments/:id
router.delete('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.statePayment.delete({ where: { id } });
    res.json({ message: 'O\'chirildi' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;
