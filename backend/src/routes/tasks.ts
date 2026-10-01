import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { TaskStatus } from '@prisma/client';
import { z } from 'zod';

import { socketEmitter } from '../services/socketEmitter';
import { updateStageSchema, updateStageFromApi, StageUpdateError } from '../services/stage-update.service';
import { notify, getAllActiveUserIds } from '../services/notificationService';
import { createTaskSchema, createTask, afterTaskCreated, TaskCreateError } from '../services/task-create.service';
import { getTaskLight, getTaskDetail, canSeeTaskFinancials, redactTaskDetailForStaff } from '../services/task-detail.service';
import { updateTaskSchema, updateTask, TaskUpdateError, broadcastTaskUpdated } from '../services/task-update.service';
import {
  createErrorSchema, updateErrorSchema, rateErrorSchema, TaskErrorError, parseId,
  listTaskErrors, listUnratedErrors, listPendingDeleteErrors, createTaskError, updateTaskError,
  deleteTaskError, approveDeleteRequest, rejectDeleteRequest, rateTaskError,
} from '../services/task-error.service';

import { TaskRepository, tashkentDayRange } from '../repositories/task.repository';
import { taskStatsPeriods } from '../services/task-stats-periods';
import { TaskService } from '../services/task.service';

const taskRepo = new TaskRepository();
const taskService = new TaskService(taskRepo);

const router = Router();

// Xatolar (TaskError) — mantiq: services/task-error.service.ts
router.get('/errors/unrated', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  res.json(await listUnratedErrors());
});

router.get('/errors/pending-delete', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  res.json(await listPendingDeleteErrors());
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

    // Sana filtri — invoys sanasi bo'yicha, Toshkent kuni (arxiv ro'yxati bilan bir xil)
    const day = /^\d{4}-\d{2}-\d{2}$/;
    const invoiceDate = tashkentDayRange(
      typeof startDate === 'string' && day.test(startDate) ? startDate : undefined,
      typeof endDate === 'string' && day.test(endDate) ? endDate : undefined,
    );
    if (invoiceDate) where.invoice = { is: { date: invoiceDate } };

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

// Bo'sh query qiymatlari ("?status=") berilmagan deb olinadi
const optionalQuery = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());
const boolQuery = optionalQuery(z.enum(['true', 'false']).transform((v) => v === 'true'));
const dayQuery = optionalQuery(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD formatida bo\'lishi kerak'));
const positiveInt = optionalQuery(z.coerce.number().int().positive());

const listTasksQuerySchema = z.object({
  branchId: positiveInt,
  clientId: positiveInt,
  status: optionalQuery(z.nativeEnum(TaskStatus)),
  excludeCompleted: boolQuery,
  hasPsr: boolQuery,
  search: optionalQuery(z.string().trim().max(200)),
  startDate: dayQuery,
  endDate: dayQuery,
  dateBy: optionalQuery(z.enum(['created', 'invoice'])),
  page: positiveInt,
  limit: positiveInt,
});

router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const parsed = listTasksQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { page, limit, ...filters } = parsed.data;
    const pagination = { page, limit };

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

    // Davrlar Toshkent vaqti bo'yicha (services/task-stats-periods.ts)
    const periods = taskStatsPeriods(new Date());
    const count = (createdAt: { gte: Date; lte: Date }) =>
      prisma.task.count({ where: { ...baseWhere, createdAt } });

    // Parallel count so'rovlar — tez va samarali
    const [
      yearlyCurrent, yearlyPrevious,
      monthlyCurrent, monthlyPrevious,
      weeklyCurrent, weeklyPrevious,
      dailyCurrent, dailyPrevious,
    ] = await Promise.all([
      count(periods.yearly.current), count(periods.yearly.previous),
      count(periods.monthly.current), count(periods.monthly.previous),
      count(periods.weekly.current), count(periods.weekly.previous),
      count(periods.daily.current), count(periods.daily.previous),
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
  // Foyda, admin daromadi, boshqa xodimlar KPI'si faqat ADMIN'ga
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(canSeeTaskFinancials(req.user.role) ? detail : redactTaskDetailForStaff(detail, req.user.id));
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

// PATCH /tasks/:taskId/stages/:stageId — mantiq: services/stage-update.service.ts
router.patch('/:taskId/stages/:stageId', requireAuth(), async (req: AuthRequest, res) => {
  const taskId = Number(req.params.taskId);
  const stageId = Number(req.params.stageId);
  if (!Number.isInteger(taskId) || taskId <= 0 || !Number.isInteger(stageId) || stageId <= 0) {
    return res.status(400).json({ error: 'Invalid task or stage ID' });
  }
  const parsed = updateStageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    res.json(await updateStageFromApi(taskId, stageId, parsed.data, req.user));
  } catch (error) {
    if (error instanceof StageUpdateError) {
      return res.status(error.status).json({ error: error.message, ...error.extra });
    }
    console.error('Error updating stage:', error);
    res.status(500).json({ error: 'Stage yangilashda xatolik yuz berdi' });
  }
});

function sendTaskErrorError(res: Response, error: unknown): boolean {
  if (!(error instanceof TaskErrorError)) return false;
  res.status(error.status).json({ error: error.message });
  return true;
}

/** /:taskId/errors* uchun umumiy o'rash: id parse + TaskErrorError → status. */
function errorRoute(handler: (req: AuthRequest & { user: NonNullable<AuthRequest['user']> }, res: Response, taskId: number) => Promise<unknown>) {
  return async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const taskId = parseId(req.params.taskId, 'vazifa ID');
      await handler(req as AuthRequest & { user: NonNullable<AuthRequest['user']> }, res, taskId);
    } catch (error) {
      if (!sendTaskErrorError(res, error)) throw error;
    }
  };
}

router.get('/:taskId/errors', requireAuth(), errorRoute(async (_req, res, taskId) => {
  res.json(await listTaskErrors(taskId));
}));

router.post('/:taskId/errors', requireAuth(), errorRoute(async (req, res, taskId) => {
  const parsed = createErrorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.status(201).json(await createTaskError(taskId, parsed.data, req.user));
}));

router.delete('/:taskId/errors/:errorId', requireAuth(), errorRoute(async (req, res, taskId) => {
  const outcome = await deleteTaskError(taskId, parseId(req.params.errorId, 'xato ID'), req.user);
  if (outcome === 'requested') return res.status(200).json({ message: "O'chirish so'rovi adminga yuborildi" });
  res.status(204).send();
}));

router.post('/:taskId/errors/:errorId/approve-delete', requireAuth('ADMIN'), errorRoute(async (req, res, taskId) => {
  await approveDeleteRequest(taskId, parseId(req.params.errorId, 'xato ID'));
  res.status(204).send();
}));

router.post('/:taskId/errors/:errorId/reject-delete', requireAuth('ADMIN'), errorRoute(async (req, res, taskId) => {
  await rejectDeleteRequest(taskId, parseId(req.params.errorId, 'xato ID'));
  res.status(204).send();
}));

router.put('/:taskId/errors/:errorId/rate', requireAuth(), errorRoute(async (req, res, taskId) => {
  const parsed = rateErrorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Faqat admin xatolarni baholay oladi' });
  res.json(await rateTaskError(taskId, parseId(req.params.errorId, 'xato ID'), parsed.data.rating));
}));

router.patch('/:taskId/errors/:errorId', requireAuth(), errorRoute(async (req, res, taskId) => {
  const parsed = updateErrorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.json(await updateTaskError(taskId, parseId(req.params.errorId, 'xato ID'), parsed.data, req.user));
}));

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
    const { updated } = await updateTask(id, parsed.data, user);
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

