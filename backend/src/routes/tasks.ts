import { Router } from 'express';
import { prisma } from '../prisma';
import { appCache } from '../services/cache';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { TaskStatus, Prisma } from '@prisma/client';

type AfterHoursPayerType = 'CLIENT' | 'COMPANY';
import { ValidationService } from '../services/validation.service';
import fs from 'fs/promises';
import { socketEmitter } from '../services/socketEmitter';
import { applyStageStatusChange, afterStageStatusCommitted } from '../services/stage.service';
import { notify, getAllActiveUserIds } from '../services/notificationService';
import { createTaskSchema, createTask, afterTaskCreated, TaskCreateError } from '../services/task-create.service';
import { getTaskLight, getTaskDetail } from '../services/task-detail.service';
import { updateTaskSchema, updateTask, TaskUpdateError, regenerateTransportDocs, broadcastTaskUpdated } from '../services/task-update.service';
import { declarationClientSelect, declarationCompletedFields, declarationResetFields, bxmAt } from '../services/declaration-pricing';

import { TaskRepository } from '../repositories/task.repository';
import { TaskService } from '../services/task.service';

const taskRepo = new TaskRepository();
const taskService = new TaskService(taskRepo);

const router = Router();

router.get('/errors/unrated', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const unratedErrors = await prisma.taskError.findMany({
      where: { adminRating: null, workerId: { not: null } },
      include: {
        worker: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(unratedErrors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/errors/pending-delete', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const pendingErrors = await prisma.taskError.findMany({
      where: { deleteRequested: true },
      include: {
        worker: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(pendingErrors);
  } catch (error: any) {
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// ==========================================
// GET /archive-report — Arxiv tasklarining invoice ma'lumotlari asosida hisobot
// Filtrlangan YAKUNLANDI statusli tasklarning invoice, contract, items ma'lumotlarini qaytaradi
// ==========================================
router.get('/archive-report', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { branchId, clientId, startDate, endDate, hasPsr, search } = req.query;
    const where: any = { status: 'YAKUNLANDI' as any };

    // Role-based filtering (GET / bilan bir xil)
    const user = req.user;
    if (user) {
      if (user.role === 'DEKLARANT' && user.branchId) {
        where.branchId = user.branchId;
      } else if ((user.role === 'MANAGER' || user.role === 'ADMIN') && branchId) {
        where.branchId = Number(branchId);
      } else if (user.branchId && user.role !== 'MANAGER' && user.role !== 'ADMIN') {
        where.branchId = user.branchId;
      }
    }

    if (clientId) where.clientId = Number(clientId);
    if (hasPsr === 'true') where.hasPsr = true;
    if (hasPsr === 'false') where.hasPsr = false;

    // Sana filtri
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const sd = new Date(startDate as string);
        sd.setHours(0, 0, 0, 0);
        where.createdAt.gte = sd;
      }
      if (endDate) {
        const ed = new Date(endDate as string);
        ed.setHours(23, 59, 59, 999);
        where.createdAt.lte = ed;
      }
    }

    // Qidiruv filtri — task nomi yoki client nomi bo'yicha
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { client: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        createdAt: true,
        client: { select: { name: true } },
        invoice: {
          select: {
            date: true,
            invoiceNumber: true,
            totalAmount: true,
            currency: true,
            additionalInfo: true,
            contract: {
              select: {
                sellerName: true,
                shipperName: true,
                buyerName: true,
                contractNumber: true,
                deliveryTerms: true,
                customsAddress: true,
              },
            },
            items: {
              select: { name: true },
              orderBy: { orderIndex: 'asc' as const },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // Cheksiz natijalarni oldini olish — faqat oxirgi 500 ta
    });

    // Invoice mavjud bo'lgan tasklarni formatlash, yo'qlarni bo'sh ko'rsatish
    const reportData = tasks
      .map((t) => {
        const inv = t.invoice;
        const addInfo = inv?.additionalInfo && typeof inv.additionalInfo === 'object'
          ? inv.additionalInfo as Record<string, unknown>
          : {};

        return {
          taskName: t.title,
          clientName: (t as any).client?.name || '',
          // Sotuvchi ustuniga yuk jonatuvchi korxona nomi yoziladi; agar yo'q bo'lsa — sotuvchi nomi
          sellerName: inv?.contract?.shipperName || inv?.contract?.sellerName || '',
          buyerName: inv?.contract?.buyerName || '',
          contractNumber: inv?.contract?.contractNumber || '',
          invoiceDate: inv?.date ? inv.date.toISOString() : '',
          invoiceNumber: inv?.invoiceNumber || '',
          deliveryTerms: (addInfo.deliveryTerms as string) || inv?.contract?.deliveryTerms || '',
          vehicleNumber: (addInfo.vehicleNumber as string) || '',
          customsAddress: (addInfo.customsAddress as string) || inv?.contract?.customsAddress || '',
          productNames: inv?.items?.map((i) => i.name).join(', ') || '',
          totalAmount: inv?.totalAmount ? Number(inv.totalAmount) : 0,
          currency: inv?.currency || 'USD',
        };
      });

    res.json(reportData);
  } catch (error: any) {
    console.error('Error generating archive report:', error);
    res.status(500).json({
      error: 'Hisobot yaratishda xatolik yuz berdi',
      details: error.message,
    });
  }
});

router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { branchId, status, clientId, page, limit } = req.query;

    const safeInt = (val: unknown): number | undefined => {
      const n = Number(val);
      return Number.isFinite(n) ? Math.floor(n) : undefined;
    };

    const filters = {
      branchId: safeInt(branchId),
      clientId: safeInt(clientId),
      status: status as TaskStatus,
    };

    const pagination = {
      page: safeInt(page),
      limit: safeInt(limit),
    };

    const userAuth = {
      role: req.user?.role,
      branchId: req.user?.branchId,
    };

    const result = await taskService.getTasks(filters, pagination, userAuth);
    res.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// GET /stats — Task statistikasi (server-side hisob)
// Har bir davr uchun joriy va oldingi countni qaytaradi
// ==========================================
router.get('/stats', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const { branchId } = req.query;

    // Base where clause — RBAC rules (GET / bilan bir xil)
    const baseWhere: any = {};

    if (user) {
      if (user.role === 'DEKLARANT' && user.branchId) {
        baseWhere.branchId = user.branchId;
      } else if (user.role === 'MANAGER' || user.role === 'ADMIN') {
        if (branchId) baseWhere.branchId = Number(branchId);
      } else {
        if (user.branchId) baseWhere.branchId = user.branchId;
      }
    } else {
      if (branchId) baseWhere.branchId = Number(branchId);
    }

    // Vaqt diapazonlarini hisoblash
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Hafta boshi (Yakshanba)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Oldingi davrlar
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setMilliseconds(-1); // weekStart dan 1ms oldin

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    // Parallel count so'rovlar — tez va samarali
    const [
      yearlyCurrent, yearlyPrevious,
      monthlyCurrent, monthlyPrevious,
      weeklyCurrent, weeklyPrevious,
      dailyCurrent, dailyPrevious,
    ] = await Promise.all([
      // Yillik
      prisma.task.count({ where: { ...baseWhere, createdAt: { gte: yearStart, lte: now } } }),
      prisma.task.count({ where: { ...baseWhere, createdAt: { gte: lastYearStart, lte: lastYearEnd } } }),
      // Oylik
      prisma.task.count({ where: { ...baseWhere, createdAt: { gte: monthStart, lte: now } } }),
      prisma.task.count({ where: { ...baseWhere, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      // Haftalik
      prisma.task.count({ where: { ...baseWhere, createdAt: { gte: weekStart, lte: now } } }),
      prisma.task.count({ where: { ...baseWhere, createdAt: { gte: lastWeekStart, lte: lastWeekEnd } } }),
      // Kunlik
      prisma.task.count({ where: { ...baseWhere, createdAt: { gte: today, lte: now } } }),
      prisma.task.count({ where: { ...baseWhere, createdAt: { gte: yesterday, lte: yesterdayEnd } } }),
    ]);

    res.json({
      yearly: { current: yearlyCurrent, previous: yearlyPrevious },
      monthly: { current: monthlyCurrent, previous: monthlyPrevious },
      weekly: { current: weeklyCurrent, previous: weeklyPrevious },
      daily: { current: dailyCurrent, previous: dailyPrevious },
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /tasks — mantiq (narx snapshot'i, bosqichlar): services/task-create.service.ts
router.post('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const task = await createTask(parsed.data, req.user.id);
    res.status(201).json(task);
    afterTaskCreated(task, req.user);
  } catch (error) {
    if (error instanceof TaskCreateError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error creating task:', error);
    res.status(500).json({
      error: 'Xatolik yuz berdi',
      ...(process.env.NODE_ENV !== 'production' && {
        details: error instanceof Error ? error.message : String(error)
      })
    });
  }
});

// Get task stages (lazy loading)
router.get('/:id/stages', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    // Task mavjudligini tekshirish
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task topilmadi' });
    }
    
    // Stages'ni olish
    const stages = await prisma.taskStage.findMany({
      where: { taskId },
      orderBy: { stageOrder: 'asc' },
      select: {
        id: true,
        name: true,
        status: true,
        stageOrder: true,
        durationMin: true,
        startedAt: true,
        completedAt: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    res.json(stages);
  } catch (error: any) {
    console.error('Error fetching task stages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /tasks/:id — mantiq (moliyaviy hisobot): services/task-detail.service.ts
router.get('/:id', requireAuth(), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  // Yengil rejim: Invoice sahifasi uchun faqat kerakli ma'lumotlar (tez yuklash)
  if (req.query.light === 'true') {
    try {
      const task = await getTaskLight(id);
      if (!task) return res.status(404).json({ error: 'Not found' });
      return res.json(task);
    } catch (error) {
      console.error('Error fetching task (light):', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  const detail = await getTaskDetail(id);
  if (!detail) return res.status(404).json({ error: 'Not found' });
  res.json(detail);
});

// Get task versions
router.get('/:id/versions', requireAuth(), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const versions = await prisma.taskVersion.findMany({
    where: { taskId: id },
    include: {
      changedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { version: 'desc' },
  });
  res.json(versions);
});

const updateStageSchema = z.object({
  status: z.enum(['BOSHLANMAGAN', 'TAYYOR']),
  customsPaymentMultiplier: z.coerce.number().min(0.5).max(4).optional(), // BXM multiplier for Deklaratsiya (0.5 to 4)
  afterHoursDeclaration: z.boolean().optional(),
  afterHoursPayer: z.enum(['CLIENT', 'COMPANY']).optional(),
  skipValidation: z.boolean().optional(), // Skip document validation for ST stage
  force: z.boolean().optional(), // Admin boshqa ishchining jarayonini qaytarish uchun
});

router.patch('/:taskId/stages/:stageId', requireAuth(), async (req: AuthRequest, res) => {
  const taskId = Number(req.params.taskId);
  const stageId = Number(req.params.stageId);
  const parsed = updateStageSchema.safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check user access to task
    const validationService = new ValidationService(prisma);
    const canAccess = await validationService.canUserAccessTask(
      taskId,
      user.id,
      user.role
    );

    if (!canAccess) {
      return res.status(403).json({ error: 'Bu taskga kirish huquqingiz yo\'q' });
    }

    const stage = await prisma.taskStage.findUnique({ 
      where: { id: stageId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!stage || stage.taskId !== taskId) return res.status(404).json({ error: 'Stage not found' });

    // Barcha stage'lar oddiy jarayon sifatida ishlaydi - PDF/JPG validation olib tashlandi

    // Pochta jarayoni tayyor qilishda hujjatlar tekshiruvi
    if (stage.name === 'Pochta' && parsed.data.status === 'TAYYOR' && stage.status !== 'TAYYOR') {
      const documentCount = await prisma.taskDocument.count({
        where: { taskId }
      });

      if (documentCount === 0) {
          return res.status(400).json({ 
          error: 'Pochta jarayonini tayyor qilish uchun kamida bitta hujjat yuklanishi kerak' 
        });
      }
    }

    // Jarayonni TAYYOR dan BOSHLANMAGAN ga qaytarish logikasi
    if (stage.status === 'TAYYOR' && parsed.data.status !== 'TAYYOR') {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const isStageOwner = stage.assignedToId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      if (!isStageOwner && !isAdmin) {
        return res.status(403).json({ 
          error: 'Faqat jarayonni tayyor qilgan odam yoki admin jarayon statusini o\'zgartirishi mumkin' 
        });
      }

      // Agar admin boshqa ishchining jarayonini qaytarmoqchi bo'lsa, force talab qilinadi
      if (isAdmin && !isStageOwner && !parsed.data.force) {
        return res.status(409).json({
          error: 'Bu jarayonni boshqa ishchi tugatgan. Qaytarishni tasdiqlang.',
          requireConfirmation: true,
          completedBy: stage.assignedTo?.name || 'Noma\'lum',
          completedById: stage.assignedToId,
          stageName: stage.name,
        });
      }
    }

    // Agar jarayonni tugallanmagan (BOSHLANMAGAN) qilishga harakat qilinayotgan bo'lsa
    if (parsed.data.status === 'BOSHLANMAGAN' && stage.status === 'TAYYOR') {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const isStageOwner = stage.assignedToId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      if (!isStageOwner && !isAdmin) {
        return res.status(403).json({ 
          error: 'Faqat jarayonni tayyor qilgan odam yoki admin jarayonni tugallanmagan qilishi mumkin' 
        });
      }

      // Agar admin boshqa ishchining jarayonini qaytarmoqchi bo'lsa, force talab qilinadi
      if (isAdmin && !isStageOwner && !parsed.data.force) {
        return res.status(409).json({
          error: 'Bu jarayonni boshqa ishchi tugatgan. Qaytarishni tasdiqlang.',
          requireConfirmation: true,
          completedBy: stage.assignedTo?.name || 'Noma\'lum',
          completedById: stage.assignedToId,
          stageName: stage.name,
        });
      }
    }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    // Deklaratsiya narxi (BXM × koef): bojxona to'lovi so'mda, CASH_ALL_INCLUSIVE da
    // mijoz summasiga qo'shimcha — qarang services/declaration-pricing.ts
    const declarationCompleting = stage.name === 'Deklaratsiya' && parsed.data.status === 'TAYYOR' && parsed.data.customsPaymentMultiplier;
    const declarationReverting = stage.name === 'Deklaratsiya' && parsed.data.status === 'BOSHLANMAGAN' && stage.status === 'TAYYOR';
    if (declarationCompleting || declarationReverting) {
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: {
          afterHoursDeclaration: true,
          afterHoursPayer: true,
          snapshotDealAmount_exchange_rate: true,
          snapshotDealAmountExchangeRate: true,
          client: { select: declarationClientSelect },
        },
      });
      if (task && declarationCompleting && parsed.data.customsPaymentMultiplier) {
        await tx.task.update({
          where: { id: taskId },
          data: declarationCompletedFields({
            client: task.client,
            task,
            multiplier: Number(parsed.data.customsPaymentMultiplier),
            afterHoursDeclaration: parsed.data.afterHoursDeclaration ?? task.afterHoursDeclaration ?? false,
            afterHoursPayer: (parsed.data.afterHoursPayer ?? task.afterHoursPayer ?? 'CLIENT') as AfterHoursPayerType,
            bxm: await bxmAt(tx, new Date()),
          }),
        });
      } else if (task && declarationReverting) {
        await tx.task.update({ where: { id: taskId }, data: declarationResetFields(task.client, task) });
      }
    }

    return applyStageStatusChange(tx, {
      stage,
      newStatus: parsed.data.status,
      actorId: user.id,
      now,
    });
  }, {
      maxWait: 30000, // 30 seconds max wait for transaction to start
      timeout: 30000, // 30 seconds timeout for transaction to complete (remote database uchun)
    });


  await afterStageStatusCommitted({
    stage,
    newStatus: parsed.data.status,
    result: updated,
    actor: { id: user.id, name: user.name },
  });

    res.json(updated.updated);
  } catch (error: any) {

    console.error('Error updating stage:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ 
      error: 'Stage yangilashda xatolik yuz berdi',
      ...(process.env.NODE_ENV !== 'production' && {
        details: error instanceof Error ? error.message : String(error)
      })
    });
  }
});

const errorSchema = z.object({
  stageName: z.string(),
  workerId: z.number().nullable(),
  isClientError: z.boolean().optional(),
  amount: z.number(),
  comment: z.string().optional(),
  date: z.coerce.date(),
});

const updateErrorSchema = z.object({
  stageName: z.string().optional(),
  workerId: z.number().nullable().optional(),
  amount: z.number().optional(),
  comment: z.string().optional(),
  date: z.coerce.date().optional(),
});

router.get('/:taskId/errors', requireAuth(), async (req: AuthRequest, res) => {
  const taskId = Number(req.params.taskId);
  const errors = await prisma.taskError.findMany({
    where: { taskId },
    include: { worker: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(errors);
});

router.post('/:taskId/errors', requireAuth(), async (req: AuthRequest, res) => {
  const taskId = Number(req.params.taskId);
  const parsed = errorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Create error and deduct from worker's earned amount using transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the error record
      const error = await (tx as any).taskError.create({
      data: {
        taskId,
        stageName: parsed.data.stageName,
        workerId: parsed.data.workerId,
        amount: parsed.data.amount,
        amount_uzs: parsed.data.amount,
        amount_original: parsed.data.amount,
        convertedUzsAmount: parsed.data.amount,
        currency: 'UZS',
        currency_universal: 'UZS',
        comment: parsed.data.comment,
        date: parsed.data.date,
        createdById: req.user!.id,
      },
      include: {
        worker: { select: { id: true, name: true } },
      },
    });

    if (parsed.data.isClientError) {
      const task = await (tx as any).task.findUnique({
        where: { id: taskId },
        include: { client: true }
      });
      if (task && task.client) {
        let person = await (tx as any).debtPerson.findUnique({ where: { name: task.client.name.trim() } });
        if (!person) {
          person = await (tx as any).debtPerson.create({ data: { name: task.client.name.trim() } });
        }
        await (tx as any).debt.create({
          data: {
            debtPersonId: person.id,
            amount: parsed.data.amount,
            currency: 'UZS',
            comment: `Xatolik: Task #${taskId} uchun mijoz xatosi. ${parsed.data.comment || ''}`.trim(),
            date: parsed.data.date,
          }
        });
      }
    }

    return error;
  });

  res.status(201).json(result);
  socketEmitter.broadcast('admin_new_error_report', { error: result, event: 'Yangi xato hisoboti kelib tushdi' });
  socketEmitter.broadcast('task:errorUpdated', { taskId });
});

router.delete('/:taskId/errors/:errorId', requireAuth(), async (req: AuthRequest, res) => {
  const errorId = Number(req.params.errorId);
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const error = await prisma.taskError.findUnique({
    where: { id: errorId },
  });
  if (!error) {
    return res.status(404).json({ error: 'Xato topilmadi' });
  }

  const createdAt = new Date(error.createdAt);
  const diffMs = Date.now() - createdAt.getTime();
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const isAdmin = req.user.role === 'ADMIN';
  if (!isAdmin && (error.createdById !== req.user.id || diffMs > twoDaysMs)) {
    return res.status(403).json({ error: 'Xatoni faqat 2 kun ichida qo‘shgan odam o‘chira oladi' });
  }

  if (!isAdmin) {
    // Non-adminlar o'chirishni so'raydi
    await prisma.taskError.update({
      where: { id: errorId },
      data: { deleteRequested: true }
    });
    return res.status(200).json({ message: 'O\'chirish so\'rovi adminga yuborildi' });
  }

  await prisma.$transaction(async (tx) => {
    // Agar xato baholangan bo'lsa, XPlarni qaytarish
    if (error.adminRating !== null && error.bountyXp && error.workerId) {
      if (error.workerId !== error.createdById) {
        await (tx as any).user.update({
          where: { id: error.workerId },
          data: { xp: { increment: error.bountyXp } },
        });
        await (tx as any).user.update({
          where: { id: error.createdById },
          data: { xp: { decrement: error.bountyXp } },
        });
      } else {
        await (tx as any).user.update({
          where: { id: error.workerId },
          data: { xp: { increment: error.bountyXp } },
        });
      }
    }
    await (tx as any).taskError.delete({ where: { id: errorId } });
  });

  res.status(204).send();
  socketEmitter.broadcast('task:errorUpdated', { taskId: error.taskId });
});

router.post('/:taskId/errors/:errorId/approve-delete', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  const errorId = Number(req.params.errorId);
  const error = await prisma.taskError.findUnique({
    where: { id: errorId },
  });
  if (!error) return res.status(404).json({ error: 'Xato topilmadi' });

  await prisma.$transaction(async (tx) => {
    // Agar xato baholangan bo'lsa, XPlarni qaytarish
    if (error.adminRating !== null && error.bountyXp && error.workerId) {
      if (error.workerId !== error.createdById) {
        await (tx as any).user.update({
          where: { id: error.workerId },
          data: { xp: { increment: error.bountyXp } },
        });
        await (tx as any).user.update({
          where: { id: error.createdById },
          data: { xp: { decrement: error.bountyXp } },
        });
      } else {
        await (tx as any).user.update({
          where: { id: error.workerId },
          data: { xp: { increment: error.bountyXp } },
        });
      }
    }
    await (tx as any).taskError.delete({ where: { id: errorId } });
  });

  res.status(204).send();
  socketEmitter.broadcast('task:errorUpdated', { taskId: error.taskId });
});

router.post('/:taskId/errors/:errorId/reject-delete', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  const errorId = Number(req.params.errorId);
  await prisma.taskError.update({
    where: { id: errorId },
    data: { deleteRequested: false }
  });
  res.status(204).send();
});

const rateErrorSchema = z.object({
  rating: z.number().min(0).max(100),
});

router.put('/:taskId/errors/:errorId/rate', requireAuth(), async (req: AuthRequest, res) => {
  const errorId = Number(req.params.errorId);
  const parsed = rateErrorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Faqat admin xatolarni baholay oladi' });
  }

  const error = await prisma.taskError.findUnique({
    where: { id: errorId },
  });

  if (!error) {
    return res.status(404).json({ error: 'Xato topilmadi' });
  }

  if (error.adminRating !== null) {
    return res.status(400).json({ error: 'Bu xato allaqachon baholangan' });
  }

  if (error.workerId === null) {
    return res.status(400).json({ error: 'Mijoz tomonidan qilingan xato baholanmaydi' });
  }

  const rating = parsed.data.rating;
  const bountyUzs = rating * 5000;
  const bountyXp = rating;

  const { updated, workerNotif, creatorNotif } = await prisma.$transaction(async (tx) => {
    const errorUpdated = await (tx as any).taskError.update({
      where: { id: errorId },
      data: {
        adminRating: rating,
        adminRatedAt: new Date(),
        bountyRewardUzs: bountyUzs,
        bountyXp: bountyXp,
      },
      include: { 
        worker: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } }
      },
    });

    let wNotif: any = null;
    let cNotif: any = null;

    if (errorUpdated.workerId !== errorUpdated.createdById) {
      // Deduct XP from worker
      await (tx as any).user.update({
        where: { id: errorUpdated.workerId },
        data: { xp: { decrement: bountyXp } },
      });

      // Add XP to creator
      await (tx as any).user.update({
        where: { id: errorUpdated.createdById },
        data: { xp: { increment: bountyXp } },
      });

      // Notification for worker (XP loss)
      wNotif = await (tx as any).notification.create({
        data: {
          userId: errorUpdated.workerId,
          type: 'SYSTEM',
          title: 'XP Ayrildi',
          message: `${errorUpdated.stageName} da xato qilganingiz uchun ${bountyXp} XP ayrildi.`,
          metadata: { 
            isXpAnimation: true, 
            type: 'XP_LOSS', 
            xpAmount: bountyXp, 
            stageName: errorUpdated.stageName,
            taskTitle: errorUpdated.task?.title || '',
            comment: errorUpdated.comment || ''
          },
        }
      });

      // Notification for creator (XP gain)
      cNotif = await (tx as any).notification.create({
        data: {
          userId: errorUpdated.createdById,
          type: 'SYSTEM',
          title: 'XP Qo\'shildi',
          message: `${errorUpdated.stageName} dagi xatoni topganingiz uchun ${bountyXp} XP qo'shildi.`,
          metadata: { 
            isXpAnimation: true, 
            type: 'XP_GAIN', 
            xpAmount: bountyXp, 
            stageName: errorUpdated.stageName,
            taskTitle: errorUpdated.task?.title || '',
            comment: errorUpdated.comment || ''
          },
        }
      });
    } else if (errorUpdated.workerId === errorUpdated.createdById) {
      // O'z xatosini topsa faqat XP jarima
      await (tx as any).user.update({
        where: { id: errorUpdated.workerId },
        data: { xp: { decrement: bountyXp } },
      });

      wNotif = await (tx as any).notification.create({
        data: {
          userId: errorUpdated.workerId,
          type: 'SYSTEM',
          title: 'XP Ayrildi',
          message: `O'z xatoyingizni tasdiqlaganingiz uchun ${bountyXp} XP jarima.`,
          metadata: { 
            isXpAnimation: true, 
            type: 'XP_LOSS', 
            xpAmount: bountyXp, 
            stageName: errorUpdated.stageName,
            taskTitle: errorUpdated.task?.title || '',
            comment: errorUpdated.comment || ''
          },
        }
      });
    }

    return { updated: errorUpdated, workerNotif: wNotif, creatorNotif: cNotif };
  });

  if (workerNotif) {
    socketEmitter.toUser(updated.workerId, 'XP_ANIMATION', {
      ...workerNotif.metadata,
      notificationId: workerNotif.id
    });
  }

  if (creatorNotif) {
    socketEmitter.toUser(updated.createdById, 'XP_ANIMATION', {
      ...creatorNotif.metadata,
      notificationId: creatorNotif.id
    });
  }

  socketEmitter.broadcast('user:bounty_awarded', updated);
  res.json(updated);
});

router.patch('/:taskId/errors/:errorId', requireAuth(), async (req: AuthRequest, res) => {
  const errorId = Number(req.params.errorId);
  const parsed = updateErrorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const error = await prisma.taskError.findUnique({
    where: { id: errorId },
  });
  if (!error) {
    return res.status(404).json({ error: 'Xato topilmadi' });
  }

  const createdAt = new Date(error.createdAt);
  const diffMs = Date.now() - createdAt.getTime();
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const isAdmin = req.user.role === 'ADMIN';
  if (!isAdmin && (error.createdById !== req.user.id || diffMs > twoDaysMs)) {
    return res.status(403).json({ error: 'Xatoni faqat 2 kun ichida qo‘shgan odam o‘zgartira oladi' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await (tx as any).taskError.update({
      where: { id: errorId },
      data: {
        ...(parsed.data.stageName && { stageName: parsed.data.stageName }),
        ...(parsed.data.workerId !== undefined && { workerId: parsed.data.workerId }),
        ...(parsed.data.amount !== undefined && { 
          amount: parsed.data.amount,
          amount_uzs: parsed.data.amount,
          amount_original: parsed.data.amount,
          convertedUzsAmount: parsed.data.amount,
          currency: 'UZS',
          currency_universal: 'UZS',
        }),
        ...(parsed.data.comment !== undefined && { comment: parsed.data.comment }),
        ...(parsed.data.date && { date: parsed.data.date }),
      },
      include: { worker: { select: { id: true, name: true } } },
    });

    return next;
  });

  res.json(updated);
  socketEmitter.broadcast('task:errorUpdated', { taskId: updated.taskId });
});

// PATCH /tasks/:id — mantiq: services/task-update.service.ts
router.patch('/:id', requireAuth(), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { updated, branchChanged } = await updateTask(id, parsed.data, user);
    if (branchChanged) await regenerateTransportDocs(id, user.id);
    res.json(updated);
    broadcastTaskUpdated(id, parsed.data, user);
  } catch (error) {
    if (error instanceof TaskUpdateError) {
      return res.status(error.status).json({ error: error.message });
    }
    throw error;
  }
});

router.delete('/:id', requireAuth(), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const task = await prisma.task.findUnique({ 
    where: { id },
    include: {
      stages: {
        select: {
          status: true,
        },
      },
    },
  });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // RBAC: Faqat ADMIN yoki task yaratuvchisi o'chirishi mumkin
  if (user.role !== 'ADMIN' && task.createdById !== user.id) {
    return res.status(403).json({ error: 'Ruxsat yo\'q — faqat admin yoki task yaratuvchisi o\'chirishi mumkin' });
  }

  // Agar task Jarayonda bo'lsa, o'chirish mumkin emas
  if (task.status === 'JARAYONDA') {
    return res.status(400).json({ 
      error: 'Jarayonda bo\'lgan taskni o\'chirish mumkin emas' 
    });
  }

  // Faqat barcha jarayonlar BOSHLANMAGAN bo'lsa, o'chirish mumkin
  const hasStartedStages = task.stages.some(stage => stage.status !== 'BOSHLANMAGAN');
  if (hasStartedStages) {
    return res.status(400).json({ 
      error: 'Taskni o\'chirish uchun barcha jarayonlar boshlanmagan (BOSHLANMAGAN) bo\'lishi kerak' 
    });
  }

  await prisma.$transaction(async (tx) => {
    await (tx as any).taskError.deleteMany({ where: { taskId: id } });
    await (tx as any).taskStage.deleteMany({ where: { taskId: id } });
    await (tx as any).kpiLog.deleteMany({ where: { taskId: id } });
    await (tx as any).transaction.deleteMany({ where: { taskId: id } });
    await (tx as any).taskDocument.deleteMany({ where: { taskId: id } });
    await (tx as any).task.delete({ where: { id } });
  });

  res.status(204).send();
  // Real-time: task o'chirilishi haqida xabar berish
  socketEmitter.broadcastExcept(user.id, 'task:deleted', { taskId: id, deletedBy: user.name });
  // Bildirishnoma
  getAllActiveUserIds().then(userIds => {
    notify({
      userIds,
      type: 'TASK_DELETED',
      title: `Task o'chirildi`,
      message: `${user.name} task #${id} ni o'chirdi`,
      excludeUserId: user.id,
    });
  });
});

export default router;

