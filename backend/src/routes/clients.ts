import { Router } from 'express';
import { prisma } from '../prisma';
import { Prisma, Currency, ExchangeSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { hashPassword } from '../utils/hash';
import { getLatestExchangeRate } from '../services/exchange-rate';
import { validateMonetaryFields, calculateAmountUzs } from '../services/monetary-validation';

const router = Router();

const clientSchema = z.object({
  name: z.string().min(1),
  dealAmount: z.number().optional(),
  dealAmountCurrency: z.enum(['USD', 'UZS']).optional(),
  dealAmountExchangeRate: z.number().positive().optional(), // Optional - will auto-fetch if not provided
  dealAmountExchangeSource: z.enum(['CBU', 'MANUAL']).optional(), // Optional - defaults to CBU
  phone: z.string().optional(),
  creditType: z.enum(['TASK_COUNT', 'AMOUNT']).optional().nullable(),
  creditLimit: z.union([z.number(), z.string()]).optional().nullable().transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    return typeof val === 'string' ? parseFloat(val) : val;
  }),
  creditStartDate: z.union([z.string(), z.date()]).optional().nullable(), // ISO date string or Date
  // Shartnoma maydonlari
  contractNumber: z.string().optional(),
  address: z.string().optional(),
  inn: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  bankName: z.string().optional(),
  bankAddress: z.string().optional(),
  bankAccount: z.string().optional(),
  transitAccount: z.string().optional(),
  bankSwift: z.string().optional(),
  correspondentBank: z.string().optional(),
  correspondentBankAccount: z.string().optional(),
  correspondentBankSwift: z.string().optional(),
});

