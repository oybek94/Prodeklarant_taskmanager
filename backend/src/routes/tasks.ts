import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { computeDurations } from '../services/stage-duration';
import { logKpiForStage } from '../services/kpi';
import { updateTaskStatus, generateQrTokenIfNeeded } from '../services/task-status';
import { TaskStatus, Currency, ExchangeSource, Prisma } from '@prisma/client';

type AfterHoursPayerType = 'CLIENT' | 'COMPANY';
import { Decimal } from '@prisma/client/runtime/library';
import { ValidationService } from '../services/validation.service';
import { getExchangeRate } from '../services/exchange-rate';
import { calculateAmountUzs } from '../services/monetary-validation';
import fs from 'fs/promises';
import { ensureCmrForInvoice } from '../services/cmr-service';
import { ensureTirForInvoice } from '../services/tir-service';
import { socketEmitter } from '../services/socketEmitter';
import { notify, getAllActiveUserIds } from '../services/notificationService';

const router = Router();



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
  afterHoursDeclaration: z.boolean().optional().default(false),
  afterHoursPayer: z.enum(['CLIENT', 'COMPANY']).optional().default('CLIENT'),
  customsPaymentMultiplier: z.number().min(0.5).max(4).optional(), // BXM multiplier for Deklaratsiya (0.5 to 4)
});

router.get('/errors/unrated', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const unratedErrors = await prisma.taskError.findMany({
      where: { adminRating: null },
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
          sellerName: inv?.contract?.sellerName || '',
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
    const where: any = {};

    /** Query param'ni xavfsiz int'ga aylantirish — NaN bo'lsa undefined qaytaradi */
    const safeInt = (val: unknown): number | undefined => {
      const n = Number(val);
      return Number.isFinite(n) ? Math.floor(n) : undefined;
    };
    
    // Pagination parametrlari
    const pageNum = safeInt(page);
    const limitNum = safeInt(limit);
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
        const bid = safeInt(branchId);
        if (bid) where.branchId = bid;
      } else if (user.role === 'ADMIN') {
        // Admin ham barcha filiallarni ko'radi
        const bid = safeInt(branchId);
        if (bid) where.branchId = bid;
      } else {
        // Boshqa rollar uchun o'z filialidagi ishlar
        if (user.branchId) where.branchId = user.branchId;
      }
    } else {
      // Agar user bo'lmasa, query'dan branchId olinadi
      const bid = safeInt(branchId);
      if (bid) where.branchId = bid;
    }
    
    const cid = safeInt(clientId);
    if (cid) where.clientId = cid;
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
        afterHoursDeclaration: true,
        afterHoursPayer: true,
        driverPhone: true,
        customsPaymentMultiplier: true,
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
          orderBy: { stageOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      // Backward compatibility: agar pagination yo'q bo'lsa, count qilmaymiz
      pageNum && limitNum ? prisma.task.count({ where }) : Promise.resolve(0),
    ]);
    
    // Status DB'da saqlangan qiymatdan olinadi (recalculate qilinmaydi)
    // Status faqat stage o'zgarganda updateTaskStatus() orqali yangilanadi
    
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

