import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { computeDurations } from '../services/stage-duration';
import { logKpiForStage } from '../services/kpi';
import { updateTaskStatus } from '../services/task-status';

const router = Router();

const stageTemplates = [
  'Invoys',
  'Zayavka',
  'TIR-SMR',
  'ST',
  'Fito',
  'Deklaratsiya',
  'Tekshirish',
  'Topshirish',
  'Pochta',
  'Sho‘pirga xat yuborish',
];

const createTaskSchema = z.object({
  clientId: z.number(),
  branchId: z.number(),
  title: z.string().min(1),
  comments: z.string().optional(),
  hasPsr: z.boolean(),
  driverPhone: z.string().optional(),
});

router.get('/', async (req, res) => {
  try {
    const { branchId, status, clientId } = req.query;
    const where: any = {};
    
    if (branchId) where.branchId = Number(branchId);
    if (clientId) where.clientId = Number(clientId);
    if (status) {
      // Validate status against enum values
      const validStatuses = ['BOSHLANMAGAN', 'JARAYONDA', 'TAYYOR'];
      if (validStatuses.includes(status as string)) {
        where.status = status as any;
      }
    }
    
    const tasks = await prisma.task.findMany({
      where,
      include: { 
        client: true, 
        branch: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        stages: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Calculate and update status for each task if needed
    for (const task of tasks) {
      const completedCount = task.stages.filter((s: any) => s.status === 'TAYYOR').length;
      const totalCount = task.stages.length;
      let calculatedStatus: string;
      
      if (completedCount === 0) {
        calculatedStatus = 'BOSHLANMAGAN';
      } else if (completedCount === totalCount) {
        calculatedStatus = 'TAYYOR';
      } else {
        calculatedStatus = 'JARAYONDA';
      }
      
      // Update task status if different
      if (task.status !== calculatedStatus) {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: calculatedStatus as any },
        });
        (task as any).status = calculatedStatus;
      }
    }
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const task = await prisma.$transaction(async (tx) => {
    const createdTask = await tx.task.create({
      data: {
        clientId: parsed.data.clientId,
        branchId: parsed.data.branchId,
        title: parsed.data.title,
        comments: parsed.data.comments,
        hasPsr: parsed.data.hasPsr,
        driverPhone: parsed.data.driverPhone || null,
        createdById: req.user!.id,
      },
    });
    await tx.taskStage.createMany({
      data: stageTemplates.map((name, idx) => ({
        taskId: createdTask.id,
        name,
        stageOrder: idx + 1,
      })),
    });
    return createdTask;
  });

  res.status(201).json(task);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      client: true,
      branch: true,
      stages: { 
        orderBy: { stageOrder: 'asc' },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      errors: true,
      transactions: true,
    },
  });
  if (!task) return res.status(404).json({ error: 'Not found' });
  res.json(task);
});

const updateStageSchema = z.object({
  status: z.enum(['BOSHLANMAGAN', 'TAYYOR']),
});

router.patch('/:taskId/stages/:stageId', async (req: AuthRequest, res) => {
  const taskId = Number(req.params.taskId);
  const stageId = Number(req.params.stageId);
  const parsed = updateStageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const stage = await prisma.taskStage.findUnique({ where: { id: stageId } });
  if (!stage || stage.taskId !== taskId) return res.status(404).json({ error: 'Stage not found' });

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const upd = await tx.taskStage.update({
      where: { id: stageId },
      data: {
        status: parsed.data.status,
        completedAt: parsed.data.status === 'TAYYOR' ? now : null,
        startedAt: parsed.data.status === 'TAYYOR' && !stage.startedAt ? now : stage.startedAt,
        assignedToId: parsed.data.status === 'TAYYOR' ? req.user?.id : stage.assignedToId,
      },
    });

    if (parsed.data.status === 'TAYYOR') {
      await computeDurations(tx, taskId);
      await logKpiForStage(tx, taskId, upd.name, req.user?.id);
    }
    
    // Update task status based on all stages
    await updateTaskStatus(tx, taskId);
    
    return upd;
  });

  res.json(updated);
});

const errorSchema = z.object({
  stageName: z.string(),
  workerId: z.number(),
  amount: z.number(),
  comment: z.string().optional(),
  date: z.coerce.date(),
});

router.get('/:taskId/errors', async (req, res) => {
  const taskId = Number(req.params.taskId);
  const errors = await prisma.taskError.findMany({
    where: { taskId },
    include: { worker: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(errors);
});

router.post('/:taskId/errors', async (req: AuthRequest, res) => {
  const taskId = Number(req.params.taskId);
  const parsed = errorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const error = await prisma.taskError.create({
    data: {
      taskId,
      stageName: parsed.data.stageName,
      workerId: parsed.data.workerId,
      amount: parsed.data.amount,
      comment: parsed.data.comment,
      date: parsed.data.date,
    },
    include: { worker: { select: { id: true, name: true } } },
  });
  res.status(201).json(error);
});

router.delete('/:taskId/errors/:errorId', async (req: AuthRequest, res) => {
  const errorId = Number(req.params.errorId);
  await prisma.taskError.delete({ where: { id: errorId } });
  res.status(204).send();
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  clientId: z.number().optional(),
  branchId: z.number().optional(),
  comments: z.string().optional(),
  hasPsr: z.boolean().optional(),
  driverPhone: z.string().optional(),
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(parsed.data.title && { title: parsed.data.title }),
      ...(parsed.data.clientId && { clientId: parsed.data.clientId }),
      ...(parsed.data.branchId && { branchId: parsed.data.branchId }),
      ...(parsed.data.comments !== undefined && { comments: parsed.data.comments || null }),
      ...(parsed.data.hasPsr !== undefined && { hasPsr: parsed.data.hasPsr }),
      ...(parsed.data.driverPhone !== undefined && { driverPhone: parsed.data.driverPhone || null }),
    },
  });

  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  await prisma.$transaction(async (tx) => {
    await tx.taskError.deleteMany({ where: { taskId: id } });
    await tx.taskStage.deleteMany({ where: { taskId: id } });
    await tx.kpiLog.deleteMany({ where: { taskId: id } });
    await tx.transaction.deleteMany({ where: { taskId: id } });
    await tx.task.delete({ where: { id } });
  });

  res.status(204).send();
});

export default router;

