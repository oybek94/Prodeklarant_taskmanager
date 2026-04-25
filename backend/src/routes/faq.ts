import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const faqSchema = z.object({
  question: z.string().min(1, 'Savolni kiritish majburiy'),
  answer: z.string().min(1, 'Javobni kiritish majburiy'),
  topic: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  imageDescription: z.string().optional().nullable(),
  orderIndex: z.number().optional().default(0),
});

// Barcha FAQ larni olish
router.get('/', requireAuth(), async (req, res) => {
  try {
    const faqs = await prisma.faq.findMany({
      orderBy: { orderIndex: 'asc' },
    });
    res.json(faqs);
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: 'FAQlarni yuklashda xatolik yuz berdi' });
  }
});

// Yangi FAQ qo'shish
router.post('/', requireAuth(), async (req, res) => {
  try {
    const data = faqSchema.parse(req.body);
    const faq = await prisma.faq.create({ data });
    res.status(201).json(faq);
  } catch (error) {
    console.error('Error creating FAQ:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: 'FAQ yaratishda xatolik yuz berdi' });
  }
});

// FAQni yangilash
router.put('/:id', requireAuth(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = faqSchema.parse(req.body);
    const faq = await prisma.faq.update({
      where: { id },
      data,
    });
    res.json(faq);
  } catch (error) {
    console.error('Error updating FAQ:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: 'FAQni yangilashda xatolik yuz berdi' });
  }
});

// FAQni o'chirish
router.delete('/:id', requireAuth(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.faq.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ error: 'FAQni o\'chirishda xatolik yuz berdi' });
  }
});

export default router;
