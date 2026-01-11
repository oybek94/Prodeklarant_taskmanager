import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { computeDurations } from '../services/stage-duration';
import { logKpiForStage } from '../services/kpi';
import { updateTaskStatus, calculateTaskStatus, generateQrTokenIfNeeded } from '../services/task-status';
import { TaskStatus, Currency, ExchangeSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ValidationService } from '../services/validation.service';
import { getExchangeRate } from '../services/exchange-rate';
import { calculateAmountUzs } from '../services/monetary-validation';
import fs from 'fs/promises';

const router = Router();

// Helper function for debug logging
const getDebugLogPath = () => {
  if (process.platform === 'win32') {
    return 'g:\\Prodeklarant\\.cursor\\debug.log';
  }
  // Linux server path
  return '/var/www/app/.cursor/debug.log';
};

const debugLog = (data: any) => {
  const logEntry = JSON.stringify(data) + '\n';
  const logPath = getDebugLogPath();
  // Write to file (async, but we don't await to avoid blocking)
  fs.appendFile(logPath, logEntry).catch((err) => {
    // If file doesn't exist, create it first
    if (err.code === 'ENOENT') {
      fs.writeFile(logPath, logEntry).catch(() => {});
    }
  });
  // Also log to console for immediate visibility
  console.log('[DEBUG]', logEntry.trim());
};

// Helper function to calculate task status from stages array (optimized version)
function calculateTaskStatusFromStages(stages: Array<{name: string, status: string}>): TaskStatus {
  if (stages.length === 0) {
    return TaskStatus.BOSHLANMAGAN;
  }

  // Create a map of stage names to status
  const stageMap = new Map(stages.map(s => [s.name, s.status]));
  
  // Helper function to check if stage is TAYYOR
  const isReady = (name: string): boolean => {
    return stageMap.get(name) === 'TAYYOR';
  };

  // 1. Check if all stages are blank (BOSHLANMAGAN)
  const allBlank = stages.every(s => s.status === 'BOSHLANMAGAN');
  if (allBlank) {
    return TaskStatus.BOSHLANMAGAN;
  }

  // Priority order based on formula (check from highest to lowest priority):
  // 5. Pochta = TAYYOR → YAKUNLANDI
  if (isReady('Pochta')) {
    return TaskStatus.YAKUNLANDI;
  }

  // 4. Topshirish = TAYYOR → TOPSHIRILDI
  if (isReady('Topshirish')) {
    return TaskStatus.TOPSHIRILDI;
  }

  // 3. Tekshirish = TAYYOR → TEKSHIRILGAN
  if (isReady('Tekshirish')) {
    return TaskStatus.TEKSHIRILGAN;
  }

  // 2. Deklaratsiya = TAYYOR → TAYYOR
  if (isReady('Deklaratsiya')) {
    return TaskStatus.TAYYOR;
  }

  // 6. Invoys, Zayavka, TIR-SMR, Sertifikat olib chiqish TAYYOR → JARAYONDA
  const earlyStages = ['Invoys', 'Zayavka', 'TIR-SMR', 'Sertifikat olib chiqish', 'ST', 'Fito', 'FITO']; // ST va Fito backward compatibility uchun
  const hasEarlyStageReady = earlyStages.some(name => isReady(name));
  if (hasEarlyStageReady) {
    return TaskStatus.JARAYONDA;
  }

  // If any other stage is TAYYOR, also return JARAYONDA
  const hasAnyReady = stages.some(s => s.status === 'TAYYOR');
  if (hasAnyReady) {
    return TaskStatus.JARAYONDA;
  }

  // Otherwise -> BOSHLANMAGAN
  return TaskStatus.BOSHLANMAGAN;
}

