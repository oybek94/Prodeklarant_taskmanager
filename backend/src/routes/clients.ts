import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcrypt';

const router = Router();

const clientSchema = z.object({
  name: z.string().min(1),
  dealAmount: z.number().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  password: z.string().min(6).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
});

router.get('/', async (_req, res) => {
  const clients = await prisma.client.findMany({ 
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      dealAmount: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      tasks: {
        select: {
          id: true,
        },
      },
      // Don't include passwordHash for security
    },
    orderBy: { createdAt: 'desc' } 
  });
  res.json(clients);
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

router.post('/', async (req: AuthRequest, res) => {
  try {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error('Validation error:', parsed.error.flatten());
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    
    // Prepare client data
    const clientData: any = {
      name: parsed.data.name,
      dealAmount: parsed.data.dealAmount ?? null,
      phone: parsed.data.phone ?? null,
    };

    // Only add email if it's provided
    if (parsed.data.email) {
      clientData.email = parsed.data.email;
    }

    // Hash password if both email and password are provided
    if (parsed.data.password && parsed.data.email) {
      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      clientData.passwordHash = passwordHash;
    }

    console.log('Creating client with data:', { ...clientData, passwordHash: clientData.passwordHash ? '[HIDDEN]' : undefined });

    const client = await prisma.client.create({
      data: clientData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dealAmount: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        // Don't return passwordHash
      },
    });
    
    console.log('Client created successfully:', { id: client.id, email: client.email });
    res.status(201).json(client);
  } catch (error: any) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
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
  const totalIncome = client.transactions.reduce((sum, t) => sum + Number(t.amount), 0);
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

  // Remove passwordHash for security
  const { passwordHash, ...clientData } = client;
  
  res.json({
    ...clientData,
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

router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = clientSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      console.error('Validation error:', parsed.error.flatten());
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    
    // Prepare update data - only include fields that are provided
    const updateData: any = {};
    
    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
    }
    if (parsed.data.dealAmount !== undefined) {
      updateData.dealAmount = parsed.data.dealAmount;
    }
    if (parsed.data.phone !== undefined) {
      updateData.phone = parsed.data.phone;
    }
    if (parsed.data.email !== undefined) {
      updateData.email = parsed.data.email;
    }

    // Hash password if provided
    if (parsed.data.password) {
      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      updateData.passwordHash = passwordHash;
    }

    console.log('Updating client', id, 'with data:', { ...updateData, passwordHash: updateData.passwordHash ? '[HIDDEN]' : undefined });

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dealAmount: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        // Don't return passwordHash
      },
    });
    
    console.log('Client updated successfully:', { id: client.id, email: client.email });
    res.json(client);
  } catch (error: any) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.client.delete({ where: { id } });
  res.status(204).send();
});

export default router;