router.post('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = createTaskSchema.safeParse(req.body);
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
    let snapshotCertificatePaymentAmountUzs: number | null = null;
    let snapshotPsrPrice = null;
    let snapshotPsrPriceExchangeRate: Decimal | null = null;
    let snapshotPsrPriceAmountUzs: number | null = null;
    let snapshotWorkerPrice = null;
    let snapshotWorkerPriceExchangeRate: Decimal | null = null;
    let snapshotWorkerPriceAmountUzs: number | null = null;
    let snapshotCustomsPayment = null;
    let snapshotCustomsPaymentExchangeRate: Decimal | null = null;
    let snapshotCustomsPaymentAmountUzs: number | null = null;

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
      const paymentCurrency: Currency = snapshotDealAmountCurrency || 'USD';
      const paymentExchangeRate = snapshotDealAmountExchangeRateValue || new Decimal(1);
      const resolvePaymentAmounts = (
        amountUsdRaw: number | null | undefined,
        amountUzsRaw: number | null | undefined,
        fallbackRaw: number | null | undefined,
        currency: Currency,
        exchangeRate: Decimal
      ) => {
        const amountUsd = Number(amountUsdRaw ?? fallbackRaw ?? 0);
        const amountUzs = Number(amountUzsRaw ?? fallbackRaw ?? 0);
        if (currency === 'USD') {
          const original = amountUsd;
          const uzs = amountUzsRaw != null
            ? amountUzs
            : Number(calculateAmountUzs(original, 'USD', exchangeRate));
          const rate = original > 0 ? new Decimal(uzs / original) : new Decimal(1);
          return { original, uzs, rate };
        }
        const original = amountUzs;
        return { original, uzs: amountUzs, rate: new Decimal(1) };
      };

      const certificateAmounts = resolvePaymentAmounts(
        statePayment.certificatePayment_amount_original != null
          ? Number(statePayment.certificatePayment_amount_original)
          : null,
        statePayment.certificatePayment_amount_uzs != null
          ? Number(statePayment.certificatePayment_amount_uzs)
          : null,
        statePayment.certificatePayment != null
          ? Number(statePayment.certificatePayment)
          : null,
        paymentCurrency,
        paymentExchangeRate
      );
      snapshotCertificatePayment = certificateAmounts.original as any;
      snapshotCertificatePaymentExchangeRate = certificateAmounts.rate;
      snapshotCertificatePaymentAmountUzs = certificateAmounts.uzs;

      const psrAmounts = resolvePaymentAmounts(
        statePayment.psrPrice_amount_original != null
          ? Number(statePayment.psrPrice_amount_original)
          : null,
        statePayment.psrPrice_amount_uzs != null
          ? Number(statePayment.psrPrice_amount_uzs)
          : null,
        statePayment.psrPrice != null
          ? Number(statePayment.psrPrice)
          : null,
        paymentCurrency,
        paymentExchangeRate
      );
      snapshotPsrPrice = psrAmounts.original as any;
      snapshotPsrPriceExchangeRate = psrAmounts.rate;
      snapshotPsrPriceAmountUzs = psrAmounts.uzs;

      const workerAmounts = resolvePaymentAmounts(
        statePayment.workerPrice_amount_original != null
          ? Number(statePayment.workerPrice_amount_original)
          : null,
        statePayment.workerPrice_amount_uzs != null
          ? Number(statePayment.workerPrice_amount_uzs)
          : null,
        statePayment.workerPrice != null
          ? Number(statePayment.workerPrice)
          : null,
        paymentCurrency,
        paymentExchangeRate
      );
      snapshotWorkerPrice = workerAmounts.original as any;
      snapshotWorkerPriceExchangeRate = workerAmounts.rate;
      snapshotWorkerPriceAmountUzs = workerAmounts.uzs;

      // Agar CertifierFeeConfig mavjud bo'lsa, undan hiredWorkerRate ni ustun qilib olamiz
      if ('certifierFeeConfig' in tx) {
         try {
             const certConfig = await (tx as any).certifierFeeConfig.findFirst({
                 where: { branchId: parsed.data.branchId, createdAt: { lte: taskCreatedAt } },
                 orderBy: { createdAt: 'desc' },
             });
             if (certConfig && certConfig.hiredWorkerRate !== undefined && certConfig.hiredWorkerRate !== null) {
                 const hwRate = Number(certConfig.hiredWorkerRate);
                 const hwAmounts = resolvePaymentAmounts(null, hwRate, hwRate, paymentCurrency, paymentExchangeRate);
                 snapshotWorkerPrice = hwAmounts.original as any;
                 snapshotWorkerPriceExchangeRate = hwAmounts.rate;
                 snapshotWorkerPriceAmountUzs = hwAmounts.uzs;
             }
         } catch(e) {}
      }

      const customsAmounts = resolvePaymentAmounts(
        statePayment.customsPayment_amount_original != null
          ? Number(statePayment.customsPayment_amount_original)
          : null,
        statePayment.customsPayment_amount_uzs != null
          ? Number(statePayment.customsPayment_amount_uzs)
          : null,
        statePayment.customsPayment != null
          ? Number(statePayment.customsPayment)
          : null,
        paymentCurrency,
        paymentExchangeRate
      );
      snapshotCustomsPayment = customsAmounts.original as any;
      snapshotCustomsPaymentExchangeRate = customsAmounts.rate;
      snapshotCustomsPaymentAmountUzs = customsAmounts.uzs;
    }

    // Prisma data object - faqat mavjud field'larni qo'shamiz
    const taskData: Partial<Prisma.TaskUncheckedCreateInput> = {
      clientId: parsed.data.clientId,
      branchId: parsed.data.branchId,
      title: parsed.data.title,
      hasPsr: parsed.data.hasPsr,
      afterHoursDeclaration: parsed.data.afterHoursDeclaration,
      afterHoursPayer: parsed.data.afterHoursPayer as AfterHoursPayerType,
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

    const snapshotPaymentCurrency: Currency = snapshotDealAmountCurrency || 'USD';

    if (snapshotCertificatePayment != null && snapshotCertificatePaymentAmountUzs != null) {
      taskData.snapshotCertificatePayment_amount_original = snapshotCertificatePayment;
      taskData.snapshotCertificatePayment_currency = snapshotPaymentCurrency;
      taskData.snapshotCertificatePayment_exchange_rate = Number(snapshotCertificatePaymentExchangeRate || 1);
      taskData.snapshotCertificatePayment_amount_uzs = snapshotCertificatePaymentAmountUzs;
      taskData.snapshotCertificatePayment_exchange_source = 'MANUAL';
    }
    if (snapshotPsrPrice != null && snapshotPsrPriceAmountUzs != null) {
      taskData.snapshotPsrPrice_amount_original = snapshotPsrPrice;
      taskData.snapshotPsrPrice_currency = snapshotPaymentCurrency;
      taskData.snapshotPsrPrice_exchange_rate = Number(snapshotPsrPriceExchangeRate || 1);
      taskData.snapshotPsrPrice_amount_uzs = snapshotPsrPriceAmountUzs;
      taskData.snapshotPsrPrice_exchange_source = 'MANUAL';
    }
    if (snapshotWorkerPrice != null && snapshotWorkerPriceAmountUzs != null) {
      taskData.snapshotWorkerPrice_amount_original = snapshotWorkerPrice;
      taskData.snapshotWorkerPrice_currency = snapshotPaymentCurrency;
      taskData.snapshotWorkerPrice_exchange_rate = Number(snapshotWorkerPriceExchangeRate || 1);
      taskData.snapshotWorkerPrice_amount_uzs = snapshotWorkerPriceAmountUzs;
      taskData.snapshotWorkerPrice_exchange_source = 'MANUAL';
    }
    if (snapshotCustomsPayment != null && snapshotCustomsPaymentAmountUzs != null) {
      taskData.snapshotCustomsPayment_amount_original = snapshotCustomsPayment;
      taskData.snapshotCustomsPayment_currency = snapshotPaymentCurrency;
      taskData.snapshotCustomsPayment_exchange_rate = Number(snapshotCustomsPaymentExchangeRate || 1);
      taskData.snapshotCustomsPayment_amount_uzs = snapshotCustomsPaymentAmountUzs;
      taskData.snapshotCustomsPayment_exchange_source = 'MANUAL';
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
    const createdTask = await tx.task.create({
      data: taskData as Prisma.TaskUncheckedCreateInput,
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
    // Real-time: barcha foydalanuvchilarga yangi task haqida xabar berish
    socketEmitter.broadcastExcept(req.user!.id, 'task:created', { task, createdBy: req.user!.name });
    // Bildirishnoma
    getAllActiveUserIds().then(userIds => {
      notify({
        userIds,
        type: 'TASK_CREATED',
        title: `Yangi task: ${task.title || 'Task #' + task.id}`,
        message: `${req.user!.name} yangi task yaratdi`,
        actionUrl: `/tasks/${task.id}`,
        taskId: task.id,
        excludeUserId: req.user!.id,
      });
    });
  } catch (error: any) {
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

router.get('/:id', requireAuth(), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  const isLight = req.query.light === 'true';

  // Yengil rejim: Invoice sahifasi uchun faqat kerakli ma'lumotlar (tez yuklash)
  if (isLight) {
    try {
      const task = await prisma.task.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          status: true,
          comments: true,
          hasPsr: true,
          driverPhone: true,
          clientId: true,
          branchId: true,
          createdAt: true,
          client: {
            select: {
              id: true,
              name: true,
              contractNumber: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          stages: {
            select: {
              name: true,
              status: true,
            },
            orderBy: { stageOrder: 'asc' as const },
          },
          errors: {
            select: { id: true },
          },
        },
      });
      if (!task) return res.status(404).json({ error: 'Not found' });
      return res.json(task);
    } catch (error) {
      console.error('Error fetching task (light):', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      client: true,
      branch: true,
      invoice: {
        select: {
          contractNumber: true,
          contract: {
            select: {
              contractNumber: true,
              contractDate: true,
              emails: true,
            },
          },
        },
      },
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
    const clientDealCurrency = task.client.dealAmount_currency || task.client.dealAmountCurrency || 'USD';
    if (task.snapshotDealAmount_amount_uzs) {
      // Use universal field if available
      dealAmountInUzs = Number(task.snapshotDealAmount_amount_uzs);
    } else if (task.snapshotDealAmount) {
      // Fallback to old field - convert if needed
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
    const resolvePaymentUzs = (
      amountOriginal: number | null | undefined,
      amountUzs: number | null | undefined,
      currency: Currency,
      exchangeRate?: Decimal | number | null
    ) => {
      if (currency === 'UZS') {
        return Number(amountUzs ?? amountOriginal ?? 0);
      }
      const original = Number(amountOriginal ?? 0);
      if (amountUzs != null) return Number(amountUzs);
      const rate = exchangeRate ? new Decimal(exchangeRate) : new Decimal(1);
      return Number(calculateAmountUzs(original, 'USD', rate));
    };

    let certificatePaymentUzs: number;
    let psrPriceUzs: number;
    let workerPriceUzs: number;
    let customsPaymentUzs: number;

    // Agar snapshot'lar mavjud bo'lsa, ulardan foydalanamiz (all in UZS)
    if (task.snapshotCertificatePayment !== null && task.snapshotCertificatePayment !== undefined) {
      const paymentCurrency = task.snapshotCertificatePayment_currency || clientDealCurrency;
      const snapshotRate = task.snapshotCertificatePayment_exchange_rate || task.snapshotDealAmount_exchange_rate || task.snapshotDealAmountExchangeRate;
      certificatePaymentUzs = resolvePaymentUzs(
        Number(task.snapshotCertificatePayment),
        task.snapshotCertificatePayment_amount_uzs != null
          ? Number(task.snapshotCertificatePayment_amount_uzs)
          : null,
        paymentCurrency,
        snapshotRate
      );
      psrPriceUzs = resolvePaymentUzs(
        Number(task.snapshotPsrPrice || 0),
        task.snapshotPsrPrice_amount_uzs != null
          ? Number(task.snapshotPsrPrice_amount_uzs)
          : null,
        task.snapshotPsrPrice_currency || clientDealCurrency,
        task.snapshotPsrPrice_exchange_rate || snapshotRate
      );
      workerPriceUzs = resolvePaymentUzs(
        Number(task.snapshotWorkerPrice || 0),
        task.snapshotWorkerPrice_amount_uzs != null
          ? Number(task.snapshotWorkerPrice_amount_uzs)
          : null,
        task.snapshotWorkerPrice_currency || clientDealCurrency,
        task.snapshotWorkerPrice_exchange_rate || snapshotRate
      );
      customsPaymentUzs = resolvePaymentUzs(
        Number(task.snapshotCustomsPayment || 0),
        task.snapshotCustomsPayment_amount_uzs != null
          ? Number(task.snapshotCustomsPayment_amount_uzs)
          : null,
        task.snapshotCustomsPayment_currency || clientDealCurrency,
        task.snapshotCustomsPayment_exchange_rate || snapshotRate
      );
    } else {
      // Snapshot bo'sh bo'lsa, task yaratilgan vaqtdan oldin yaratilgan eng so'nggi davlat to'lovini topamiz
      const taskCreatedAt = new Date(task.createdAt);
      const statePayment = await prisma.statePayment.findFirst({
        where: {
          
          createdAt: { lte: taskCreatedAt }, // Task yaratilgunga qadar yaratilgan davlat to'lovlari
        },
        orderBy: {
          createdAt: 'desc', // Eng so'nggi davlat to'lovi
        },
      });

      if (statePayment) {
        const paymentCurrency: Currency = clientDealCurrency === 'UZS' ? 'UZS' : 'USD';
        const fallbackRate = task.snapshotDealAmount_exchange_rate || task.snapshotDealAmountExchangeRate || 1;
        certificatePaymentUzs = resolvePaymentUzs(
          paymentCurrency === 'USD'
            ? Number(statePayment.certificatePayment_amount_original ?? statePayment.certificatePayment)
            : Number(statePayment.certificatePayment_amount_uzs ?? statePayment.certificatePayment),
          statePayment.certificatePayment_amount_uzs != null
            ? Number(statePayment.certificatePayment_amount_uzs)
            : null,
          paymentCurrency,
          fallbackRate
        );
        psrPriceUzs = resolvePaymentUzs(
          paymentCurrency === 'USD'
            ? Number(statePayment.psrPrice_amount_original ?? statePayment.psrPrice)
            : Number(statePayment.psrPrice_amount_uzs ?? statePayment.psrPrice),
          statePayment.psrPrice_amount_uzs != null
            ? Number(statePayment.psrPrice_amount_uzs)
            : null,
          paymentCurrency,
          fallbackRate
        );
        workerPriceUzs = resolvePaymentUzs(
          paymentCurrency === 'USD'
            ? Number(statePayment.workerPrice_amount_original ?? statePayment.workerPrice)
            : Number(statePayment.workerPrice_amount_uzs ?? statePayment.workerPrice),
          statePayment.workerPrice_amount_uzs != null
            ? Number(statePayment.workerPrice_amount_uzs)
            : null,
          paymentCurrency,
          fallbackRate
        );
        customsPaymentUzs = resolvePaymentUzs(
          paymentCurrency === 'USD'
            ? Number(statePayment.customsPayment_amount_original ?? statePayment.customsPayment)
            : Number(statePayment.customsPayment_amount_uzs ?? statePayment.customsPayment),
          statePayment.customsPayment_amount_uzs != null
            ? Number(statePayment.customsPayment_amount_uzs)
            : null,
          paymentCurrency,
          fallbackRate
        );
      } else {
        // StatePayment yo'q bo'lsa, 0 qaytaramiz
        certificatePaymentUzs = 0;
        psrPriceUzs = 0;
        workerPriceUzs = 0;
        customsPaymentUzs = 0;
      }
    }

    // Add PSR amount (10 USD converted to UZS if deal was in USD)
    // Use exchange rate from snapshot universal fields
    let psrAmountInUzs = 0;
    if (task.hasPsr) {
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
    
    // MOLIYAVIY HISOBOT KOMPONENTLARINI HISABLASH
    // snapshotCustomsPayment DA MULTIPLIER ALLAQACHON KO'PAYTIRILGAN! 
    // shuningdek snapshotDealAmount GA HAM QO'SHIMCHA (multiplier - 1) SUMMASI ALLAQACHON QO'SHILGAN (task.stages update TAYYOR).
    let extraDeklaratsiyaUzs = 0;
    if (task.customsPaymentMultiplier != null && Number(task.customsPaymentMultiplier) > 1) {
       const mult = Number(task.customsPaymentMultiplier);
       // customsPaymentUzs - bu jami to'lanadigan qimmatlashtirilgan summa. Asl 1 BXM ni hisoblaymiz:
       const baseBxmUzs = customsPaymentUzs / mult;
       extraDeklaratsiyaUzs = baseBxmUzs * (mult - 1);
    }
    
    let davlatUzsReal = 0;
    const taskCreatedAtDate = new Date(task.createdAt);
    const statePayment = await prisma.statePayment.findFirst({
        where: { createdAt: { lte: taskCreatedAtDate } },
        orderBy: { createdAt: 'desc' },
    });
    if (statePayment) {
       const st1 = Number(statePayment.st1Payment_amount_uzs ?? statePayment.st1Payment ?? 0);
       const fito = Number(statePayment.fitoPayment_amount_uzs ?? statePayment.fitoPayment ?? 0);
       const fumigatsiya = Number(statePayment.fumigationPayment_amount_uzs ?? statePayment.fumigationPayment ?? 0);
       const ichki = Number(statePayment.internalCertPayment_amount_uzs ?? statePayment.internalCertPayment ?? 0);
       
       davlatUzsReal = st1 + fito + fumigatsiya + ichki;
       const spCurrency = statePayment.currency || 'USD';
       if (spCurrency === 'USD') {
           const rate = Number(task.snapshotDealAmount_exchange_rate || task.snapshotDealAmountExchangeRate || 1);
           davlatUzsReal = davlatUzsReal * rate;
       }
    } else {
       davlatUzsReal = certificatePaymentUzs;
    }

    let certifierUzsReal = 0;
    let certHiredWorkerUzs = workerPriceUzs; // Default holatda eskisini olamiz
    if ('certifierFeeConfig' in prisma) {
        let certConfig: any = null;
        try {
           certConfig = await (prisma as any).certifierFeeConfig.findFirst({
               where: { branchId: task.branchId, createdAt: { lte: taskCreatedAtDate } },
               orderBy: { createdAt: 'desc' },
           });
        } catch(e) {}
        if (certConfig) {
            certifierUzsReal = Number(certConfig.st1Rate || 0) + Number(certConfig.fitoRate || 0) + Number(certConfig.aktRate || 0) + Number(certConfig.fumigationRate || 0);
            if (certConfig.hiredWorkerRate !== undefined && certConfig.hiredWorkerRate !== null) {
                certHiredWorkerUzs = Number(certConfig.hiredWorkerRate || 0);
            }
        }
    }

    // Snapshotlarda BXM summasi allaqachon finalDealAmountInUzs (shartnoma) va customsPaymentUzs (davlat) ichiga kiritib bo'lingan.
    const tDealAmount = finalDealAmountInUzs;
    const tDeclarationPayment = customsPaymentUzs;
    
    // UI da "Asosiy Shartnoma (Base)" kursatish uchun, tDealAmount dan tExtra ni ayiramiz:
    const baseDealUzs = tDealAmount - extraDeklaratsiyaUzs;
    
    (task as any).financialReport = {
        dealAmountBase: baseDealUzs - psrAmountInUzs, // PSR ni ham ayirib tashlaymiz
        dealAmount: tDealAmount,
        certifierFee: certifierUzsReal,
        statePayment: davlatUzsReal,
        declarationPayment: tDeclarationPayment,
        hiredWorkerPayment: certHiredWorkerUzs,
        netProfit: tDealAmount - certifierUzsReal - davlatUzsReal - tDeclarationPayment - certHiredWorkerUzs
    };
    
    // Eski logic bilan ishlashni davom etishi uchun
    netProfit = (task as any).financialReport.netProfit;
    
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
    
    // Get workerPrice from snapshot or state payment (convert to UZS if needed)
    // Use amount_uzs from universal fields when available
    let workerPriceInUzs = 0;
    if (task.snapshotWorkerPrice_amount_uzs !== null && task.snapshotWorkerPrice_amount_uzs !== undefined) {
      // Use universal field
      workerPriceInUzs = Number(task.snapshotWorkerPrice_amount_uzs);
    } else if (task.snapshotWorkerPrice !== null && task.snapshotWorkerPrice !== undefined) {
      const workerCurrency = task.snapshotWorkerPrice_currency || task.client.dealAmount_currency || task.client.dealAmountCurrency || 'USD';
      if (workerCurrency === 'USD') {
        const rate = task.snapshotWorkerPrice_exchange_rate
          || task.snapshotDealAmount_exchange_rate
          || task.snapshotDealAmountExchangeRate
          || 1;
        workerPriceInUzs = Number(calculateAmountUzs(Number(task.snapshotWorkerPrice), 'USD', new Decimal(rate)));
      } else {
        workerPriceInUzs = Number(task.snapshotWorkerPrice);
      }
    } else {
      const taskCreatedAt = new Date(task.createdAt);
      const statePayment = await prisma.statePayment.findFirst({
        where: {
          
          createdAt: { lte: taskCreatedAt },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      if (statePayment) {
        const workerCurrency = task.client.dealAmount_currency || task.client.dealAmountCurrency || 'USD';
        if (workerCurrency === 'USD') {
          const amountUsd = Number(statePayment.workerPrice_amount_original ?? statePayment.workerPrice);
          if (statePayment.workerPrice_amount_uzs != null) {
            workerPriceInUzs = Number(statePayment.workerPrice_amount_uzs);
          } else {
            const rate = task.snapshotDealAmount_exchange_rate
              || task.snapshotDealAmountExchangeRate
              || 1;
            workerPriceInUzs = Number(calculateAmountUzs(amountUsd, 'USD', new Decimal(rate)));
          }
        } else {
          workerPriceInUzs = Number(statePayment.workerPrice_amount_uzs ?? statePayment.workerPrice);
        }
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
    financialReport: (task as any).financialReport, // Aniq hisobot detallari
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

  const updated = await prisma.$transaction(async (tx) => {
    // If Deklaratsiya stage is being started and multiplier is provided, update task's customs payment
    if (stage.name === 'Deklaratsiya' && parsed.data.status === 'TAYYOR' && parsed.data.customsPaymentMultiplier) {
      // Find BXM that was effective at the time of completion
      const completedAt = new Date();
      const bxmConfig = await (tx as any).bXMConfig.findFirst({
        where: { effectiveFrom: { lte: completedAt } },
        orderBy: { effectiveFrom: 'desc' },
      });
      const bxmAmountUsd = bxmConfig ? Number(bxmConfig.amountUsd) : 34.4;
      const bxmAmountUzs = bxmConfig ? Number(bxmConfig.amountUzs) : 412000;

      // Get task with client to update dealAmount
      const task = await (tx as any).task.findUnique({
        where: { id: taskId },
        include: { client: true },
      });
      
      const clientCurrency = task?.client
        ? (task.client as any).dealAmount_currency || (task.client as any).dealAmountCurrency || 'USD'
        : 'USD';
      const afterHoursDeclaration = parsed.data.afterHoursDeclaration ?? task?.afterHoursDeclaration ?? false;
      const afterHoursPayer = (parsed.data.afterHoursPayer ?? task?.afterHoursPayer ?? 'CLIENT') as AfterHoursPayerType;
      const afterHoursExtraOriginal = afterHoursDeclaration
        ? (clientCurrency === 'USD' ? 8.5 : 103000)
        : 0;
      const afterHoursExtraUzs = afterHoursDeclaration ? 103000 : 0;
      const bxmAmountForClient = clientCurrency === 'USD' ? bxmAmountUsd : bxmAmountUzs;
      const calculatedCustomsBasePayment = bxmAmountForClient * parsed.data.customsPaymentMultiplier;
      const calculatedCustomsBasePaymentUzs = clientCurrency === 'USD'
        ? bxmAmountUzs * parsed.data.customsPaymentMultiplier
        : calculatedCustomsBasePayment;
      const calculatedCustomsPayment = calculatedCustomsBasePayment + afterHoursExtraOriginal;
      const calculatedCustomsPaymentUzs = calculatedCustomsBasePaymentUzs + afterHoursExtraUzs;
      const calculatedCustomsExchangeRate = clientCurrency === 'USD' && calculatedCustomsPayment > 0
        ? new Decimal(calculatedCustomsPaymentUzs / calculatedCustomsPayment)
        : new Decimal(1);

      if (task?.client) {
        const newMultiplier = Number(parsed.data.customsPaymentMultiplier);

        // Calculate new additional payment (if new multiplier > 1)
        // Additional payment = (multiplier - 1) × BXM (only the excess over 1 BXM)
        let newAdditionalPayment = 0;
        if (newMultiplier > 1) {
          if (clientCurrency === 'USD') {
            newAdditionalPayment = (newMultiplier - 1) * bxmAmountUsd;
          } else {
            newAdditionalPayment = (newMultiplier - 1) * bxmAmountUzs;
          }
        }

        const dealExtraFromAfterHours = afterHoursDeclaration && afterHoursPayer === 'CLIENT'
          ? afterHoursExtraOriginal
          : 0;
        
        // Get base deal amount (from client or current snapshot)
        const baseDealAmount = task.client.dealAmount ? Number(task.client.dealAmount) : 0;
        const baseDealAmountUzs = clientCurrency === 'USD'
          ? Number((task.client as any).dealAmount_amount_uzs
            ?? (baseDealAmount * Number((task.client as any).dealAmount_exchange_rate || (task.client as any).dealAmountExchangeRate || task.snapshotDealAmount_exchange_rate || task.snapshotDealAmountExchangeRate || 1)))
          : Number((task.client as any).dealAmount_amount_uzs ?? baseDealAmount);

        // Calculate new snapshotDealAmount by removing previous additional payment and adding new one
        // Or simply: baseDealAmount + newAdditionalPayment (+ after-hours if payer is client)
        const newSnapshotDealAmount = baseDealAmount + newAdditionalPayment + dealExtraFromAfterHours;
        const newSnapshotDealAmountUzs = baseDealAmountUzs + (newMultiplier - 1) * bxmAmountUzs + (afterHoursDeclaration && afterHoursPayer === 'CLIENT' ? 103000 : 0);
        
        // Update task's snapshotDealAmount
        await (tx as any).task.update({
          where: { id: taskId },
          data: {
            customsPaymentMultiplier: parsed.data.customsPaymentMultiplier,
            afterHoursDeclaration,
            afterHoursPayer,
            snapshotCustomsPayment: calculatedCustomsPayment,
            snapshotCustomsPaymentExchangeRate: calculatedCustomsExchangeRate,
            snapshotCustomsPayment_amount_original: calculatedCustomsPayment,
            snapshotCustomsPayment_currency: clientCurrency,
            snapshotCustomsPayment_exchange_rate: Number(calculatedCustomsExchangeRate),
            snapshotCustomsPayment_amount_uzs: calculatedCustomsPaymentUzs,
            snapshotCustomsPayment_exchange_source: 'MANUAL',
            snapshotDealAmount: newSnapshotDealAmount,
            snapshotDealAmount_amount_uzs: newSnapshotDealAmountUzs,
          },
        });
      } else {
        // If no client, just update customs payment
        await (tx as any).task.update({
          where: { id: taskId },
          data: {
            customsPaymentMultiplier: parsed.data.customsPaymentMultiplier,
            afterHoursDeclaration,
            afterHoursPayer,
            snapshotCustomsPayment: calculatedCustomsPayment,
            snapshotCustomsPaymentExchangeRate: calculatedCustomsExchangeRate,
            snapshotCustomsPayment_amount_original: calculatedCustomsPayment,
            snapshotCustomsPayment_currency: clientCurrency,
            snapshotCustomsPayment_exchange_rate: Number(calculatedCustomsExchangeRate),
            snapshotCustomsPayment_amount_uzs: calculatedCustomsPaymentUzs,
            snapshotCustomsPayment_exchange_source: 'MANUAL',
          },
        });
      }
    } else if (stage.name === 'Deklaratsiya' && parsed.data.status === 'BOSHLANMAGAN' && stage.status === 'TAYYOR') {
      const task = await (tx as any).task.findUnique({
        where: { id: taskId },
        include: { client: true },
      });

      const clientCurrency = task?.client
        ? (task.client as any).dealAmount_currency || (task.client as any).dealAmountCurrency || 'USD'
        : 'USD';

      const baseDealAmount = task?.client?.dealAmount ? Number(task.client.dealAmount) : 0;
      const baseDealAmountUzs = clientCurrency === 'USD'
        ? Number((task?.client as any)?.dealAmount_amount_uzs
          ?? (baseDealAmount * Number((task?.client as any)?.dealAmount_exchange_rate || (task?.client as any)?.dealAmountExchangeRate || task?.snapshotDealAmount_exchange_rate || task?.snapshotDealAmountExchangeRate || 1)))
        : Number((task?.client as any)?.dealAmount_amount_uzs ?? baseDealAmount);

      await (tx as any).task.update({
        where: { id: taskId },
        data: {
          afterHoursDeclaration: false,
          customsPaymentMultiplier: null,
          snapshotCustomsPayment: 0,
          snapshotCustomsPaymentExchangeRate: new Decimal(1),
          snapshotCustomsPayment_amount_original: 0,
          snapshotCustomsPayment_currency: clientCurrency,
          snapshotCustomsPayment_exchange_rate: 1,
          snapshotCustomsPayment_amount_uzs: 0,
          snapshotCustomsPayment_exchange_source: 'MANUAL',
          snapshotDealAmount: baseDealAmount,
          snapshotDealAmount_amount_uzs: baseDealAmountUzs,
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


  // Generate QR token after transaction commits (non-blocking, idempotent)
  if (updated.needsQrToken) {
    // Fire and forget - don't wait for QR token generation
    generateQrTokenIfNeeded(taskId).catch((error) => {
      // Error already logged in generateQrTokenIfNeeded
    });
  }

  const shouldGenerateCmr =
    stage.name === 'Invoys' &&
    parsed.data.status === 'TAYYOR' &&
    stage.status !== 'TAYYOR';

  if (shouldGenerateCmr && req.user) {
    const invoice = await prisma.invoice.findUnique({
      where: { taskId },
      select: { id: true },
    });
    if (invoice) {
      await ensureCmrForInvoice({
        invoiceId: invoice.id,
        uploadedById: req.user.id,
      });
      await ensureTirForInvoice({
        invoiceId: invoice.id,
        uploadedById: req.user.id,
      });
    }
  }

    res.json(updated.updated);
    // Real-time: stage o'zgarishi haqida xabar berish
    socketEmitter.broadcastExcept(user.id, 'task:stageUpdated', { taskId, stageId, stage: updated.updated, updatedBy: user.name });
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
  workerId: z.number(),
  amount: z.number(),
  comment: z.string().optional(),
  date: z.coerce.date(),
});

const updateErrorSchema = z.object({
  stageName: z.string().optional(),
  workerId: z.number().optional(),
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
        comment: parsed.data.comment,
        date: parsed.data.date,
        createdById: req.user!.id,
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
        currency: 'USD',
        amount_original: -parsed.data.amount,
        currency_universal: 'USD',
      },
    });

    return error;
  });

  res.status(201).json(result);
  socketEmitter.broadcast('admin_new_error_report', { error: result, event: 'Yangi xato hisoboti kelib tushdi' });
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

  await prisma.$transaction(async (tx) => {
    await (tx as any).taskError.delete({ where: { id: errorId } });
    await (tx as any).kpiLog.create({
      data: {
        userId: error.workerId,
        taskId: error.taskId,
        stageName: error.stageName,
        amount: Number(error.amount), // Revert deduction
        currency: 'USD',
        amount_original: Number(error.amount),
        currency_universal: 'USD',
      },
    });
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
    }

    return { updated: errorUpdated, workerNotif: wNotif, creatorNotif: cNotif };
  });

  // Check achievements
  const bountyCount = await prisma.taskError.count({
    where: { createdById: error.createdById, adminRating: { not: null } }
  });

  if (bountyCount >= 5) {
     const hasMedal = await prisma.userAchievement.count({
         where: { userId: error.createdById, type: 'BOUNTY_HUNTER' }
     });
     if (hasMedal === 0) {
        await prisma.userAchievement.create({
           data: {
              userId: error.createdById,
              type: 'BOUNTY_HUNTER',
              medalName: 'Overwatch Investigator',
              description: 'Kamida 5 ta xato ushlab, kompaniyani qutqargani uchun!',
           }
        });
     }
  }

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
        ...(parsed.data.workerId && { workerId: parsed.data.workerId }),
        ...(parsed.data.amount !== undefined && { amount: parsed.data.amount }),
        ...(parsed.data.comment !== undefined && { comment: parsed.data.comment }),
        ...(parsed.data.date && { date: parsed.data.date }),
      },
      include: { worker: { select: { id: true, name: true } } },
    });

    if (parsed.data.amount !== undefined && Number(parsed.data.amount) !== Number(error.amount)) {
      const diff = Number(parsed.data.amount) - Number(error.amount);
      if (diff !== 0) {
        await (tx as any).kpiLog.create({
          data: {
            userId: next.workerId,
            taskId: next.taskId,
            stageName: next.stageName,
            amount: -diff, // Adjust deduction by delta
            currency: 'USD',
            amount_original: -diff,
            currency_universal: 'USD',
          },
        });
      }
    }

    return next;
  });

  res.json(updated);
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  clientId: z.number().optional(),
  branchId: z.number().optional(),
  comments: z.string().optional(),
  hasPsr: z.boolean().optional(),
  afterHoursDeclaration: z.boolean().optional(),
  afterHoursPayer: z.enum(['CLIENT', 'COMPANY']).optional(),
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
    if (task.afterHoursDeclaration !== undefined) changes.afterHoursDeclaration = task.afterHoursDeclaration;
    if (task.afterHoursPayer) changes.afterHoursPayer = task.afterHoursPayer;
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
      afterHoursDeclaration: true,
      afterHoursPayer: true,
      driverPhone: true,
      createdById: true,
      createdAt: true,
      snapshotDealAmount: true,
      snapshotDealAmountExchangeRate: true,
      snapshotDealAmount_exchange_rate: true,
    }
  });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const hasOtherFields = parsed.data.title !== undefined || parsed.data.clientId !== undefined ||
    parsed.data.branchId !== undefined || parsed.data.comments !== undefined ||
    parsed.data.hasPsr !== undefined || parsed.data.driverPhone !== undefined;
  const isOnlyAfterHoursUpdate = !hasOtherFields && (parsed.data.afterHoursDeclaration !== undefined || parsed.data.afterHoursPayer !== undefined);

  const isCreator = task.createdById === user.id;
  const isAdmin = user.role === 'ADMIN';

  // Faqat "ish vaqtidan tashqari" maydonlarini yangilashda har qanday avtorizatsiyalangan foydalanuvchi ruxsat etiladi
  if (!isAdmin && !isCreator && !isOnlyAfterHoursUpdate) {
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
    (parsed.data.afterHoursDeclaration !== undefined && parsed.data.afterHoursDeclaration !== (task as any).afterHoursDeclaration) ||
    (parsed.data.afterHoursPayer !== undefined && parsed.data.afterHoursPayer !== (task as any).afterHoursPayer) ||
    (parsed.data.driverPhone !== undefined && parsed.data.driverPhone !== task.driverPhone);

  const updated = await prisma.$transaction(async (tx) => {
    // Create version before update if there are changes
    if (hasChanges && req.user) {
      await createTaskVersion(tx, id, req.user.id);
    }

    const updateData: any = {
      ...(parsed.data.title && { title: parsed.data.title }),
      ...(parsed.data.clientId && { clientId: parsed.data.clientId }),
      ...(parsed.data.branchId && { branchId: parsed.data.branchId }),
      ...(parsed.data.comments !== undefined && { comments: parsed.data.comments || null }),
      ...(parsed.data.hasPsr !== undefined && { hasPsr: parsed.data.hasPsr }),
      ...(parsed.data.afterHoursDeclaration !== undefined && { afterHoursDeclaration: parsed.data.afterHoursDeclaration }),
      ...(parsed.data.afterHoursPayer !== undefined && { afterHoursPayer: parsed.data.afterHoursPayer as AfterHoursPayerType }),
      ...(parsed.data.driverPhone !== undefined && { driverPhone: parsed.data.driverPhone || null }),
      ...(hasChanges && req.user && { updatedById: req.user.id }),
    };

    if (parsed.data.branchId && parsed.data.branchId !== task.branchId) {
      const statePayment = await (tx as any).statePayment.findFirst({
        where: {
          
          createdAt: { lte: task.createdAt },
        },
        orderBy: { createdAt: 'desc' },
      });

      const client = await (tx as any).client.findUnique({
        where: { id: task.clientId },
        select: {
          dealAmount_currency: true,
          dealAmountCurrency: true,
        },
      });

      const clientCurrency: Currency = client?.dealAmount_currency || client?.dealAmountCurrency || 'USD';

      const pickAmount = (usd: number | null | undefined, uzs: number | null | undefined, fallback: number) =>
        clientCurrency === 'USD'
          ? Number(usd ?? fallback)
          : Number(uzs ?? fallback);

      if (statePayment) {
        const certAmount = pickAmount(statePayment.certificatePayment_amount_original, statePayment.certificatePayment_amount_uzs, Number(statePayment.certificatePayment));
        const psrAmount = pickAmount(statePayment.psrPrice_amount_original, statePayment.psrPrice_amount_uzs, Number(statePayment.psrPrice));
        const workerAmount = pickAmount(statePayment.workerPrice_amount_original, statePayment.workerPrice_amount_uzs, Number(statePayment.workerPrice));

        updateData.snapshotCertificatePayment = certAmount;
        updateData.snapshotPsrPrice = psrAmount;
        updateData.snapshotWorkerPrice = workerAmount;

        updateData.snapshotCertificatePayment_amount_original = certAmount;
        updateData.snapshotPsrPrice_amount_original = psrAmount;
        updateData.snapshotWorkerPrice_amount_original = workerAmount;

        updateData.snapshotCertificatePayment_currency = clientCurrency;
        updateData.snapshotPsrPrice_currency = clientCurrency;
        updateData.snapshotWorkerPrice_currency = clientCurrency;

        updateData.snapshotCertificatePayment_amount_uzs = Number(statePayment.certificatePayment_amount_uzs ?? statePayment.certificatePayment);
        updateData.snapshotPsrPrice_amount_uzs = Number(statePayment.psrPrice_amount_uzs ?? statePayment.psrPrice);
        updateData.snapshotWorkerPrice_amount_uzs = Number(statePayment.workerPrice_amount_uzs ?? statePayment.workerPrice);

        updateData.snapshotCertificatePayment_exchange_rate = 1;
        updateData.snapshotPsrPrice_exchange_rate = 1;
        updateData.snapshotWorkerPrice_exchange_rate = 1;

        updateData.snapshotCertificatePayment_exchange_source = 'MANUAL';
        updateData.snapshotPsrPrice_exchange_source = 'MANUAL';
        updateData.snapshotWorkerPrice_exchange_source = 'MANUAL';
      } else {
        updateData.snapshotCertificatePayment = 0;
        updateData.snapshotPsrPrice = 0;
        updateData.snapshotWorkerPrice = 0;

        updateData.snapshotCertificatePayment_amount_original = 0;
        updateData.snapshotPsrPrice_amount_original = 0;
        updateData.snapshotWorkerPrice_amount_original = 0;

        updateData.snapshotCertificatePayment_currency = clientCurrency;
        updateData.snapshotPsrPrice_currency = clientCurrency;
        updateData.snapshotWorkerPrice_currency = clientCurrency;

        updateData.snapshotCertificatePayment_amount_uzs = 0;
        updateData.snapshotPsrPrice_amount_uzs = 0;
        updateData.snapshotWorkerPrice_amount_uzs = 0;

        updateData.snapshotCertificatePayment_exchange_rate = 1;
        updateData.snapshotPsrPrice_exchange_rate = 1;
        updateData.snapshotWorkerPrice_exchange_rate = 1;

        updateData.snapshotCertificatePayment_exchange_source = 'MANUAL';
        updateData.snapshotPsrPrice_exchange_source = 'MANUAL';
        updateData.snapshotWorkerPrice_exchange_source = 'MANUAL';
        updateData.snapshotWorkerPrice_exchange_source = 'MANUAL';
      }
      
      // Agar CertifierFeeConfig mavjud bo'lsa, undan hiredWorkerRate ni ustun qilib olamiz
      if ('certifierFeeConfig' in tx) {
         try {
             // oldingi e'lon qilingan task.createdAt dan foydalanamiz, bu yerda statePayment ham shunga qarab qidirilgan
             const certConfig = await (tx as any).certifierFeeConfig.findFirst({
                 where: { branchId: task.branchId, createdAt: { lte: task.createdAt } },
                 orderBy: { createdAt: 'desc' },
             });
             if (certConfig && certConfig.hiredWorkerRate !== undefined && certConfig.hiredWorkerRate !== null) {
                 const hwRate = Number(certConfig.hiredWorkerRate);
                 updateData.snapshotWorkerPrice = hwRate;
                 updateData.snapshotWorkerPrice_amount_original = hwRate;
                 updateData.snapshotWorkerPrice_currency = 'UZS';
                 updateData.snapshotWorkerPrice_amount_uzs = hwRate;
                 updateData.snapshotWorkerPrice_exchange_rate = 1;
                 updateData.snapshotWorkerPrice_exchange_source = 'MANUAL';
             }
         } catch(e) {}
      }
    }

    const updatedTask = await (tx as any).task.update({
      where: { id },
      data: updateData,
    });

    // Task filiali o'zgarganda tegishli invoysning branchId sini ham yangilash (Invoyslar jadvalida to'g'ri ko'rinsin)
    if (parsed.data.branchId != null && parsed.data.branchId !== task.branchId) {
      await (tx as any).invoice.updateMany({
        where: { taskId: id },
        data: { branchId: parsed.data.branchId },
      });
    }

    return updatedTask;
  });

  res.json(updated);
  // Real-time: task yangilanishi haqida xabar berish
  socketEmitter.broadcastExcept(user.id, 'task:updated', { taskId: id, changes: parsed.data, updatedBy: user.name });
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