router.get('/', async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({ 
    include: {
      tasks: {
        select: {
          id: true,
          hasPsr: true,
          snapshotDealAmount: true,
          snapshotPsrPrice: true,
        },
      },
      transactions: {
        where: { type: 'INCOME' },
        select: {
          amount: true,
          currency: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' } 
  });
  
  // Calculate balance for each client in deal currency
  const clientsWithBalance = await Promise.all(clients.map(async (client: any) => {
    try {
      const dealCurrency = client.dealAmount_currency || client.dealAmountCurrency || 'USD';
      const dealAmount = Number(client.dealAmount || 0);
      
      const totalTasks = client.tasks?.length || 0;
      const tasksWithPsr = (client.tasks || []).filter((t: any) => t.hasPsr).length;
      
      // Calculate total deal amount in deal currency using task snapshots
      const totalDealAmount = (client.tasks || []).reduce((sum: number, task: any) => {
        const baseAmount = task.snapshotDealAmount != null ? Number(task.snapshotDealAmount) : dealAmount;
        const psrAmount = task.hasPsr ? Number(task.snapshotPsrPrice || 0) : 0;
        return sum + baseAmount + psrAmount;
      }, 0);
      
      const totalIncome = (client.transactions || [])
        .filter((t: any) => t.currency === dealCurrency)
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

      const balance = totalDealAmount - totalIncome;
      
      return {
        ...client,
        balance,
        totalDealAmount, // Return in deal currency
        totalIncome,
        balanceCurrency: dealCurrency,
      };
    } catch (clientError) {
      console.error(`Error processing client ${client.id}:`, clientError);
      // Return client with default values if processing fails
      return {
        ...client,
        balance: 0,
        totalDealAmount: 0,
        totalIncome: 0,
        balanceCurrency: client.dealAmount_currency || client.dealAmountCurrency || 'USD',
      };
    }
  }));
  
    res.json(clientsWithBalance);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ 
      error: 'Mijozlarni yuklashda xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get task detail with stages and duration - CLIENT can access their own tasks, ADMIN can access any
// IMPORTANT: This route must come BEFORE all /:id/* routes to avoid route matching conflicts
router.get('/tasks/:taskId', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    // For CLIENT role, userId is the clientId
    const clientId = userRole === 'CLIENT' ? userId : Number(req.query.clientId || userId);
    
    // Check if CLIENT is accessing their own data
    if (userRole === 'CLIENT' && userId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get task with all details including stages
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId,
        clientId: clientId, // Ensure task belongs to this client
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        stages: {
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
        },
      },
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task topilmadi' });
    }
    
    // Format stages with duration information
    const formattedStages = task.stages.map((stage) => {
      let durationText = '';
      if (stage.status === 'TAYYOR' && stage.durationMin !== null) {
        const hours = Math.floor(stage.durationMin / 60);
        const minutes = stage.durationMin % 60;
        if (hours > 0) {
          durationText = `${hours} soat ${minutes} daqiqa`;
        } else {
          durationText = `${minutes} daqiqa`;
        }
      } else if (stage.status === 'BOSHLANMAGAN') {
        durationText = 'Boshlanmagan';
      } else {
        durationText = 'Jarayonda...';
      }
      
      return {
        ...stage,
        durationText,
      };
    });
    
    res.json({
      id: task.id,
      title: task.title,
      status: task.status,
      comments: task.comments,
      hasPsr: task.hasPsr,
      driverPhone: task.driverPhone,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      client: task.client,
      branch: task.branch,
      stages: formattedStages,
    });
  } catch (error: any) {
    console.error('Error fetching task detail:', error);
    res.status(500).json({ 
      error: 'Task ma\'lumotlarini yuklashda xatolik yuz berdi', 
      details: error.message 
    });
  }
});

router.get('/stats', async (_req, res) => {
  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  lastMonthEnd.setHours(23, 59, 59, 999);

  const totalClients = await prisma.client.count();
  const lastMonthTotal = await prisma.client.count({
    where: {
      createdAt: { lte: lastMonthEnd },
    },
  });

  // For now, we'll consider all clients as active (since we don't have status field)
  const activeClients = totalClients;
  const lastMonthActive = lastMonthTotal;

  const inactiveClients = 0;
  const archivedClients = 0;

  const totalChange = lastMonthTotal > 0 ? ((totalClients - lastMonthTotal) / lastMonthTotal) * 100 : (totalClients > 0 ? 100 : 0);
  const activeChange = lastMonthActive > 0 ? ((activeClients - lastMonthActive) / lastMonthActive) * 100 : (activeClients > 0 ? 100 : 0);

  res.json({
    total: {
      current: totalClients,
      change: totalChange,
    },
    active: {
      current: activeClients,
      change: activeChange,
    },
    inactive: {
      current: inactiveClients,
      change: 0,
    },
    archived: {
      current: archivedClients,
      change: 0,
    },
  });
});

router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    
    const dealAmountCurrency: Currency | null = parsed.data.dealAmountCurrency ? (parsed.data.dealAmountCurrency as Currency) : null;
    const dealAmount = parsed.data.dealAmount ? new Decimal(parsed.data.dealAmount) : null;
    const exchangeSource: ExchangeSource = (parsed.data.dealAmountExchangeSource as ExchangeSource) || 'CBU';

    // Handle exchange rate for deal amount if provided
    let dealAmountExchangeRate: Decimal | null = null;
    let dealAmountInUzs: Decimal | null = null;

    if (dealAmount && dealAmountCurrency) {
      // Get or calculate exchange rate
      if (parsed.data.dealAmountExchangeRate) {
        dealAmountExchangeRate = new Decimal(parsed.data.dealAmountExchangeRate);
      } else if (dealAmountCurrency !== 'UZS') {
        // Auto-fetch latest exchange rate if not provided and currency is not UZS
        try {
          dealAmountExchangeRate = await getLatestExchangeRate(dealAmountCurrency, 'UZS', undefined, exchangeSource);
        } catch (error) {
          return res.status(400).json({
            error: `Exchange rate is required for currency ${dealAmountCurrency}. Failed to fetch latest rate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      } else {
        // UZS currency - rate is always 1
        dealAmountExchangeRate = new Decimal(1);
      }

      // Calculate converted UZS amount
      dealAmountInUzs = calculateAmountUzs(dealAmount, dealAmountCurrency, dealAmountExchangeRate);

      // Validate universal monetary fields
      const validation = validateMonetaryFields({
        amount_original: dealAmount,
        currency: dealAmountCurrency,
        exchange_rate: dealAmountExchangeRate,
        amount_uzs: dealAmountInUzs,
      });

      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Monetary validation failed',
          details: validation.errors,
        });
      }
    }
    
    const createData: any = {
      name: parsed.data.name,
      // Keep old fields for backward compatibility
      dealAmount: dealAmount,
      dealAmountCurrency: dealAmountCurrency,
      dealAmountExchangeRate,
      dealAmountInUzs,
      // Universal monetary fields
      dealAmount_amount_original: dealAmount,
      dealAmount_currency: dealAmountCurrency,
      dealAmount_exchange_rate: dealAmountExchangeRate,
      dealAmount_amount_uzs: dealAmountInUzs,
      dealAmount_exchange_source: dealAmount ? exchangeSource : null,
      phone: parsed.data.phone ?? null,
      // Shartnoma maydonlari
      contractNumber: parsed.data.contractNumber || undefined,
      address: parsed.data.address || undefined,
      inn: parsed.data.inn || undefined,
      email: parsed.data.email || undefined,
      bankName: parsed.data.bankName || undefined,
      bankAddress: parsed.data.bankAddress || undefined,
      bankAccount: parsed.data.bankAccount || undefined,
      transitAccount: parsed.data.transitAccount || undefined,
      bankSwift: parsed.data.bankSwift || undefined,
      correspondentBank: parsed.data.correspondentBank || undefined,
      correspondentBankAccount: parsed.data.correspondentBankAccount || undefined,
      correspondentBankSwift: parsed.data.correspondentBankSwift || undefined,
    };
    
    // Handle credit fields explicitly
    if (parsed.data.creditType !== undefined) {
      createData.creditType = parsed.data.creditType ?? null;
    }
    if (parsed.data.creditLimit !== undefined) {
      createData.creditLimit = parsed.data.creditLimit ?? null;
    }
    if (parsed.data.creditStartDate !== undefined) {
      createData.creditStartDate = parsed.data.creditStartDate ? new Date(parsed.data.creditStartDate) : null;
    }
    
    // Hash password if both email and password are provided
    if (req.body.password && req.body.email) {
      const passwordHash = await hashPassword(req.body.password);
      createData.passwordHash = passwordHash;
    }
    
    console.log('Creating client with data:', JSON.stringify(createData, null, 2));
    
    const client = await prisma.client.create({
      data: createData,
    });
    
    console.log('Created client:', {
      id: client.id,
      creditType: (client as any).creditType,
      creditLimit: (client as any).creditLimit,
      creditStartDate: (client as any).creditStartDate,
    });
    
    res.status(201).json(client);
  } catch (error: any) {
    console.error('Error creating client:', error);
    res.status(500).json({ 
      error: 'Xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        tasks: {
          include: { branch: true },
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          where: { type: 'INCOME' },
          orderBy: { date: 'desc' },
        },
      },
    });
    
    // #region agent log
    const logAfterQuery = {location:'clients.ts:99',message:'After Prisma query',data:{clientFound:!!client,hasTasks:!!client?.tasks,hasTransactions:!!client?.transactions,tasksCount:client?.tasks?.length,transactionsCount:client?.transactions?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
    console.log('[DEBUG]', JSON.stringify(logAfterQuery));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logAfterQuery)}).catch(()=>{});
    // #endregion
    
    if (!client) return res.status(404).json({ error: 'Not found' });

    // Calculate stats
    const dealCurrency = (client as any).dealAmountCurrency || 'USD';
    // Faqat shu valyutadagi transaction'larni hisoblash
    const totalIncome = client.transactions
      .filter(t => t.currency === dealCurrency)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalTasks = client.tasks.length;
    const dealAmount = Number(client.dealAmount || 0);
    
    // PSR bor bo'lgan tasklar sonini hisoblash
    const tasksWithPsr = client.tasks.filter(task => task.hasPsr).length;
    const tasksWithoutPsr = totalTasks - tasksWithPsr;
    
    // Har bir task bo'yicha kelishuv summasini yig'amiz
    // snapshotDealAmount bo'lsa o'shani olamiz, bo'lmasa client.dealAmount
    // PSR bo'lsa +10 qo'shamiz
    const totalDealAmount = client.tasks.reduce((sum, task) => {
      const baseAmount = task.snapshotDealAmount != null
        ? Number(task.snapshotDealAmount)
        : dealAmount;
      const psrAmount = task.hasPsr ? 10 : 0;
      return sum + baseAmount + psrAmount;
    }, 0);
    
    // Qoldiq = Jami shartnoma summasi - Jami kirim
    const balance = totalDealAmount - totalIncome;
    
    const tasksByBranch = client.tasks.reduce((acc: any, task) => {
      const branchName = task.branch?.name || 'Unknown';
      acc[branchName] = (acc[branchName] || 0) + 1;
      return acc;
    }, {});

    // #region agent log
    const logBeforeResponse = {location:'clients.ts:135',message:'Before sending response',data:{totalIncome,totalTasks,dealAmount,totalDealAmount,balance},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
    console.log('[DEBUG]', JSON.stringify(logBeforeResponse));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logBeforeResponse)}).catch(()=>{});
    // #endregion

    res.json({
      ...client,
      stats: {
        dealAmount,
        totalDealAmount, // Jami shartnoma summasi (PSR hisobga olingan)
        totalIncome,
        balance,
        tasksByBranch,
        totalTasks,
        tasksWithPsr, // PSR bor bo'lgan tasklar soni
      },
    });
  } catch (error: any) {
    // #region agent log
    const logError = {location:'clients.ts:150',message:'Error in GET /:id',data:{errorMessage:error?.message,errorName:error?.name,errorCode:error?.code,prismaError:error?.meta,errorStack:error instanceof Error?error.stack:'No stack'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'};
    console.log('[DEBUG ERROR]', JSON.stringify(logError, null, 2));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logError)}).catch(()=>{});
    // #endregion
    console.error('Error fetching client:', error);
    res.status(500).json({ 
      error: 'Xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/:id/monthly-tasks', async (req, res) => {
  const id = Number(req.params.id);
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return res.status(404).json({ error: 'Not found' });

  // Get tasks for the last 12 months
  const now = new Date();
  const months: { month: string; count: number }[] = [];
  
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    
    const monthName = monthStart.toLocaleDateString('uz-UZ', { month: 'short', year: 'numeric' });
    
    const count = await prisma.task.count({
      where: {
        clientId: id,
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });
    
    months.push({ month: monthName, count });
  }

  res.json(months);
});

router.patch('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    
    // Build update data - use Prisma's update with explicit field mapping
    const updateData: any = {};
    
    // Standard fields
    if (req.body.name !== undefined) {
      updateData.name = req.body.name;
    }

    // Handle deal amount with exchange rate
    const dealAmountChanged = req.body.dealAmount !== undefined;
    const currencyChanged = req.body.dealAmountCurrency !== undefined;
    const exchangeRateChanged = req.body.dealAmountExchangeRate !== undefined;

      if (dealAmountChanged || currencyChanged || exchangeRateChanged) {
      // Get current client to check existing values
      const currentClient = await prisma.client.findUnique({
        where: { id },
        select: { dealAmount: true, dealAmountCurrency: true, dealAmountExchangeRate: true, dealAmount_exchange_source: true },
      });

      const newDealAmount = dealAmountChanged 
        ? (req.body.dealAmount === null || req.body.dealAmount === '' ? null : new Decimal(req.body.dealAmount))
        : (currentClient?.dealAmount ? new Decimal(currentClient.dealAmount) : null);
      
      const newCurrency: Currency | null = currencyChanged
        ? (req.body.dealAmountCurrency || null)
        : (currentClient?.dealAmountCurrency as Currency | null);

      const exchangeSource: ExchangeSource = (req.body.dealAmountExchangeSource as ExchangeSource) || currentClient?.dealAmount_exchange_source || 'CBU';

      if (newDealAmount && newCurrency) {
        // Get or calculate exchange rate
        let exchangeRate: Decimal;
        if (exchangeRateChanged && req.body.dealAmountExchangeRate) {
          exchangeRate = new Decimal(req.body.dealAmountExchangeRate);
        } else if (currentClient?.dealAmountExchangeRate && !currencyChanged) {
          // Keep existing exchange rate if currency hasn't changed
          exchangeRate = new Decimal(currentClient.dealAmountExchangeRate);
        } else if (newCurrency !== 'UZS') {
          // Auto-fetch latest exchange rate
          try {
            exchangeRate = await getLatestExchangeRate(newCurrency, 'UZS', undefined, exchangeSource);
          } catch (error) {
            return res.status(400).json({
              error: `Exchange rate is required for currency ${newCurrency}. Failed to fetch latest rate: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        } else {
          // UZS currency - rate is always 1
          exchangeRate = new Decimal(1);
        }

        const amountUzs = calculateAmountUzs(newDealAmount, newCurrency, exchangeRate);

        // Validate universal monetary fields
        const validation = validateMonetaryFields({
          amount_original: newDealAmount,
          currency: newCurrency,
          exchange_rate: exchangeRate,
          amount_uzs: amountUzs,
        });

        if (!validation.isValid) {
          return res.status(400).json({
            error: 'Monetary validation failed',
            details: validation.errors,
          });
        }

        // Keep old fields for backward compatibility
        updateData.dealAmount = newDealAmount;
        updateData.dealAmountCurrency = newCurrency;
        updateData.dealAmountExchangeRate = exchangeRate;
        updateData.dealAmountInUzs = amountUzs;
        // Universal monetary fields
        updateData.dealAmount_amount_original = newDealAmount;
        updateData.dealAmount_currency = newCurrency;
        updateData.dealAmount_exchange_rate = exchangeRate;
        updateData.dealAmount_amount_uzs = amountUzs;
        updateData.dealAmount_exchange_source = exchangeSource;
      } else {
        // Clearing deal amount
        updateData.dealAmount = null;
        updateData.dealAmountCurrency = null;
        updateData.dealAmountExchangeRate = null;
        updateData.dealAmountInUzs = null;
        updateData.dealAmount_amount_original = null;
        updateData.dealAmount_currency = null;
        updateData.dealAmount_exchange_rate = null;
        updateData.dealAmount_amount_uzs = null;
        updateData.dealAmount_exchange_source = null;
      }
    }
    if (req.body.phone !== undefined) {
      updateData.phone = req.body.phone === null || req.body.phone === '' ? null : req.body.phone;
    }
    
    // Shartnoma maydonlari
    if (req.body.contractNumber !== undefined) {
      updateData.contractNumber = req.body.contractNumber === null || req.body.contractNumber === '' ? undefined : req.body.contractNumber;
    }
    if (req.body.address !== undefined) {
      updateData.address = req.body.address === null || req.body.address === '' ? undefined : req.body.address;
    }
    if (req.body.inn !== undefined) {
      updateData.inn = req.body.inn === null || req.body.inn === '' ? undefined : req.body.inn;
    }
    if (req.body.email !== undefined) {
      updateData.email = req.body.email === null || req.body.email === '' ? undefined : req.body.email;
    }
    if (req.body.bankName !== undefined) {
      updateData.bankName = req.body.bankName === null || req.body.bankName === '' ? undefined : req.body.bankName;
    }
    if (req.body.bankAddress !== undefined) {
      updateData.bankAddress = req.body.bankAddress === null || req.body.bankAddress === '' ? undefined : req.body.bankAddress;
    }
    if (req.body.bankAccount !== undefined) {
      updateData.bankAccount = req.body.bankAccount === null || req.body.bankAccount === '' ? undefined : req.body.bankAccount;
    }
    if (req.body.transitAccount !== undefined) {
      updateData.transitAccount = req.body.transitAccount === null || req.body.transitAccount === '' ? undefined : req.body.transitAccount;
    }
    if (req.body.bankSwift !== undefined) {
      updateData.bankSwift = req.body.bankSwift === null || req.body.bankSwift === '' ? undefined : req.body.bankSwift;
    }
    if (req.body.correspondentBank !== undefined) {
      updateData.correspondentBank = req.body.correspondentBank === null || req.body.correspondentBank === '' ? undefined : req.body.correspondentBank;
    }
    if (req.body.correspondentBankAccount !== undefined) {
      updateData.correspondentBankAccount = req.body.correspondentBankAccount === null || req.body.correspondentBankAccount === '' ? undefined : req.body.correspondentBankAccount;
    }
    if (req.body.correspondentBankSwift !== undefined) {
      updateData.correspondentBankSwift = req.body.correspondentBankSwift === null || req.body.correspondentBankSwift === '' ? undefined : req.body.correspondentBankSwift;
    }
    
    // Credit fields - ALWAYS include if present in request
    if ('creditType' in req.body) {
      updateData.creditType = (req.body.creditType === '' || req.body.creditType === null || req.body.creditType === undefined)
        ? null
        : String(req.body.creditType);
    }
    
    if ('creditLimit' in req.body) {
      if (req.body.creditLimit === '' || req.body.creditLimit === null || req.body.creditLimit === undefined) {
        updateData.creditLimit = null;
      } else {
        const limitValue = typeof req.body.creditLimit === 'string' 
          ? parseFloat(req.body.creditLimit) 
          : Number(req.body.creditLimit);
        // Use Prisma.Decimal for proper type handling
        updateData.creditLimit = isNaN(limitValue) ? null : new Prisma.Decimal(limitValue);
      }
    }
    
    if ('creditStartDate' in req.body) {
      updateData.creditStartDate = (req.body.creditStartDate === '' || req.body.creditStartDate === null || req.body.creditStartDate === undefined)
        ? null
        : new Date(req.body.creditStartDate);
    }
    
    // Hash password if provided
    if (req.body.password) {
      const passwordHash = await hashPassword(req.body.password);
      updateData.passwordHash = passwordHash;
    }
    
    console.log('Update data before Prisma:', JSON.stringify(updateData, null, 2));
    
    // Update using Prisma with explicit data object
    const updatedClient = await prisma.client.update({
      where: { id },
      data: updateData,
    });
    
    console.log('Updated client from Prisma:', {
      id: updatedClient.id,
      creditType: (updatedClient as any).creditType,
      creditLimit: (updatedClient as any).creditLimit,
      creditStartDate: (updatedClient as any).creditStartDate,
    });
    
    // Return all fields explicitly
    res.json({
      id: updatedClient.id,
      name: updatedClient.name,
      dealAmount: updatedClient.dealAmount,
      phone: updatedClient.phone,
      passwordHash: updatedClient.passwordHash,
      creditType: (updatedClient as any).creditType,
      creditLimit: (updatedClient as any).creditLimit,
      creditStartDate: (updatedClient as any).creditStartDate,
      createdAt: updatedClient.createdAt,
      updatedAt: updatedClient.updatedAt,
    });
  } catch (error: any) {
    console.error('Error updating client:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
    res.status(500).json({ 
      error: 'Xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.client.delete({ where: { id } });
  res.status(204).send();
});

// Client invoice stats endpoint (for client dashboard)
router.get('/me/invoice-stats', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (user.role !== 'CLIENT') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const monthParam = String(req.query.month || '');
    const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);
    const parsedMonth = monthSchema.safeParse(monthParam);
    if (!parsedMonth.success) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
    }

    const [yearStr, monthStr] = parsedMonth.data.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const startDate = new Date(Date.UTC(year, monthIndex, 1));
    const endDate = new Date(Date.UTC(year, monthIndex + 1, 1));

    const invoices = await prisma.invoice.findMany({
      where: {
        clientId: user.id,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        currency: true,
        items: {
          select: {
            name: true,
            quantity: true,
            totalPrice: true,
          },
        },
        contract: {
          select: {
            destinationCountry: true,
          },
        },
      },
    });

    const totals = { totalQuantity: 0, totalValue: 0 };
    const productMap = new Map<string, { name: string; totalQuantity: number; totalValue: number }>();
    const countryMap = new Map<string, { country: string; totalQuantity: number; totalValue: number }>();

    const currencySet = new Set<string>();
    invoices.forEach((invoice) => {
      currencySet.add(invoice.currency);
      const country = invoice.contract?.destinationCountry || 'Noma\'lum';
      invoice.items.forEach((item) => {
        const quantity = Number(item.quantity || 0);
        const totalValue = Number(item.totalPrice || 0);

        totals.totalQuantity += quantity;
        totals.totalValue += totalValue;

        const productEntry = productMap.get(item.name) || {
          name: item.name,
          totalQuantity: 0,
          totalValue: 0,
        };
        productEntry.totalQuantity += quantity;
        productEntry.totalValue += totalValue;
        productMap.set(item.name, productEntry);

        const countryEntry = countryMap.get(country) || {
          country,
          totalQuantity: 0,
          totalValue: 0,
        };
        countryEntry.totalQuantity += quantity;
        countryEntry.totalValue += totalValue;
        countryMap.set(country, countryEntry);
      });
    });

    const products = Array.from(productMap.values()).sort((a, b) => b.totalValue - a.totalValue);
    const countries = Array.from(countryMap.values()).sort((a, b) => b.totalValue - a.totalValue);

    res.json({
      month: parsedMonth.data,
      currency: currencySet.size === 1 ? Array.from(currencySet)[0] : 'MIXED',
      totals,
      products,
      countries,
    });
  } catch (error: any) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi', details: error.message });
  }
});

// Client tasks endpoint (for client dashboard) - CLIENT can access their own, ADMIN can access any
router.get('/:id/tasks', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    // Check if CLIENT is accessing their own data
    if (userRole === 'CLIENT' && userId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get tasks with branch information
    const tasks = await prisma.task.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // Format response to match frontend expectations
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      createdAt: task.createdAt,
      branch: task.branch ? {
        name: task.branch.name
      } : null,
    }));
    
    res.json(formattedTasks);
  } catch (error: any) {
    console.error('Error fetching client tasks:', error);
    res.status(500).json({ 
      error: 'Ishlarni yuklashda xatolik yuz berdi', 
      details: error.message || 'Noma\'lum xatolik'
    });
  }
});

// Client transactions endpoint (for client dashboard) - CLIENT can access their own, ADMIN can access any
router.get('/:id/transactions', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    // Check if CLIENT is accessing their own data
    if (userRole === 'CLIENT' && userId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const transactions = await prisma.transaction.findMany({
      where: { clientId: id },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        date: true,
        comment: true,
      },
    });
    
    res.json(transactions);
  } catch (error: any) {
    console.error('Error fetching client transactions:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi', details: error.message });
  }
});

export default router;

