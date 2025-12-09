import { Router } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const clientSchema = z.object({
  name: z.string().min(1),
  dealAmount: z.number().optional(),
  phone: z.string().optional(),
});

router.get('/', async (_req, res) => {
  const clients = await prisma.client.findMany({ 
    include: {
      tasks: {
        select: {
          id: true,
        },
      },
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
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      dealAmount: parsed.data.dealAmount ?? null,
      phone: parsed.data.phone ?? null,
    },
  });
  res.status(201).json(client);
});

router.get('/:id', async (req, res) => {
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
  if (!client) return res.status(404).json({ error: 'Not found' });

  // Calculate stats
  const totalIncome = client.transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalTasks = client.tasks.length;
  const dealAmount = Number(client.dealAmount || 0);
  // Qoldiq = (Jami loyihalar soni * Shartnoma summasi) - Jami kirim
  const balance = (totalTasks * dealAmount) - totalIncome;
  const tasksByBranch = client.tasks.reduce((acc: any, task) => {
    const branchName = task.branch.name;
    acc[branchName] = (acc[branchName] || 0) + 1;
    return acc;
  }, {});

  res.json({
    ...client,
    stats: {
      dealAmount,
      totalIncome,
      balance,
      tasksByBranch,
      totalTasks,
    },
  });
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
  const id = Number(req.params.id);
  const parsed = clientSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const client = await prisma.client.update({
    where: { id },
    data: {
      name: parsed.data.name,
      dealAmount: parsed.data.dealAmount ?? undefined,
      phone: parsed.data.phone ?? undefined,
    },
  });
  res.json(client);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.client.delete({ where: { id } });
  res.status(204).send();
});

export default router;

