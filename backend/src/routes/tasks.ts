import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { computeDurations } from '../services/stage-duration';
import { logKpiForStage } from '../services/kpi';
import { updateTaskStatus, calculateTaskStatus } from '../services/task-status';

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
];

const createTaskSchema = z.object({
  clientId: z.number(),
  branchId: z.number(),
  title: z.string().min(1),
  comments: z.string().optional(),
  hasPsr: z.boolean(),
  driverPhone: z.string().optional(),
  customsPaymentMultiplier: z.number().min(0.5).max(4).optional(), // BXM multiplier for Deklaratsiya (0.5 to 4)
});

router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { branchId, status, clientId } = req.query;
    const where: any = {};
    
    // Role'ga qarab filial filter qo'shish
    const user = req.user;
    if (user) {
      if (user.role === 'DEKLARANT' && user.branchId) {
        // Deklarant faqat o'z filialidagi ishlarni ko'radi
        where.branchId = user.branchId;
      } else if (user.role === 'MANAGER') {
        // Manager barcha filiallardagi ishlarni ko'radi (branchId filter qo'llanmaydi)
        // Agar query'da branchId bo'lsa, uni qo'llaymiz (filter uchun)
        if (branchId) where.branchId = Number(branchId);
      } else if (user.role === 'ADMIN') {
        // Admin ham barcha filiallarni ko'radi
        if (branchId) where.branchId = Number(branchId);
      } else {
        // Boshqa rollar uchun o'z filialidagi ishlar
        if (user.branchId) where.branchId = user.branchId;
      }
    } else {
      // Agar user bo'lmasa, query'dan branchId olinadi
      if (branchId) where.branchId = Number(branchId);
    }
    
    if (clientId) where.clientId = Number(clientId);
    if (status) {
      // Validate status against enum values
      const validStatuses = ['BOSHLANMAGAN', 'JARAYONDA', 'TAYYOR', 'TEKSHIRILGAN', 'TOPSHIRILDI', 'YAKUNLANDI'];
      if (validStatuses.includes(status as string)) {
        where.status = status as any;
      }
    }
    
    const tasks = await prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        comments: true,
        hasPsr: true,
        driverPhone: true,
        createdAt: true,
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
            name: true,
            status: true,
            durationMin: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Calculate and update status for each task using the new formula
    for (const task of tasks) {
      const calculatedStatus = await calculateTaskStatus(prisma, task.id);
      
      // Update task status if different
      if (task.status !== calculatedStatus) {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: calculatedStatus },
        });
        (task as any).status = calculatedStatus;
      } else {
        // Update the task object with calculated status for response
        (task as any).status = calculatedStatus;
      }
    }
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth(), async (req: AuthRequest, res) => {
  // #region agent log
  const logEntry = {location:'tasks.ts:124',message:'POST /tasks entry',data:{hasUser:!!req.user,userId:req.user?.id,body:req.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
  console.log('[DEBUG]', JSON.stringify(logEntry));
  fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logEntry)}).catch(()=>{});
  // #endregion
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = createTaskSchema.safeParse(req.body);
    // #region agent log
    const logValidation = {location:'tasks.ts:131',message:'Schema validation',data:{success:parsed.success,parsedData:parsed.success?parsed.data:null,errors:parsed.success?null:parsed.error.flatten()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
    console.log('[DEBUG]', JSON.stringify(logValidation));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logValidation)}).catch(()=>{});
    // #endregion
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const task = await prisma.$transaction(async (tx) => {
      // Client va Branch mavjudligini tekshirish
      const client = await tx.client.findUnique({
        where: { id: parsed.data.clientId },
        select: { dealAmount: true },
      });
      if (!client) {
        throw new Error(`Client with id ${parsed.data.clientId} not found`);
      }
      
      const branch = await tx.branch.findUnique({
        where: { id: parsed.data.branchId },
        select: { id: true },
      });
      if (!branch) {
        throw new Error(`Branch with id ${parsed.data.branchId} not found`);
      }

    // Davlat to'lovlarini olish (task yaratilgan vaqtdan oldin yaratilgan eng so'nggi davlat to'lovi)
    const taskCreatedAt = new Date();
    const statePayment = await tx.statePayment.findFirst({
      where: {
        branchId: parsed.data.branchId,
        createdAt: { lte: taskCreatedAt }, // Task yaratilgunga qadar yaratilgan davlat to'lovlari
      },
      orderBy: {
        createdAt: 'desc', // Eng so'nggi davlat to'lovi
      },
    });

    let snapshotDealAmount = client?.dealAmount ? Number(client.dealAmount) : null;
    let snapshotCertificatePayment = null;
    let snapshotPsrPrice = null;
    let snapshotWorkerPrice = null;
    let snapshotCustomsPayment = null;

    if (statePayment) {
      // Task yaratilgan vaqtdan oldin yaratilgan eng so'nggi davlat to'lovidan foydalanamiz
      snapshotCertificatePayment = Number(statePayment.certificatePayment) as any;
      snapshotPsrPrice = Number(statePayment.psrPrice) as any;
      snapshotWorkerPrice = Number(statePayment.workerPrice) as any;
      snapshotCustomsPayment = Number(statePayment.customsPayment) as any;
    }

    // Prisma data object - faqat mavjud field'larni qo'shamiz
    const taskData: any = {
      clientId: parsed.data.clientId,
      branchId: parsed.data.branchId,
      title: parsed.data.title,
      hasPsr: parsed.data.hasPsr,
      createdById: req.user.id,
    };

    // Optional field'larni qo'shamiz - faqat mavjud va null bo'lmagan qiymatlarni
    if (parsed.data.comments !== undefined && parsed.data.comments !== null && parsed.data.comments !== '') {
      taskData.comments = parsed.data.comments;
    }
    if (parsed.data.driverPhone !== undefined && parsed.data.driverPhone !== null && parsed.data.driverPhone !== '') {
      taskData.driverPhone = parsed.data.driverPhone;
    }
    // Decimal field'lar uchun - faqat mavjud va null bo'lmagan qiymatlarni (Prisma number qabul qiladi)
    // state-payments.ts dagi kabi to'g'ridan-to'g'ri number sifatida yuboramiz
    if (snapshotDealAmount != null) {
      taskData.snapshotDealAmount = snapshotDealAmount;
    }
    if (snapshotCertificatePayment != null) {
      taskData.snapshotCertificatePayment = snapshotCertificatePayment;
    }
    if (snapshotPsrPrice != null) {
      taskData.snapshotPsrPrice = snapshotPsrPrice;
    }
    if (snapshotWorkerPrice != null) {
      taskData.snapshotWorkerPrice = snapshotWorkerPrice;
    }
    if (snapshotCustomsPayment != null) {
      taskData.snapshotCustomsPayment = snapshotCustomsPayment;
    }
    if (parsed.data.customsPaymentMultiplier != null) {
      taskData.customsPaymentMultiplier = parsed.data.customsPaymentMultiplier;
    }
    // #region agent log
    const logBeforeCreate = {location:'tasks.ts:199',message:'taskData before Prisma create',data:{taskData:JSON.parse(JSON.stringify(taskData)),taskDataTypes:Object.keys(taskData).reduce((acc,key)=>{acc[key]=typeof taskData[key];return acc;},{})},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
    console.log('[DEBUG]', JSON.stringify(logBeforeCreate));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logBeforeCreate)}).catch(()=>{});
    // #endregion

    const createdTask = await tx.task.create({
      data: taskData,
    });
    // #region agent log
    const logAfterCreate = {location:'tasks.ts:203',message:'Task created successfully',data:{taskId:createdTask.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'};
    console.log('[DEBUG]', JSON.stringify(logAfterCreate));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logAfterCreate)}).catch(()=>{});
    // #endregion
    // #region agent log
    const logBeforeStages = {location:'tasks.ts:225',message:'Before creating task stages',data:{taskId:createdTask.id,stageCount:stageTemplates.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
    console.log('[DEBUG]', JSON.stringify(logBeforeStages));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logBeforeStages)}).catch(()=>{});
    // #endregion
    
    await tx.taskStage.createMany({
      data: stageTemplates.map((name, idx) => ({
        taskId: createdTask.id,
        name,
        stageOrder: idx + 1,
      })),
    });
    
    // #region agent log
    const logAfterStages = {location:'tasks.ts:235',message:'Task stages created successfully',data:{taskId:createdTask.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
    console.log('[DEBUG]', JSON.stringify(logAfterStages));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logAfterStages)}).catch(()=>{});
    // #endregion
    
    return createdTask;
  });

    res.status(201).json(task);
  } catch (error: any) {
    // #region agent log
    const logError = {location:'tasks.ts:215',message:'Error caught',data:{errorMessage:error?.message,errorName:error?.name,errorCode:error?.code,prismaError:error?.meta,prismaClientVersion:error?.clientVersion,errorStack:error instanceof Error?error.stack:'No stack'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'};
    console.log('[DEBUG ERROR]', JSON.stringify(logError, null, 2));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logError)}).catch(()=>{});
    // #endregion
    console.error('Error creating task:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ 
      error: 'Xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const task = await prisma.task.findUnique({
    where: { id },
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
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      stages: { 
        orderBy: { stageOrder: 'asc' },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      errors: true,
      transactions: true,
    },
  });
  if (!task) return res.status(404).json({ error: 'Not found' });
  
  // Calculate net profit: Kelishuv summasi - Filial bo'yicha davlat to'lovlari
  // Task yaratilgan vaqtdagi snapshot'lardan foydalanamiz
  // Agar snapshot bo'sh bo'lsa, task yaratilgan vaqtdagi davlat to'lovlarini history'dan topamiz
  // Agar PSR bor bo'lsa kelishuv summasiga 10 qo'shamiz va PSR narxini hisobga olamiz
  let netProfit = null;
  try {
    // Kelishuv summasini olish (snapshot yoki joriy qiymat)
    const dealAmount = task.snapshotDealAmount ? Number(task.snapshotDealAmount) : Number(task.client.dealAmount || 0);
    
    // Davlat to'lovlarini olish
    let certificatePayment: number;
    let psrPrice: number;
    let workerPrice: number;
    let customsPayment: number;

    // Agar snapshot'lar mavjud bo'lsa, ulardan foydalanamiz
    if (task.snapshotCertificatePayment !== null && task.snapshotCertificatePayment !== undefined) {
      certificatePayment = Number(task.snapshotCertificatePayment);
      psrPrice = Number(task.snapshotPsrPrice || 0);
      workerPrice = Number(task.snapshotWorkerPrice || 0);
      customsPayment = Number(task.snapshotCustomsPayment || 0);
    } else {
      // Snapshot bo'sh bo'lsa, task yaratilgan vaqtdan oldin yaratilgan eng so'nggi davlat to'lovini topamiz
      const taskCreatedAt = new Date(task.createdAt);
      const statePayment = await prisma.statePayment.findFirst({
        where: {
          branchId: task.branchId,
          createdAt: { lte: taskCreatedAt }, // Task yaratilgunga qadar yaratilgan davlat to'lovlari
        },
        orderBy: {
          createdAt: 'desc', // Eng so'nggi davlat to'lovi
        },
      });

      if (statePayment) {
        certificatePayment = Number(statePayment.certificatePayment);
        psrPrice = Number(statePayment.psrPrice);
        workerPrice = Number(statePayment.workerPrice);
        customsPayment = Number(statePayment.customsPayment);
      } else {
        // StatePayment yo'q bo'lsa, 0 qaytaramiz
        certificatePayment = 0;
        psrPrice = 0;
        workerPrice = 0;
        customsPayment = 0;
      }
    }

    let finalDealAmount = dealAmount;
    
    // Agar PSR bor bo'lsa, kelishuv summasiga 10 qo'shamiz
    if (task.hasPsr) {
      finalDealAmount += 10;
    }
    
    // Asosiy to'lovlar: Sertifikat + Ishchi + Bojxona
    let totalPayments = certificatePayment + workerPrice + customsPayment;
    
    // Agar PSR bor bo'lsa, PSR narxini qo'shamiz
    if (task.hasPsr) {
      totalPayments += psrPrice;
    }
    
    netProfit = (finalDealAmount - totalPayments) as any;
  } catch (error) {
    console.error('Error calculating net profit:', error);
  }
  
  // Calculate admin earned amount from stages
  let adminEarnedAmount = 0;
  try {
    const STAGE_PERCENTAGES: Record<string, number> = {
      'Invoys': 20,
      'Zayavka': 10,
      'TIR-SMR': 10,
      'ST': 5,
      'FITO': 5,
      'Deklaratsiya': 15,
      'Tekshirish': 15,
      'Topshirish': 10,
      'Pochta': 10,
    };
    
    // Get workerPrice from snapshot or state payment
    let workerPrice = 0;
    if (task.snapshotWorkerPrice !== null && task.snapshotWorkerPrice !== undefined) {
      workerPrice = Number(task.snapshotWorkerPrice);
    } else {
      const taskCreatedAt = new Date(task.createdAt);
      const statePayment = await prisma.statePayment.findFirst({
        where: {
          branchId: task.branchId,
          createdAt: { lte: taskCreatedAt },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      if (statePayment) {
        workerPrice = Number(statePayment.workerPrice);
      }
    }
    
    // Calculate admin earned amount from completed stages assigned to ADMIN
    for (const stage of task.stages) {
      if (stage.status === 'TAYYOR' && stage.assignedTo?.role === 'ADMIN') {
        let stageName = stage.name;
        // Normalize stage names
        if (stageName === 'Xujjat_tekshirish' || stageName === 'Xujjat tekshirish' || stageName === 'Tekshirish') {
          stageName = 'Tekshirish';
        } else if (stageName === 'Xujjat_topshirish' || stageName === 'Xujjat topshirish' || stageName === 'Topshirish') {
          stageName = 'Topshirish';
        } else if (stageName === 'Fito' || stageName === 'FITO') {
          stageName = 'FITO';
        }
        
        const percentage = STAGE_PERCENTAGES[stageName] || 0;
        const earnedForThisStage = (workerPrice * percentage) / 100;
        adminEarnedAmount += earnedForThisStage;
      }
    }
  } catch (error) {
    console.error('Error calculating admin earned amount:', error);
  }
  
  res.json({
    ...task,
    netProfit, // Sof foyda (faqat ADMIN uchun ko'rsatiladi)
    adminEarnedAmount, // Admin ishlab topgan pul
  });
});

// Get task versions
router.get('/:id/versions', async (req, res) => {
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
  customsPaymentMultiplier: z.number().min(0.5).max(4).optional(), // BXM multiplier for Deklaratsiya (0.5 to 4)
});

router.patch('/:taskId/stages/:stageId', async (req: AuthRequest, res) => {
  const taskId = Number(req.params.taskId);
  const stageId = Number(req.params.stageId);
  const parsed = updateStageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

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

  // Agar jarayonni tugallanmagan (BOSHLANMAGAN) qilishga harakat qilinayotgan bo'lsa,
  // faqat jarayonni boshlagan odam yoki admin buni qila oladi
  if (parsed.data.status === 'BOSHLANMAGAN' && stage.status === 'TAYYOR') {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const isAdmin = req.user.role === 'ADMIN';
    const isStageOwner = stage.assignedToId === req.user.id;

    if (!isAdmin && !isStageOwner) {
      return res.status(403).json({ 
        error: 'Faqat jarayonni boshlagan odam yoki admin jarayonni tugallanmagan qilishi mumkin' 
      });
    }
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    // If Deklaratsiya stage is being started and multiplier is provided, update task's customs payment
    if (stage.name === 'Deklaratsiya' && parsed.data.status === 'TAYYOR' && parsed.data.customsPaymentMultiplier) {
      const currentYear = new Date().getFullYear();
      const bxmConfig = await (tx as any).bXMConfig.findUnique({
        where: { year: currentYear },
      });
      const bxmAmount = bxmConfig ? Number(bxmConfig.amount) : 34.4; // Default BXM
      const calculatedCustomsPayment = bxmAmount * parsed.data.customsPaymentMultiplier;
      
      await (tx as any).task.update({
        where: { id: taskId },
        data: {
          customsPaymentMultiplier: parsed.data.customsPaymentMultiplier,
          snapshotCustomsPayment: calculatedCustomsPayment,
        },
      });
    }
    
    const upd = await (tx as any).taskStage.update({
      where: { id: stageId },
      data: {
        status: parsed.data.status,
        completedAt: parsed.data.status === 'TAYYOR' ? now : null,
        startedAt: parsed.data.status === 'TAYYOR' && !stage.startedAt ? now : stage.startedAt,
        assignedToId: parsed.data.status === 'TAYYOR' ? req.user?.id : stage.assignedToId,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create version for stage change
    if (req.user && stage.status !== parsed.data.status) {
      await createTaskVersion(tx, taskId, req.user.id, 'STAGE', {
        id: upd.id,
        name: upd.name,
        status: upd.status,
        assignedTo: upd.assignedTo,
      });
    }

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

  // Create error and deduct from worker's earned amount using transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the error record
      const error = await (tx as any).taskError.create({
      data: {
        taskId,
        stageName: parsed.data.stageName,
        workerId: parsed.data.workerId,
        amount: parsed.data.amount,
        comment: parsed.data.comment,
        date: parsed.data.date,
      },
      include: {
        worker: { select: { id: true, name: true } },
      },
    });

    // Create a negative KPI log entry to deduct from worker's earned amount
    // This will be reflected in their totalReceived calculation
      await (tx as any).kpiLog.create({
      data: {
        userId: parsed.data.workerId,
        taskId: taskId,
        stageName: parsed.data.stageName,
        amount: -parsed.data.amount, // Negative amount to deduct
      },
    });

    return error;
  });

  res.status(201).json(result);
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

// Helper function to create task version
async function createTaskVersion(tx: any, taskId: number, changedBy: number, changeType: 'TASK' | 'STAGE' = 'TASK', stageInfo?: any) {
  // Get current version number
  const lastVersion = await tx.taskVersion.findFirst({
    where: { taskId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (lastVersion?.version || 0) + 1;

  // Get current task data
  const task = await tx.task.findUnique({ 
    where: { id: taskId },
    include: {
      stages: {
        orderBy: { stageOrder: 'asc' },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  if (!task) return;

  // Detect changes
  const changes: any = {
    changeType,
  };
  
  if (changeType === 'TASK') {
    // Task field changes
    if (task.title) changes.title = task.title;
    if (task.status) changes.status = task.status;
    if (task.comments) changes.comments = task.comments;
    if (task.hasPsr !== undefined) changes.hasPsr = task.hasPsr;
    if (task.driverPhone) changes.driverPhone = task.driverPhone;
  } else if (changeType === 'STAGE' && stageInfo) {
    // Stage changes
    changes.stage = {
      id: stageInfo.id,
      name: stageInfo.name,
      status: stageInfo.status,
      assignedTo: stageInfo.assignedTo ? {
        id: stageInfo.assignedTo.id,
        name: stageInfo.assignedTo.name,
      } : null,
    };
  }

  // Include all stages in the version
  const stagesData = task.stages.map((stage: any) => ({
    id: stage.id,
    name: stage.name,
    status: stage.status,
    stageOrder: stage.stageOrder,
    assignedTo: stage.assignedTo ? {
      id: stage.assignedTo.id,
      name: stage.assignedTo.name,
    } : null,
    startedAt: stage.startedAt,
    completedAt: stage.completedAt,
  }));

  // Create version
  await tx.taskVersion.create({
    data: {
      taskId,
      version: nextVersion,
      title: task.title,
      status: task.status,
      comments: task.comments || null,
      hasPsr: task.hasPsr,
      driverPhone: task.driverPhone || null,
      clientId: task.clientId,
      branchId: task.branchId,
      changedBy,
      changes: {
        ...changes,
        stages: stagesData,
      } as any,
    },
  });
}

router.patch('/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Check if there are actual changes
  const hasChanges = 
    (parsed.data.title && parsed.data.title !== task.title) ||
    (parsed.data.clientId && parsed.data.clientId !== task.clientId) ||
    (parsed.data.branchId && parsed.data.branchId !== task.branchId) ||
    (parsed.data.comments !== undefined && parsed.data.comments !== task.comments) ||
    (parsed.data.hasPsr !== undefined && parsed.data.hasPsr !== task.hasPsr) ||
    (parsed.data.driverPhone !== undefined && parsed.data.driverPhone !== task.driverPhone);

  const updated = await prisma.$transaction(async (tx) => {
    // Create version before update if there are changes
    if (hasChanges && req.user) {
      await createTaskVersion(tx, id, req.user.id);
    }

    const updatedTask = await (tx as any).task.update({
      where: { id },
      data: {
        ...(parsed.data.title && { title: parsed.data.title }),
        ...(parsed.data.clientId && { clientId: parsed.data.clientId }),
        ...(parsed.data.branchId && { branchId: parsed.data.branchId }),
        ...(parsed.data.comments !== undefined && { comments: parsed.data.comments || null }),
        ...(parsed.data.hasPsr !== undefined && { hasPsr: parsed.data.hasPsr }),
        ...(parsed.data.driverPhone !== undefined && { driverPhone: parsed.data.driverPhone || null }),
        ...(hasChanges && req.user && { updatedById: req.user.id }),
      },
    });

    return updatedTask;
  });

  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  await prisma.$transaction(async (tx) => {
    await (tx as any).taskError.deleteMany({ where: { taskId: id } });
    await (tx as any).taskStage.deleteMany({ where: { taskId: id } });
    await (tx as any).kpiLog.deleteMany({ where: { taskId: id } });
    await (tx as any).transaction.deleteMany({ where: { taskId: id } });
    await (tx as any).task.delete({ where: { id } });
  });

  res.status(204).send();
});

export default router;

