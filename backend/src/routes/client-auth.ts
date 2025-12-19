import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const router = Router();

// Client login schema
const clientLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Client login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = clientLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Email va parol to\'ldirilishi shart' });
    }

    const { email, password } = parsed.data;

    // Find client by email
    const client = await prisma.client.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        passwordHash: true,
        active: true,
      },
    });

    if (!client) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    }

    if (!client.active) {
      return res.status(403).json({ error: 'Hisobingiz faol emas. Administrator bilan bog\'laning' });
    }

    if (!client.passwordHash) {
      return res.status(403).json({ error: 'Parol sozlanmagan. Administrator bilan bog\'laning' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, client.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { clientId: client.id, type: 'client' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { clientId: client.id, type: 'client' },
      config.jwtRefreshSecret,
      { expiresIn: '7d' }
    );

    res.json({
      accessToken,
      refreshToken,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
      },
    });
  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Client dashboard statistics
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token topilmadi' });
    }

    const token = authHeader.substring(7);
    
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as { clientId: number; type: string };
    } catch (error) {
      return res.status(401).json({ error: 'Token yaroqsiz' });
    }

    if (decoded.type !== 'client') {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }

    const clientId = decoded.clientId;

    // Get client info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dealAmount: true,
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Mijoz topilmadi' });
    }

    // Get tasks statistics
    const tasks = await prisma.task.findMany({
      where: { clientId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        snapshotDealAmount: true,
        stages: {
          select: {
            status: true,
            completedAt: true,
            startedAt: true,
          },
        },
      },
    });

    // Calculate statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'YAKUNLANDI').length;
    const inProgressTasks = tasks.filter(t => 
      t.status === 'JARAYONDA' || t.status === 'TAYYOR' || t.status === 'TEKSHIRILGAN' || t.status === 'TOPSHIRILDI'
    ).length;
    const notStartedTasks = tasks.filter(t => t.status === 'BOSHLANMAGAN').length;

    // Calculate average task duration (in days) for completed tasks
    let averageDurationDays = 0;
    const completedTasksWithDates = tasks.filter(t => {
      const lastStage = t.stages.find(s => s.completedAt);
      return lastStage && lastStage.completedAt;
    });

    if (completedTasksWithDates.length > 0) {
      const totalDays = completedTasksWithDates.reduce((sum, task) => {
        const lastCompletedStage = task.stages
          .filter(s => s.completedAt)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
        
        if (lastCompletedStage?.completedAt) {
          const daysDiff = Math.ceil(
            (new Date(lastCompletedStage.completedAt).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + daysDiff;
        }
        return sum;
      }, 0);
      averageDurationDays = Math.round(totalDays / completedTasksWithDates.length);
    }

    // Calculate total project amount
    const totalProjectAmount = tasks.reduce((sum, task) => {
      const amount = task.snapshotDealAmount ? Number(task.snapshotDealAmount) : 0;
      return sum + amount;
    }, 0);

    // Get client transactions (payments)
    const transactions = await prisma.transaction.findMany({
      where: {
        clientId,
        type: 'INCOME', // Only income transactions (client payments)
      },
      select: {
        amount: true,
      },
    });

    const totalPaid = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = totalProjectAmount - totalPaid; // Debt if positive, credit if negative

    res.json({
      client: {
        name: client.name,
        email: client.email,
        phone: client.phone,
      },
      statistics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        averageDurationDays,
        totalProjectAmount: Number(totalProjectAmount.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        balance: Number(balance.toFixed(2)), // Positive = debt, Negative = overpaid
      },
    });
  } catch (error) {
    console.error('Client dashboard error:', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Client tasks list
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token topilmadi' });
    }

    const token = authHeader.substring(7);
    
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as { clientId: number; type: string };
    } catch (error) {
      return res.status(401).json({ error: 'Token yaroqsiz' });
    }

    if (decoded.type !== 'client') {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }

    const clientId = decoded.clientId;
    const { search, status } = req.query;

    const where: any = { clientId };

    if (search) {
      where.title = {
        contains: search as string,
        mode: 'insensitive',
      };
    }

    if (status) {
      where.status = status;
    }

    const tasks = await prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        hasPsr: true,
        comments: true,
        snapshotDealAmount: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        stages: {
          select: {
            id: true,
            name: true,
            status: true,
            stageOrder: true,
            completedAt: true,
            durationMin: true,
          },
          orderBy: {
            stageOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(tasks);
  } catch (error) {
    console.error('Client tasks list error:', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Client task detail
router.get('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token topilmadi' });
    }

    const token = authHeader.substring(7);
    
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as { clientId: number; type: string };
    } catch (error) {
      return res.status(401).json({ error: 'Token yaroqsiz' });
    }

    if (decoded.type !== 'client') {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }

    const clientId = decoded.clientId;
    const taskId = Number(req.params.id);

    console.log('Fetching task for client:', { taskId, clientId });

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        clientId, // Only allow access to own tasks
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        stages: {
          select: {
            id: true,
            name: true,
            status: true,
            stageOrder: true,
            startedAt: true,
            completedAt: true,
            durationMin: true,
          },
          orderBy: {
            stageOrder: 'asc',
          },
        },
        documents: {
          select: {
            id: true,
            name: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
            description: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Topshiriq topilmadi' });
    }

    console.log('Task found, status:', task.status);

    // Agar task yakunlangan bo'lsa, arxiv hujjatlarni ham qo'shamiz
    let allDocuments = [...task.documents];
    
    if (task.status === 'YAKUNLANDI') {
      console.log('Task is completed, fetching archive documents...');
      const archiveDocuments = await prisma.archiveDocument.findMany({
        where: { taskId },
        select: {
          id: true,
          name: true,
          fileUrl: true,
          fileType: true,
          fileSize: true,
          description: true,
          archivedAt: true,
        },
        orderBy: { archivedAt: 'desc' },
      });
      
      console.log('Archive documents found:', archiveDocuments.length);
      
      // Archive hujjatlarni formatlash (createdAt o'rniga archivedAt)
      const formattedArchiveDocs = archiveDocuments.map(doc => ({
        ...doc,
        createdAt: doc.archivedAt,
      }));
      
      allDocuments = [...allDocuments, ...formattedArchiveDocs];
    }

    console.log('Total documents (TaskDocument + ArchiveDocument):', allDocuments.length);

    // Response'ga documents qo'shamiz
    const response = {
      ...task,
      documents: allDocuments,
    };

    res.json(response);
  } catch (error) {
    console.error('Client task detail error:', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

export default router;

