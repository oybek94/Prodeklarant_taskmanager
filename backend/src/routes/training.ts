import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Barcha o'qitish kurslarini olish
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
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
      trainings.map(async (training: any) => {
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

// Admin: Bosqich (Stage) qo'shish - SPECIFIC ROUTE, :id dan oldin bo'lishi kerak
router.post('/:id/stages', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const trainingId = parseInt(req.params.id);
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      orderIndex: z.number().default(0),
    });

    const data = schema.parse(req.body);
    const stage = await prisma.trainingStage.create({
      data: {
        ...data,
        trainingId,
      },
    });

    res.json(stage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error creating stage:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Bosqich (Stage) yangilash
router.put('/:id/stages/:stageId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const stageId = parseInt(req.params.stageId);
    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      orderIndex: z.number().optional(),
    });

    const data = schema.parse(req.body);
    const stage = await prisma.trainingStage.update({
      where: { id: stageId },
      data,
    });

    res.json(stage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error updating stage:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Bosqich (Stage) o'chirish
router.delete('/:id/stages/:stageId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const stageId = parseInt(req.params.stageId);
    await prisma.trainingStage.delete({
      where: { id: stageId },
    });

    res.json({ message: 'Bosqich o\'chirildi' });
  } catch (error) {
    console.error('Error deleting stage:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Qadam (Step) qo'shish
router.post('/:id/stages/:stageId/steps', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const stageId = parseInt(req.params.stageId);
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      orderIndex: z.number().default(0),
    });

    const data = schema.parse(req.body);
    const step = await prisma.trainingStep.create({
      data: {
        ...data,
        stageId,
      },
    });

    res.json(step);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error creating step:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Qadam (Step) yangilash
router.put('/:id/stages/:stageId/steps/:stepId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const stepId = parseInt(req.params.stepId);
    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      orderIndex: z.number().optional(),
    });

    const data = schema.parse(req.body);
    const step = await prisma.trainingStep.update({
      where: { id: stepId },
      data,
    });

    res.json(step);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error updating step:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Qadam (Step) o'chirish
router.delete('/:id/stages/:stageId/steps/:stepId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const stepId = parseInt(req.params.stepId);
    await prisma.trainingStep.delete({
      where: { id: stepId },
    });

    res.json({ message: 'Qadam o\'chirildi' });
  } catch (error) {
    console.error('Error deleting step:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Qadam ichiga material qo'shish
router.post('/:id/stages/:stageId/steps/:stepId/materials', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const stepId = parseInt(req.params.stepId);
    console.log('Creating material for step:', stepId, 'Body:', req.body);
    
    const baseSchema = z.object({
      title: z.string().min(1),
      content: z.string().optional(),
      type: z.enum(['TEXT', 'AUDIO', 'VIDEO', 'IMAGE']),
      orderIndex: z.number().default(0),
      durationMin: z.number().optional(),
    });

    // Type bo'yicha validation
    const body = req.body;
    let data;
    
    if (body.type === 'TEXT') {
      data = baseSchema.parse(body);
    } else if (body.type === 'IMAGE' || body.type === 'AUDIO' || body.type === 'VIDEO') {
      data = baseSchema.extend({
        fileUrl: z.string().min(1, 'Fayl URL kiritilishi shart'),
      }).parse(body);
    } else {
      data = baseSchema.parse(body);
    }
    
    // Clean up data: remove undefined values and empty strings
    const cleanData: any = {
      title: data.title,
      type: data.type,
      orderIndex: data.orderIndex || 0,
      stepId: stepId,
      trainingId: null, // Step ichiga material bo'lsa, trainingId null bo'lishi kerak
    };
    
    // Add optional fields only if they exist and are not empty
    if (data.content !== undefined && data.content !== '') {
      cleanData.content = data.content;
    }
    if ((data as any).fileUrl !== undefined && (data as any).fileUrl !== '') {
      cleanData.fileUrl = (data as any).fileUrl;
    }
    if (data.durationMin !== undefined && data.durationMin !== null) {
      cleanData.durationMin = data.durationMin;
    }
    
    console.log('Creating step material with clean data:', cleanData);
    
    const material = await prisma.trainingMaterial.create({
      data: cleanData,
    });

    console.log('Material created successfully:', material.id);
    res.json(material);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error in step material:', error.issues);
      return res.status(400).json({ 
        error: 'Validation xatosi',
        details: error.issues 
      });
    }
    console.error('Error creating material:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ 
      error: 'Xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Bitta o'qitish kursini olish - GET route, specific route'lardan keyin
router.get('/:id', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const trainingId = parseInt(req.params.id);
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: {
        stages: {
          orderBy: { orderIndex: 'asc' },
          include: {
            steps: {
              orderBy: { orderIndex: 'asc' },
              include: {
                materials: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
        // Eski materiallar (backward compatibility)
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
        examId: { in: training.exams.map((e: any) => e.id) },
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
router.post('/:id/materials/:materialId/complete', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const trainingId = parseInt(req.params.id);
    const materialId = parseInt(req.params.materialId);

    // Joriy materialni olish (stepId yoki trainingId bilan)
    const currentMaterial = await prisma.trainingMaterial.findUnique({
      where: { id: materialId },
      include: {
        step: {
          include: {
            stage: true,
          },
        },
      },
    });

    if (!currentMaterial) {
      return res.status(404).json({ error: 'Material topilmadi' });
    }

    // Material trainingId yoki step orqali trainingId'ga tegishli ekanligini tekshirish
    const materialTrainingId = currentMaterial.trainingId || currentMaterial.step?.stage.trainingId;
    if (materialTrainingId !== trainingId) {
      return res.status(404).json({ error: 'Material topilmadi' });
    }

    const stepId = currentMaterial.stepId;
    const stageId = currentMaterial.step?.stageId;

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
        stageId: stageId || undefined,
        stepId: stepId || undefined,
        materialId: materialId,
        completed: false,
        progressPercent: 0,
      },
      update: {
        stageId: stageId || undefined,
        stepId: stepId || undefined,
        materialId: materialId,
        lastAccessedAt: new Date(),
      },
    });

    // Barcha materiallar sonini olish (stepId bo'lsa step ichida, aks holda training ichida)
    const totalMaterials = stepId
      ? await prisma.trainingMaterial.count({
          where: { stepId: stepId },
        })
      : await prisma.trainingMaterial.count({
          where: { trainingId: trainingId },
        });

    // O'qilgan materiallar sonini olish (orderIndex bo'yicha)
    const completedMaterialsCount = stepId
      ? await prisma.trainingMaterial.count({
          where: {
            stepId: stepId,
            orderIndex: { lte: currentMaterial.orderIndex },
          },
        })
      : await prisma.trainingMaterial.count({
          where: {
            trainingId: trainingId,
            orderIndex: { lte: currentMaterial.orderIndex },
          },
        });

    // Agar materiallar bo'lmasa, progress 0% bo'ladi
    const progressPercent = totalMaterials > 0 
      ? Math.round((completedMaterialsCount / totalMaterials) * 100)
      : 0;
    const completed = totalMaterials > 0 && progressPercent === 100;

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
router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
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
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error creating training:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: O'qitish kursini yangilash
router.put('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
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
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error updating training:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Material qo'shish
router.post('/:id/materials', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const trainingId = parseInt(req.params.id);
    console.log('Creating material for training:', trainingId, 'Body:', req.body);
    
    const baseSchema = z.object({
      title: z.string().min(1),
      content: z.string().optional(),
      type: z.enum(['TEXT', 'AUDIO', 'VIDEO', 'IMAGE']),
      orderIndex: z.number().default(0),
      durationMin: z.number().optional(),
    });

    // Type bo'yicha validation
    const body = req.body;
    let data;
    
    if (body.type === 'TEXT') {
      data = baseSchema.parse(body);
    } else if (body.type === 'IMAGE' || body.type === 'AUDIO' || body.type === 'VIDEO') {
      data = baseSchema.extend({
        fileUrl: z.string().min(1, 'Fayl URL kiritilishi shart'),
      }).parse(body);
    } else {
      data = baseSchema.parse(body);
    }
    
    // Clean up data: remove undefined values and set stepId to null
    const cleanData: any = {
      title: data.title,
      type: data.type,
      orderIndex: data.orderIndex || 0,
      trainingId: trainingId,
      stepId: null, // Eski materiallar uchun stepId null bo'lishi kerak
    };
    
    // Add optional fields only if they exist
    if (data.content !== undefined && data.content !== '') {
      cleanData.content = data.content;
    }
    if ((data as any).fileUrl !== undefined && (data as any).fileUrl !== '') {
      cleanData.fileUrl = (data as any).fileUrl;
    }
    if (data.durationMin !== undefined && data.durationMin !== null) {
      cleanData.durationMin = data.durationMin;
    }
    
    console.log('Creating material with clean data:', cleanData);
    
    const material = await prisma.trainingMaterial.create({
      data: cleanData,
    });

    res.json(material);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error in material:', error.issues);
      return res.status(400).json({ 
        error: 'Validation xatosi',
        details: error.issues 
      });
    }
    console.error('Error creating material:', error);
    res.status(500).json({ 
      error: 'Xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin: Material yangilash
router.put('/:id/materials/:materialId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const materialId = parseInt(req.params.materialId);
    const baseSchema = z.object({
      title: z.string().min(1).optional(),
      content: z.string().optional(),
      type: z.enum(['TEXT', 'AUDIO', 'VIDEO', 'IMAGE']).optional(),
      orderIndex: z.number().optional(),
      durationMin: z.number().optional(),
    });

    // Type bo'yicha validation
    const body = req.body;
    let data;
    
    if (body.type === 'TEXT' || !body.type) {
      data = baseSchema.extend({
        fileUrl: z.string().optional(),
      }).parse(body);
    } else if (body.type === 'IMAGE' || body.type === 'AUDIO' || body.type === 'VIDEO') {
      // Agar type o'zgartirilayotgan bo'lsa va fileUrl bo'sh bo'lsa, required qilish
      if (body.fileUrl !== undefined && body.fileUrl === '') {
        data = baseSchema.extend({
          fileUrl: z.string().min(1, 'Fayl URL kiritilishi shart'),
        }).parse(body);
      } else {
        data = baseSchema.extend({
          fileUrl: z.string().optional(),
        }).parse(body);
      }
    } else {
      data = baseSchema.extend({
        fileUrl: z.string().optional(),
      }).parse(body);
    }
    const material = await prisma.trainingMaterial.update({
      where: { id: materialId },
      data,
    });

    res.json(material);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Material o'chirish
router.delete('/:id/materials/:materialId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
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