const stageTemplates = [
  'Invoys',
  'Zayavka',
  'TIR-SMR',
  'Sertifikat olib chiqish',
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
    const { branchId, status, clientId, page, limit } = req.query;
    const where: any = {};
    
    // Pagination parametrlari
    const pageNum = page ? parseInt(page as string, 10) : undefined;
    const limitNum = limit ? parseInt(limit as string, 10) : undefined;
    const skip = pageNum && limitNum ? (pageNum - 1) * limitNum : undefined;
    const take = limitNum || undefined;
    
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
    
    // Pagination bilan tasklarni olish
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
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
          // Stages include o'chirildi - lazy load uchun
      },
      orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      // Backward compatibility: agar pagination yo'q bo'lsa, count qilmaymiz
      pageNum && limitNum ? prisma.task.count({ where }) : Promise.resolve(0),
    ]);
    
    // Calculate and update status for each task using the new formula
    // NOTE: We only recalculate if status filter is not set, to avoid overriding user's filter
    // If status filter is set, we trust the database value
    if (!status && tasks.length > 0) {
      // Only recalculate if no status filter is applied
      // Optimize: Get all stages for all tasks in one query
      const taskIds = tasks.map(t => t.id);
      const allStages = await prisma.taskStage.findMany({
        where: { taskId: { in: taskIds } },
        select: { taskId: true, name: true, status: true },
      });
      
      // Group stages by taskId
      const stagesByTask = new Map<number, Array<{name: string, status: string}>>();
      for (const stage of allStages) {
        if (!stagesByTask.has(stage.taskId)) {
          stagesByTask.set(stage.taskId, []);
        }
        stagesByTask.get(stage.taskId)!.push({ name: stage.name, status: stage.status });
      }
      
      // Calculate status for each task
      const updates: Array<{id: number, status: TaskStatus}> = [];
      for (const task of tasks) {
        const stages = stagesByTask.get(task.id) || [];
        const calculatedStatus = await calculateTaskStatusFromStages(stages);
        
        // Update task object for response
        (task as any).status = calculatedStatus;
        
        // Collect updates to batch them
        if (task.status !== calculatedStatus) {
          updates.push({ id: task.id, status: calculatedStatus });
        }
      }
      
      // Batch update all tasks with new status
      if (updates.length > 0) {
        await Promise.all(updates.map(update => 
          prisma.task.update({
            where: { id: update.id },
            data: { status: update.status },
          })
        ));
      }
    } else {
      // If status filter is set, use database status directly
      // This ensures that when user filters by YAKUNLANDI, they get YAKUNLANDI tasks
      for (const task of tasks) {
        (task as any).status = task.status;
      }
    }
    
    // Backward compatibility: agar pagination parametrlari yo'q bo'lsa, eski format qaytariladi
    if (pageNum && limitNum && total > 0) {
      res.json({
        tasks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } else {
      // Eski format - barcha tasklar
    res.json(tasks);
    }
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

    // Get full client data for currency information
    const fullClient = await tx.client.findUnique({
      where: { id: parsed.data.clientId },
      select: {
        dealAmount: true,
        dealAmountCurrency: true,
        dealAmountExchangeRate: true,
        dealAmount_amount_original: true,
        dealAmount_currency: true,
        dealAmount_exchange_rate: true,
        dealAmount_amount_uzs: true,
        dealAmount_exchange_source: true,
      },
    });

    let snapshotDealAmount = fullClient?.dealAmount ? Number(fullClient.dealAmount) : null;
    let snapshotDealAmountExchangeRate: Decimal | null = null;
    let snapshotCertificatePayment = null;
    let snapshotCertificatePaymentExchangeRate: Decimal | null = null;
    let snapshotPsrPrice = null;
    let snapshotPsrPriceExchangeRate: Decimal | null = null;
    let snapshotWorkerPrice = null;
    let snapshotWorkerPriceExchangeRate: Decimal | null = null;
    let snapshotCustomsPayment = null;
    let snapshotCustomsPaymentExchangeRate: Decimal | null = null;

    // Capture exchange rates for deal amount and populate universal fields
    let snapshotDealAmountAmountUzs: number | null = null;
    let snapshotDealAmountCurrency: Currency | null = null;
    let snapshotDealAmountExchangeRateValue: Decimal | null = null;
    let snapshotDealAmountExchangeSource: ExchangeSource = 'CBU';

    if (snapshotDealAmount && fullClient) {
      // Use universal fields if available, fallback to old fields
      const currency: Currency = fullClient.dealAmount_currency || fullClient.dealAmountCurrency || 'USD';
      snapshotDealAmountCurrency = currency;
      
      if (currency === 'USD') {
        if (fullClient.dealAmount_exchange_rate) {
          snapshotDealAmountExchangeRateValue = new Decimal(fullClient.dealAmount_exchange_rate);
          snapshotDealAmountExchangeRate = snapshotDealAmountExchangeRateValue;
        } else if (fullClient.dealAmountExchangeRate) {
          snapshotDealAmountExchangeRateValue = new Decimal(fullClient.dealAmountExchangeRate);
          snapshotDealAmountExchangeRate = snapshotDealAmountExchangeRateValue;
        } else {
          try {
            const rate = await getExchangeRate(taskCreatedAt, 'USD', 'UZS', tx);
            snapshotDealAmountExchangeRateValue = rate;
            snapshotDealAmountExchangeRate = rate;
          } catch (error) {
            console.error('Failed to get exchange rate for deal amount snapshot:', error);
            snapshotDealAmountExchangeRateValue = new Decimal(1);
            snapshotDealAmountExchangeRate = new Decimal(1);
          }
        }
        snapshotDealAmountAmountUzs = Number(calculateAmountUzs(snapshotDealAmount, currency, snapshotDealAmountExchangeRateValue));
      } else {
        // UZS currency - exchange rate is always 1
        snapshotDealAmountExchangeRateValue = new Decimal(1);
        snapshotDealAmountExchangeRate = new Decimal(1);
        snapshotDealAmountAmountUzs = snapshotDealAmount;
      }
      snapshotDealAmountExchangeSource = fullClient.dealAmount_exchange_source || 'CBU';
    }

    if (statePayment) {
      // Task yaratilgan vaqtdan oldin yaratilgan eng so'nggi davlat to'lovidan foydalanamiz
      // State payments are always in UZS (rule 5), so exchange rate is always 1
      snapshotCertificatePayment = Number(statePayment.certificatePayment) as any;
      snapshotCertificatePaymentExchangeRate = new Decimal(1);
      snapshotPsrPrice = Number(statePayment.psrPrice) as any;
      snapshotPsrPriceExchangeRate = new Decimal(1);
      snapshotWorkerPrice = Number(statePayment.workerPrice) as any;
      snapshotWorkerPriceExchangeRate = new Decimal(1);
      snapshotCustomsPayment = Number(statePayment.customsPayment) as any;
      snapshotCustomsPaymentExchangeRate = new Decimal(1);
    }

    // Prisma data object - faqat mavjud field'larni qo'shamiz
    const taskData: any = {
      clientId: parsed.data.clientId,
      branchId: parsed.data.branchId,
      title: parsed.data.title,
      hasPsr: parsed.data.hasPsr,
      createdById: req.user?.id,
    };

    // Optional field'larni qo'shamiz - faqat mavjud va null bo'lmagan qiymatlarni
    if (parsed.data.comments !== undefined && parsed.data.comments !== null && parsed.data.comments !== '') {
      taskData.comments = parsed.data.comments;
    }
    if (parsed.data.driverPhone !== undefined && parsed.data.driverPhone !== null && parsed.data.driverPhone !== '') {
      taskData.driverPhone = parsed.data.driverPhone;
    }
    // Decimal field'lar uchun - faqat mavjud va null bo'lmagan qiymatlarni (Prisma number qabul qiladi)
    // Keep old fields for backward compatibility
    if (snapshotDealAmount != null) {
      taskData.snapshotDealAmount = snapshotDealAmount;
    }
    if (snapshotDealAmountExchangeRate != null) {
      taskData.snapshotDealAmountExchangeRate = snapshotDealAmountExchangeRate;
    }
    if (snapshotCertificatePayment != null) {
      taskData.snapshotCertificatePayment = snapshotCertificatePayment;
      taskData.snapshotCertificatePaymentExchangeRate = snapshotCertificatePaymentExchangeRate;
    }
    if (snapshotPsrPrice != null) {
      taskData.snapshotPsrPrice = snapshotPsrPrice;
      taskData.snapshotPsrPriceExchangeRate = snapshotPsrPriceExchangeRate;
    }
    if (snapshotWorkerPrice != null) {
      taskData.snapshotWorkerPrice = snapshotWorkerPrice;
      taskData.snapshotWorkerPriceExchangeRate = snapshotWorkerPriceExchangeRate;
    }
    if (snapshotCustomsPayment != null) {
      taskData.snapshotCustomsPayment = snapshotCustomsPayment;
      taskData.snapshotCustomsPaymentExchangeRate = snapshotCustomsPaymentExchangeRate;
    }
    
    // Universal monetary fields for snapshots
    if (snapshotDealAmount != null && snapshotDealAmountCurrency && snapshotDealAmountExchangeRateValue) {
      taskData.snapshotDealAmount_amount_original = snapshotDealAmount;
      taskData.snapshotDealAmount_currency = snapshotDealAmountCurrency;
      taskData.snapshotDealAmount_exchange_rate = Number(snapshotDealAmountExchangeRateValue);
      taskData.snapshotDealAmount_amount_uzs = snapshotDealAmountAmountUzs;
      taskData.snapshotDealAmount_exchange_source = snapshotDealAmountExchangeSource;
    }
    
    if (snapshotCertificatePayment != null) {
      taskData.snapshotCertificatePayment_amount_original = snapshotCertificatePayment;
      taskData.snapshotCertificatePayment_currency = 'UZS';
      taskData.snapshotCertificatePayment_exchange_rate = 1;
      taskData.snapshotCertificatePayment_amount_uzs = snapshotCertificatePayment;
      taskData.snapshotCertificatePayment_exchange_source = 'CBU';
    }
    
    if (snapshotPsrPrice != null) {
      taskData.snapshotPsrPrice_amount_original = snapshotPsrPrice;
      taskData.snapshotPsrPrice_currency = 'UZS';
      taskData.snapshotPsrPrice_exchange_rate = 1;
      taskData.snapshotPsrPrice_amount_uzs = snapshotPsrPrice;
      taskData.snapshotPsrPrice_exchange_source = 'CBU';
    }
    
    if (snapshotWorkerPrice != null) {
      taskData.snapshotWorkerPrice_amount_original = snapshotWorkerPrice;
      taskData.snapshotWorkerPrice_currency = 'UZS';
      taskData.snapshotWorkerPrice_exchange_rate = 1;
      taskData.snapshotWorkerPrice_amount_uzs = snapshotWorkerPrice;
      taskData.snapshotWorkerPrice_exchange_source = 'CBU';
    }
    
    if (snapshotCustomsPayment != null) {
      taskData.snapshotCustomsPayment_amount_original = snapshotCustomsPayment;
      taskData.snapshotCustomsPayment_currency = 'UZS';
      taskData.snapshotCustomsPayment_exchange_rate = 1;
      taskData.snapshotCustomsPayment_amount_uzs = snapshotCustomsPayment;
      taskData.snapshotCustomsPayment_exchange_source = 'CBU';
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
  // ALL CALCULATIONS MUST BE IN UZS (accounting base currency)
  // Task yaratilgan vaqtdagi snapshot'lardan foydalanamiz
  // Agar snapshot bo'sh bo'lsa, task yaratilgan vaqtdagi davlat to'lovlarini history'dan topamiz
  // Agar PSR bor bo'lsa kelishuv summasiga 10 qo'shamiz va PSR narxini hisobga olamiz
  let netProfit = null;
  try {
    // Get deal amount - use amount_uzs from universal fields
    let dealAmountInUzs: number = 0;
    if (task.snapshotDealAmount_amount_uzs) {
      // Use universal field if available
      dealAmountInUzs = Number(task.snapshotDealAmount_amount_uzs);
    } else if (task.snapshotDealAmount) {
      // Fallback to old field - convert if needed
      const clientDealCurrency = task.client.dealAmount_currency || task.client.dealAmountCurrency || 'USD';
      if (clientDealCurrency === 'USD' && task.snapshotDealAmount_exchange_rate) {
        // Convert USD to UZS using snapshot exchange rate
        dealAmountInUzs = Number(task.snapshotDealAmount) * Number(task.snapshotDealAmount_exchange_rate);
      } else if (clientDealCurrency === 'USD' && task.snapshotDealAmountExchangeRate) {
        // Fallback to old exchange rate field
        dealAmountInUzs = Number(task.snapshotDealAmount) * Number(task.snapshotDealAmountExchangeRate);
      } else {
        // Already in UZS or no exchange rate (assume UZS)
        dealAmountInUzs = Number(task.snapshotDealAmount);
      }
    } else if (task.client.dealAmount_amount_uzs) {
      // Use client's universal field
      dealAmountInUzs = Number(task.client.dealAmount_amount_uzs);
    } else if (task.client.dealAmount) {
      // Fallback to old client fields
      const clientDealCurrency = task.client.dealAmount_currency || task.client.dealAmountCurrency || 'USD';
      const clientDealAmount = Number(task.client.dealAmount);
      
      if (clientDealCurrency === 'USD' && task.client.dealAmount_exchange_rate) {
        // Use universal exchange rate
        dealAmountInUzs = clientDealAmount * Number(task.client.dealAmount_exchange_rate);
      } else if (clientDealCurrency === 'USD' && task.client.dealAmountExchangeRate) {
        // Fallback to old exchange rate
        dealAmountInUzs = clientDealAmount * Number(task.client.dealAmountExchangeRate);
      } else if (clientDealCurrency === 'USD') {
        // Need to fetch historical rate for task creation date
        const taskCreatedAt = new Date(task.createdAt);
        try {
          const exchangeRate = await getExchangeRate(taskCreatedAt, 'USD', 'UZS');
          dealAmountInUzs = clientDealAmount * Number(exchangeRate);
        } catch (error) {
          console.error('Failed to get historical exchange rate for deal amount:', error);
          dealAmountInUzs = clientDealAmount; // Fallback: assume already in UZS
        }
      } else {
        // Already in UZS
        dealAmountInUzs = clientDealAmount;
      }
    }
    
    // Davlat to'lovlarini olish (always in UZS per rule 5)
    let certificatePayment: number;
    let psrPrice: number;
    let workerPrice: number;
    let customsPayment: number;

    // Agar snapshot'lar mavjud bo'lsa, ulardan foydalanamiz (all in UZS)
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
        // State payments are always in UZS (rule 5)
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

    // Add PSR amount (10 USD converted to UZS if deal was in USD)
    // Use exchange rate from snapshot universal fields
    let psrAmountInUzs = 0;
    if (task.hasPsr) {
      const clientDealCurrency = task.client.dealAmount_currency || task.client.dealAmountCurrency || 'USD';
      if (clientDealCurrency === 'USD') {
        // 10 USD - need to convert using snapshot exchange rate
        let psrExchangeRate: Decimal = new Decimal(1);
        if (task.snapshotDealAmount_exchange_rate) {
          psrExchangeRate = new Decimal(task.snapshotDealAmount_exchange_rate);
        } else if (task.snapshotDealAmountExchangeRate) {
          psrExchangeRate = new Decimal(task.snapshotDealAmountExchangeRate);
        } else if (task.client.dealAmount_exchange_rate) {
          psrExchangeRate = new Decimal(task.client.dealAmount_exchange_rate);
        } else if (task.client.dealAmountExchangeRate) {
          psrExchangeRate = new Decimal(task.client.dealAmountExchangeRate);
        } else {
          // Fetch historical rate
          const taskCreatedAt = new Date(task.createdAt);
          try {
            psrExchangeRate = await getExchangeRate(taskCreatedAt, 'USD', 'UZS');
          } catch (error) {
            console.error('Failed to get exchange rate for PSR amount:', error);
            psrExchangeRate = new Decimal(1); // Fallback
          }
        }
        psrAmountInUzs = Number(calculateAmountUzs(10, 'USD', psrExchangeRate));
      } else {
        // Already in UZS
        psrAmountInUzs = 10;
      }
    }
    
    const finalDealAmountInUzs = dealAmountInUzs + psrAmountInUzs;
    
    // Asosiy to'lovlar: Sertifikat + Ishchi + Bojxona (all in UZS)
    let totalPaymentsInUzs = certificatePayment + workerPrice + customsPayment;
    
    // Agar PSR bor bo'lsa, PSR narxini qo'shamiz (in UZS)
    if (task.hasPsr) {
      totalPaymentsInUzs += psrPrice;
    }
    
    // Calculate net profit in UZS
    netProfit = (finalDealAmountInUzs - totalPaymentsInUzs) as any;
  } catch (error) {
    console.error('Error calculating net profit:', error);
  }
  
  // Calculate admin earned amount from stages
  // Amount must be in UZS (accounting base currency)
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
    
    // Get workerPrice from snapshot or state payment (always in UZS per rule 5)
    // Use amount_uzs from universal fields
    let workerPriceInUzs = 0;
    if (task.snapshotWorkerPrice_amount_uzs !== null && task.snapshotWorkerPrice_amount_uzs !== undefined) {
      // Use universal field
      workerPriceInUzs = Number(task.snapshotWorkerPrice_amount_uzs);
    } else if (task.snapshotWorkerPrice !== null && task.snapshotWorkerPrice !== undefined) {
      // Fallback to old field
      workerPriceInUzs = Number(task.snapshotWorkerPrice);
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
        // State payments are always in UZS
        workerPriceInUzs = Number(statePayment.workerPrice);
      }
    }
    
    // Calculate admin earned amount from completed stages assigned to ADMIN (in UZS)
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
        const earnedForThisStage = (workerPriceInUzs * percentage) / 100;
        adminEarnedAmount += earnedForThisStage;
      }
    }
  } catch (error) {
    console.error('Error calculating admin earned amount:', error);
  }
  
  // Get KPI logs for this task (for worker earnings display)
  const kpiLogs = await prisma.kpiLog.findMany({
    where: { taskId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
  
  // Calculate exchange rate information for profit calculation
  let exchangeRateInfo: { rate: number; source: string; date: Date } | null = null;
  if (task.snapshotDealAmount_exchange_rate) {
    exchangeRateInfo = {
      rate: Number(task.snapshotDealAmount_exchange_rate),
      source: task.snapshotDealAmount_exchange_source || 'CBU',
      date: task.createdAt,
    };
  }

  // Generate operational view (USD equivalent)
  let operationalProfit: number | null = null;
  if (netProfit !== null) {
    // For operational view, convert UZS profit to USD using current rate
    try {
      const currentUsdToUzsRate = await getExchangeRate(new Date(), 'USD', 'UZS');
      operationalProfit = Number(netProfit) / Number(currentUsdToUzsRate);
    } catch (error) {
      console.error('Error calculating operational profit:', error);
      operationalProfit = null;
    }
  }

  res.json({
    ...task,
    netProfit, // Sof foyda (UZS - accounting view)
    operationalProfit, // Sof foyda (USD equivalent - operational view)
    adminEarnedAmount, // Admin ishlab topgan pul (UZS)
    exchangeRateInfo, // Exchange rate used for deal amount conversion
    kpiLogs: kpiLogs.map((log: any) => ({
      id: log.id,
      stageName: log.stageName,
      amount: log.amount,
      userId: log.userId,
      user: log.user,
      createdAt: log.createdAt,
    })),
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
  customsPaymentMultiplier: z.coerce.number().min(0.5).max(4).optional(), // BXM multiplier for Deklaratsiya (0.5 to 4)
  skipValidation: z.boolean().optional(), // Skip document validation for ST stage
});

router.patch('/:taskId/stages/:stageId', requireAuth(), async (req: AuthRequest, res) => {
  // #region agent log
  debugLog({location:'tasks.ts:484',message:'PATCH stage entry',data:{taskId:req.params.taskId,stageId:req.params.stageId,body:req.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
  const taskId = Number(req.params.taskId);
  const stageId = Number(req.params.stageId);
  const parsed = updateStageSchema.safeParse(req.body);
  // #region agent log
  debugLog({location:'tasks.ts:490',message:'Schema validation result',data:{success:parsed.success,errors:parsed.success?null:parsed.error.flatten()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
  // #endregion
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
    // #region agent log
    debugLog({location:'tasks.ts:540',message:'Stage found',data:{stageFound:!!stage,stageId,stageName:stage?.name,stageStatus:stage?.status,stageTaskId:stage?.taskId,taskId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
    // #endregion
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

    // Only the person who completed the stage can change its status (ADMIN ham o'zgartira olmaydi)
    if (stage.status === 'TAYYOR' && parsed.data.status !== 'TAYYOR') {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const isStageOwner = stage.assignedToId === req.user.id;

      if (!isStageOwner) {
        return res.status(403).json({ 
          error: 'Faqat jarayonni tayyor qilgan odam jarayon statusini o\'zgartirishi mumkin' 
        });
    }
  }

  // Agar jarayonni tugallanmagan (BOSHLANMAGAN) qilishga harakat qilinayotgan bo'lsa,
  // faqat jarayonni tayyor qilgan odam buni qila oladi (ADMIN ham emas)
  if (parsed.data.status === 'BOSHLANMAGAN' && stage.status === 'TAYYOR') {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const isStageOwner = stage.assignedToId === req.user.id;

    if (!isStageOwner) {
      return res.status(403).json({ 
        error: 'Faqat jarayonni tayyor qilgan odam jarayonni tugallanmagan qilishi mumkin' 
      });
    }
  }

  const now = new Date();
  // #region agent log
  debugLog({location:'tasks.ts:758',message:'Before transaction',data:{taskId,stageId,newStatus:parsed.data.status,stageName:stage.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'});
  // #endregion
  const updated = await prisma.$transaction(async (tx) => {
    // If Deklaratsiya stage is being started and multiplier is provided, update task's customs payment
    if (stage.name === 'Deklaratsiya' && parsed.data.status === 'TAYYOR' && parsed.data.customsPaymentMultiplier) {
      const currentYear = new Date().getFullYear();
      const bxmConfig = await (tx as any).bXMConfig.findUnique({
        where: { year: currentYear },
      });
      const bxmAmount = bxmConfig ? Number(bxmConfig.amount) : 34.4; // Default BXM
      const calculatedCustomsPayment = bxmAmount * parsed.data.customsPaymentMultiplier;
      
      // Get task with client to update dealAmount
      const task = await (tx as any).task.findUnique({
        where: { id: taskId },
        include: { client: true },
      });
      
      // Calculate additional payment based on multiplier changes
      // Note: client.dealAmount should NOT be changed - it's the base contract amount
      // Only task.snapshotDealAmount should be updated for this specific task
      if (task?.client) {
        // Get client's currency
        const clientCurrency = (task.client as any).dealAmountCurrency || 'USD';
        
        // Get previous multiplier (if exists)
        const previousMultiplier = task.customsPaymentMultiplier ? Number(task.customsPaymentMultiplier) : 1;
        const newMultiplier = Number(parsed.data.customsPaymentMultiplier);
        
        // Calculate previous additional payment (if previous multiplier > 1)
        // Additional payment = (multiplier - 1) × BXM (only the excess over 1 BXM)
        let previousAdditionalPayment = 0;
        if (previousMultiplier > 1) {
          if (clientCurrency === 'USD') {
            previousAdditionalPayment = (previousMultiplier - 1) * bxmAmount;
          } else {
            const ONE_BXM_IN_SOM = 412000;
            previousAdditionalPayment = (previousMultiplier - 1) * ONE_BXM_IN_SOM;
          }
        }
        
        // Calculate new additional payment (if new multiplier > 1)
        // Additional payment = (multiplier - 1) × BXM (only the excess over 1 BXM)
        let newAdditionalPayment = 0;
        if (newMultiplier > 1) {
          if (clientCurrency === 'USD') {
            newAdditionalPayment = (newMultiplier - 1) * bxmAmount;
          } else {
            const ONE_BXM_IN_SOM = 412000;
            newAdditionalPayment = (newMultiplier - 1) * ONE_BXM_IN_SOM;
          }
        }
        
        // Calculate the difference (can be positive or negative)
        const paymentDifference = newAdditionalPayment - previousAdditionalPayment;
        
        // Get base deal amount (from client or current snapshot)
        const baseDealAmount = task.client.dealAmount ? Number(task.client.dealAmount) : 0;
        
        // Get current snapshotDealAmount (or use base dealAmount if snapshot is null)
        const currentSnapshotDealAmount = task.snapshotDealAmount 
          ? Number(task.snapshotDealAmount) 
          : baseDealAmount;
        
        // Calculate new snapshotDealAmount by removing previous additional payment and adding new one
        // Or simply: baseDealAmount + newAdditionalPayment
        const newSnapshotDealAmount = baseDealAmount + newAdditionalPayment;
        
        // Update task's snapshotDealAmount
        await (tx as any).task.update({
          where: { id: taskId },
          data: {
            customsPaymentMultiplier: parsed.data.customsPaymentMultiplier,
            snapshotCustomsPayment: calculatedCustomsPayment,
            snapshotDealAmount: newSnapshotDealAmount,
          },
        });
      } else {
        // If no client, just update customs payment
        await (tx as any).task.update({
          where: { id: taskId },
          data: {
            customsPaymentMultiplier: parsed.data.customsPaymentMultiplier,
            snapshotCustomsPayment: calculatedCustomsPayment,
          },
        });
      }
    }
    
    // #region agent log
    debugLog({location:'tasks.ts:796',message:'Before stage update',data:{stageId,newStatus:parsed.data.status,userId:req.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'});
    // #endregion
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
    // #region agent log
    debugLog({location:'tasks.ts:816',message:'Stage updated successfully',data:{stageId,newStatus:upd.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'});
    // #endregion

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
      // Pass completedAt date for exchange rate lookup
      const completedAtDate = now; // Stage completion time
      await logKpiForStage(tx, taskId, upd.name, req.user?.id, completedAtDate);
    } else if (parsed.data.status === 'BOSHLANMAGAN' && stage.status === 'TAYYOR') {
      // Agar jarayonni TAYYORdan BOSHLANMAGANga o'zgartirsa, KPI log'ni o'chirish
      // Stage nomini normalize qilish (logKpiForStage bilan bir xil)
      let normalizedStageName = stage.name;
      if (stage.name === 'ST' || stage.name === 'Fito' || stage.name === 'FITO') {
        normalizedStageName = 'Sertifikat olib chiqish';
      } else if (stage.name === 'Xujjat_topshirish' || stage.name === 'Xujjat topshirish') {
        normalizedStageName = 'Topshirish';
      }
      
      // Faqat o'sha jarayonni tayyor qilgan foydalanuvchining KPI log'ini o'chirish
      if (stage.assignedToId) {
        await (tx as any).kpiLog.deleteMany({
          where: {
            taskId: taskId,
            stageName: normalizedStageName,
            userId: stage.assignedToId, // Faqat o'sha foydalanuvchining log'ini o'chirish
          },
        });
      }
    }
    
    // Update task status based on all stages
    const needsQrToken = await updateTaskStatus(tx, taskId);
    
      return { updated: upd, needsQrToken };
    }, {
      maxWait: 30000, // 30 seconds max wait for transaction to start
      timeout: 30000, // 30 seconds timeout for transaction to complete (remote database uchun)
    });
  // #region agent log
  debugLog({location:'tasks.ts:824',message:'Transaction completed',data:{taskId,stageId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'});
  // #endregion

  // Generate QR token after transaction commits (non-blocking, idempotent)
  if (updated.needsQrToken) {
    // Fire and forget - don't wait for QR token generation
    generateQrTokenIfNeeded(taskId).catch((error) => {
      // Error already logged in generateQrTokenIfNeeded
    });
  }

    res.json(updated.updated);
  } catch (error: any) {
  // #region agent log
  debugLog({location:'tasks.ts:830',message:'PATCH stage error',data:{errorMessage:error?.message,errorCode:error?.code,taskId,stageId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'});
  // #endregion
    console.error('Error updating stage:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ 
      error: 'Stage yangilashda xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
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

router.patch('/:id', requireAuth(), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const task = await prisma.task.findUnique({ 
    where: { id },
    select: { 
      id: true,
      title: true,
      clientId: true,
      branchId: true,
      comments: true,
      hasPsr: true,
      driverPhone: true,
      createdById: true,
    }
  });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Faqat task yaratgan ishchi taskni o'zgartira oladi
  if (task.createdById !== user.id) {
    return res.status(403).json({ 
      error: 'Faqat task yaratgan ishchi taskni o\'zgartirishi mumkin' 
    });
  }

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
});

export default router;

