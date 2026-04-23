import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Zod schemas for validation
const recommendedPriceSchema = z.object({
  productName: z.string().min(1, 'Mahsulot nomi majburiy'),
  tnvedCode: z.string().optional().nullable(),
  priceUsd: z.number().min(0, 'Narx 0 dan katta bo\'lishi kerak'),
});

// GET /api/recommended-prices - Barcha narxlarni olish
router.get('/', requireAuth(), async (req, res) => {
  try {
    const prices = await prisma.recommendedPrice.findMany({
      orderBy: { productName: 'asc' },
    });
    res.json(prices);
  } catch (error: any) {
    console.error('Error fetching recommended prices:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// POST /api/recommended-prices - Yangi narx qo'shish
router.post('/', requireAuth(), async (req, res) => {
  try {
    const data = recommendedPriceSchema.parse(req.body);
    
    // Check if product already exists
    const existing = await prisma.recommendedPrice.findUnique({
      where: { productName: data.productName },
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Bu mahsulot uchun narx allaqachon mavjud' });
    }

    const newPrice = await prisma.recommendedPrice.create({
      data: {
        productName: data.productName,
        tnvedCode: data.tnvedCode,
        priceUsd: data.priceUsd,
      },
    });

    res.status(201).json(newPrice);
  } catch (error: any) {
    console.error('Error creating recommended price:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors[0].message });
    } else {
      res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
    }
  }
});

// PUT /api/recommended-prices/:id - Narxni yangilash
router.put('/:id', requireAuth(), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Noto\'g\'ri ID' });
    }

    const data = recommendedPriceSchema.parse(req.body);

    // Check if product name changes to an existing one
    const existingWord = await prisma.recommendedPrice.findUnique({
      where: { productName: data.productName },
    });
    
    if (existingWord && existingWord.id !== id) {
      return res.status(400).json({ error: 'Bu nomdagi mahsulot allaqachon mavjud' });
    }

    const updatedPrice = await prisma.recommendedPrice.update({
      where: { id },
      data: {
        productName: data.productName,
        tnvedCode: data.tnvedCode,
        priceUsd: data.priceUsd,
      },
    });

    res.json(updatedPrice);
  } catch (error: any) {
    console.error('Error updating recommended price:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: (error as any).errors[0].message });
    } else {
      res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
    }
  }
});

// DELETE /api/recommended-prices/:id - Narxni o'chirish
router.delete('/:id', requireAuth(), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Noto\'g\'ri ID' });
    }

    await prisma.recommendedPrice.delete({
      where: { id },
    });

    res.json({ message: 'Muvaffaqiyatli o\'chirildi' });
  } catch (error: any) {
    console.error('Error deleting recommended price:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// POST /api/recommended-prices/sync-from-specs - Barcha shartnomalardan spetsifikatsiyalarni yig'ib bazaga qo'shish
router.post('/sync-from-specs', requireAuth(), async (req, res) => {
  try {
    // 1. Shartnomalardagi spetsifikatsiyalarni o'qish (faqat array bo'lganlarini)
    const contracts = await prisma.contract.findMany({
      where: {
        specification: {
          not: Prisma.AnyNull
        }
      },
      select: { specification: true }
    });

    const productsMap = new Map<string, string | null>(); // productName -> tnvedCode

    // Extract products
    contracts.forEach(contract => {
      if (Array.isArray(contract.specification)) {
        contract.specification.forEach((item: any) => {
          if (item?.name && typeof item.name === 'string') {
            const trimmedName = item.name.trim();
            if (trimmedName) {
              const tnved = item.tnvedCode && typeof item.tnvedCode === 'string' ? item.tnvedCode.trim() : null;
              // Only save the first encountered tnvedCode for a product, or overwrite null with valid
              if (!productsMap.has(trimmedName) || (tnved && !productsMap.get(trimmedName))) {
                productsMap.set(trimmedName, tnved);
              }
            }
          }
        });
      }
    });

    // 2. Mavjudlarini olish
    const existingPrices = await prisma.recommendedPrice.findMany({
      select: { productName: true }
    });
    const existingSet = new Set(existingPrices.map(p => p.productName));

    // 3. Yangilarini ajratish
    const newProducts: any[] = [];
    for (const [name, tnvedCode] of productsMap.entries()) {
      if (!existingSet.has(name)) {
        newProducts.push({
          productName: name,
          tnvedCode,
          priceUsd: 0, // default price
        });
      }
    }

    // 4. Bazaga yozish
    if (newProducts.length > 0) {
      await prisma.recommendedPrice.createMany({
        data: newProducts,
        skipDuplicates: true,
      });
    }

    res.json({ 
      message: 'Sinxronizatsiya muvaffaqiyatli yakunlandi',
      addedCount: newProducts.length 
    });
  } catch (error: any) {
    console.error('Error syncing recommended prices from specs:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

import { Prisma } from '@prisma/client';

export default router;
