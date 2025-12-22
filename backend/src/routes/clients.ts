import { Router } from 'express';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { hashPassword } from '../utils/hash';

const router = Router();

const clientSchema = z.object({
  name: z.string().min(1),
  dealAmount: z.number().optional(),
  dealAmountCurrency: z.enum(['USD', 'UZS']).optional(),
  phone: z.string().optional(),
  creditType: z.enum(['TASK_COUNT', 'AMOUNT']).optional().nullable(),
  creditLimit: z.union([z.number(), z.string()]).optional().nullable().transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    return typeof val === 'string' ? parseFloat(val) : val;
  }),
  creditStartDate: z.union([z.string(), z.date()]).optional().nullable(), // ISO date string or Date
});

router.get('/', async (_req, res) => {
  // #region agent log
  const logEntry = {location:'clients.ts:17',message:'GET /clients entry - checking active field',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
  console.log('[DEBUG]', JSON.stringify(logEntry));
  fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logEntry)}).catch(()=>{});
  // #endregion
  
  const clients = await prisma.client.findMany({ 
    include: {
      tasks: {
        select: {
          id: true,
          hasPsr: true,
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
  
  // Calculate balance for each client
  const clientsWithBalance = clients.map(client => {
    const dealAmount = Number(client.dealAmount || 0);
    const dealCurrency = (client as any).dealAmountCurrency || 'USD';
    const totalTasks = client.tasks.length;
    const tasksWithPsr = client.tasks.filter(t => t.hasPsr).length;
    
    // Calculate total deal amount (with PSR)
    const totalDealAmount = (dealAmount * totalTasks) + (10 * tasksWithPsr);
    
    // Calculate total income - faqat shu valyutadagi transaction'larni hisoblash
    const totalIncome = client.transactions
      .filter(t => t.currency === dealCurrency)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Calculate balance (debt)
    const balance = totalDealAmount - totalIncome;
    
    return {
      ...client,
      balance,
      totalDealAmount,
      totalIncome,
    };
  });
  
  res.json(clientsWithBalance);
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
    
    const createData: any = {
      name: parsed.data.name,
      dealAmount: parsed.data.dealAmount ?? null,
      dealAmountCurrency: parsed.data.dealAmountCurrency ?? 'USD',
      phone: parsed.data.phone ?? null,
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
    // #region agent log
    const logEntry = {location:'clients.ts:84',message:'GET /clients/:id entry',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
    console.log('[DEBUG]', JSON.stringify(logEntry));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logEntry)}).catch(()=>{});
    // #endregion
    
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
    
    // PSR bor bo'lgan tasklar uchun dealAmount + 10, qolganlari uchun dealAmount
    // Jami shartnoma summasi = (dealAmount + 10) * tasksWithPsr + dealAmount * tasksWithoutPsr
    // Yoki oddiyroq: dealAmount * totalTasks + 10 * tasksWithPsr
    const totalDealAmount = (dealAmount * totalTasks) + (10 * tasksWithPsr);
    
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
    if (req.body.dealAmount !== undefined) {
      updateData.dealAmount = req.body.dealAmount === null || req.body.dealAmount === '' 
        ? null 
        : parseFloat(req.body.dealAmount);
    }
    if (req.body.dealAmountCurrency !== undefined) {
      updateData.dealAmountCurrency = req.body.dealAmountCurrency || 'USD';
    }
    if (req.body.phone !== undefined) {
      updateData.phone = req.body.phone === null || req.body.phone === '' ? null : req.body.phone;
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

