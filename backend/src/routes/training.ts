import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Barcha o'qitish kurslarini olish
router.get('/', requireAuth(), async (req, res) => {
  try {
    const trainings = await prisma.training.findMany({
      where: { active: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        materials: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: {
            materials: true,
            exams: true,
          },
        },
      },
    });

    // Foydalanuvchining progressini qo'shish
    const trainingsWithProgress = await Promise.all(
      trainings.map(async (training) => {
        const progress = await prisma.trainingProgress.findUnique({
          where: {
            userId_trainingId: {
              userId: req.user!.id,
              trainingId: training.id,
            },
          },
        });

        return {
          ...training,
          progress: progress || {
            completed: false,
            progressPercent: 0,
            lastAccessedAt: null,
          },
        };
      })
    );

    res.json(trainingsWithProgress);
  } catch (error) {
    console.error('Error fetching trainings:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Bitta o'qitish kursini olish
router.get('/:id', requireAuth(), async (req, res) => {
  try {
    const trainingId = parseInt(req.params.id);
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: {
        materials: {
          orderBy: { orderIndex: 'asc' },
        },
        exams: {
          where: { active: true },
          include: {
            _count: {
              select: {
                questions: true,
              },
            },
          },
        },
      },
    });

    if (!training) {
      return res.status(404).json({ error: 'O\'qitish topilmadi' });
    }

    // Foydalanuvchining progressini olish
    const progress = await prisma.trainingProgress.findUnique({
      where: {
        userId_trainingId: {
          userId: req.user!.id,
          trainingId: training.id,
        },
      },
    });

    // Imtihon natijalarini olish
    const examAttempts = await prisma.examAttempt.findMany({
      where: {
        userId: req.user!.id,
        examId: { in: training.exams.map((e) => e.id) },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });

    res.json({
      ...training,
      progress: progress || {
        completed: false,
        progressPercent: 0,
        lastAccessedAt: null,
      },
      recentExamAttempts: examAttempts,
    });
  } catch (error) {
    console.error('Error fetching training:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Material o'qilganini belgilash
router.post('/:id/materials/:materialId/complete', requireAuth(), async (req, res) => {
  try {
    const trainingId = parseInt(req.params.id);
    const materialId = parseInt(req.params.materialId);

    // Joriy materialni olish
    const currentMaterial = await prisma.trainingMaterial.findUnique({
      where: { id: materialId },
    });

    if (!currentMaterial || currentMaterial.trainingId !== trainingId) {
      return res.status(404).json({ error: 'Material topilmadi' });
    }

    // Oldingi materiallar o'qilganligini tekshirish
    const previousMaterials = await prisma.trainingMaterial.findMany({
      where: {
        trainingId: trainingId,
        orderIndex: { lt: currentMaterial.orderIndex },
      },
      orderBy: { orderIndex: 'asc' },
    });

    if (previousMaterials.length > 0) {
      // Progress yozuvini olish
      const existingProgress = await prisma.trainingProgress.findUnique({
        where: {
          userId_trainingId: {
            userId: req.user!.id,
            trainingId: trainingId,
          },
        },
      });

      // Oldingi materiallar o'qilganligini tekshirish
      const lastCompletedMaterialId = existingProgress?.materialId;
      const lastCompletedMaterial = lastCompletedMaterialId
        ? await prisma.trainingMaterial.findUnique({
            where: { id: lastCompletedMaterialId },
          })
        : null;

      // Agar oldingi materiallar o'qilmagan bo'lsa
      if (
        !lastCompletedMaterial ||
        lastCompletedMaterial.orderIndex < currentMaterial.orderIndex - 1
      ) {
        return res.status(400).json({
          error: 'Avval oldingi materiallarni o\'qishingiz kerak',
          requiredMaterialId: previousMaterials[previousMaterials.length - 1]?.id,
        });
      }
    }

    // Progress yaratish yoki yangilash
    const progress = await prisma.trainingProgress.upsert({
      where: {
        userId_trainingId: {
          userId: req.user!.id,
          trainingId: trainingId,
        },
      },
      create: {
        userId: req.user!.id,
        trainingId: trainingId,
        materialId: materialId,
        completed: false,
        progressPercent: 0,
      },
      update: {
        materialId: materialId,
        lastAccessedAt: new Date(),
      },
    });

    // Barcha materiallar sonini olish
    const totalMaterials = await prisma.trainingMaterial.count({
      where: { trainingId: trainingId },
    });

    // O'qilgan materiallar sonini olish (orderIndex bo'yicha)
    const completedMaterialsCount = await prisma.trainingMaterial.count({
      where: {
        trainingId: trainingId,
        orderIndex: { lte: currentMaterial.orderIndex },
      },
    });

    const progressPercent = Math.round((completedMaterialsCount / totalMaterials) * 100);
    const completed = progressPercent === 100;

    // Progress yangilash
    const updatedProgress = await prisma.trainingProgress.update({
      where: {
        userId_trainingId: {
          userId: req.user!.id,
          trainingId: trainingId,
        },
      },
      data: {
        progressPercent,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    res.json(updatedProgress);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Yangi o'qitish kursi yaratish
router.post('/', requireAuth('ADMIN'), async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      orderIndex: z.number().default(0),
    });

    const data = schema.parse(req.body);
    const training = await prisma.training.create({
      data,
    });

    res.json(training);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating training:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: O'qitish kursini yangilash
router.put('/:id', requireAuth('ADMIN'), async (req, res) => {
  try {
    const trainingId = parseInt(req.params.id);
    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      orderIndex: z.number().optional(),
      active: z.boolean().optional(),
    });

    const data = schema.parse(req.body);
    const training = await prisma.training.update({
      where: { id: trainingId },
      data,
    });

    res.json(training);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating training:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Material qo'shish
router.post('/:id/materials', requireAuth('ADMIN'), async (req, res) => {
  try {
    const trainingId = parseInt(req.params.id);
    const schema = z.object({
      title: z.string().min(1),
      content: z.string().optional(),
      type: z.enum(['TEXT', 'AUDIO', 'VIDEO']),
      fileUrl: z.string().optional(),
      orderIndex: z.number().default(0),
      durationMin: z.number().optional(),
    });

    const data = schema.parse(req.body);
    const material = await prisma.trainingMaterial.create({
      data: {
        ...data,
        trainingId,
      },
    });

    res.json(material);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Material yangilash
router.put('/:id/materials/:materialId', requireAuth('ADMIN'), async (req, res) => {
  try {
    const materialId = parseInt(req.params.materialId);
    const schema = z.object({
      title: z.string().min(1).optional(),
      content: z.string().optional(),
      type: z.enum(['TEXT', 'AUDIO', 'VIDEO']).optional(),
      fileUrl: z.string().optional(),
      orderIndex: z.number().optional(),
      durationMin: z.number().optional(),
    });

    const data = schema.parse(req.body);
    const material = await prisma.trainingMaterial.update({
      where: { id: materialId },
      data,
    });

    res.json(material);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Material o'chirish
router.delete('/:id/materials/:materialId', requireAuth('ADMIN'), async (req, res) => {
  try {
    const materialId = parseInt(req.params.materialId);
    await prisma.trainingMaterial.delete({
      where: { id: materialId },
    });

    res.json({ message: 'Material o\'chirildi' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

export default router;

