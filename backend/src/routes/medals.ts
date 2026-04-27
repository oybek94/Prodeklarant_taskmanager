import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { socketEmitter } from '../services/socketEmitter';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from 'date-fns';

const router = Router();

const nominationsSchema = z.object({
  type: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  date: z.string().optional(), // YYYY-MM-DD
});

router.get('/nominations', requireAuth('ADMIN'), async (req, res) => {
  try {
    const parsed = nominationsSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });

    const { type, date } = parsed.data;
    const refDate = date ? new Date(date) : new Date();

    let startDate: Date;
    let endDate: Date;
    let periodStr: string;

    if (type === 'WEEKLY') {
      startDate = startOfWeek(refDate, { weekStartsOn: 1 });
      endDate = endOfWeek(refDate, { weekStartsOn: 1 });
      // Example: 2026-W17
      const getWeek = (d: Date) => {
        const d1 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = d1.getUTCDay() || 7;
        d1.setUTCDate(d1.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d1.getUTCFullYear(),0,1));
        return Math.ceil((((d1.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
      };
      periodStr = `${startDate.getFullYear()}-W${getWeek(startDate)}`;
    } else if (type === 'MONTHLY') {
      startDate = startOfMonth(refDate);
      endDate = endOfMonth(refDate);
      periodStr = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;
    } else if (type === 'QUARTERLY') {
      startDate = startOfQuarter(refDate);
      endDate = endOfQuarter(refDate);
      periodStr = `${startDate.getFullYear()}-Q${Math.floor(startDate.getMonth() / 3) + 1}`;
    } else {
      startDate = new Date(refDate.getFullYear(), 4, 1); // 1-may
      endDate = endOfYear(refDate); // 31-dekabrgacha
      periodStr = `${startDate.getFullYear()}`;
    }

    const nominations: any[] = [];

    // Helper to get active users
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, xp: true }
    });

    if (type === 'WEEKLY') {
      // 1. Tezkor Deklarant: Eng ko'p yopilgan jarayonlar (TaskStage completed)
      const stages = await prisma.taskStage.groupBy({
        by: ['assignedToId'],
        where: { completedAt: { gte: startDate, lte: endDate }, assignedToId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });
      const topWorker = stages[0];
      if (topWorker && topWorker.assignedToId) {
        nominations.push({
          userId: topWorker.assignedToId,
          medalType: 'FAST_WORKER',
          period: periodStr,
          reason: `Eng ko'p jarayon bajargan (${topWorker._count.id} ta)`,
          cashBonus: 100000,
          xpBonus: 20,
        });
      }

      // 2. Hafta Qalqoni: Eng ko'p jarayon + 0 xato
      const errors = await prisma.taskError.groupBy({
        by: ['workerId'],
        where: { date: { gte: startDate, lte: endDate } },
        _count: { id: true }
      });
      const workersWithErrors = new Set(errors.map(e => e.workerId));
      const flawlessWorkers = stages.filter(s => s.assignedToId && !workersWithErrors.has(s.assignedToId));
      if (flawlessWorkers.length > 0) {
        // Since sorted by _count desc, the first one is the one with most tasks among flawless
        const flawlessWinner = flawlessWorkers[0];
        nominations.push({
          userId: flawlessWinner.assignedToId,
          medalType: 'SHIELD',
          period: periodStr,
          reason: `0 xato va ${flawlessWinner._count.id} ta jarayon`,
          cashBonus: 50000,
          xpBonus: 10,
        });
      }

      // 3. Lochin Ko'z: Boshqa xodimlarning eng ko'p xatosini topgan (createdById != workerId)
      const foundErrors = await prisma.taskError.findMany({
        where: { date: { gte: startDate, lte: endDate } },
      });
      const foundCount: Record<number, number> = {};
      foundErrors.forEach(e => {
        if (e.createdById !== e.workerId) {
          foundCount[e.createdById] = (foundCount[e.createdById] || 0) + 1;
        }
      });
      const topFinderId = Object.keys(foundCount).sort((a, b) => foundCount[Number(b)] - foundCount[Number(a)])[0];
      if (topFinderId) {
        nominations.push({
          userId: Number(topFinderId),
          medalType: 'EAGLE_EYE',
          period: periodStr,
          reason: `Eng ko'p xato topgan (${foundCount[Number(topFinderId)]} ta)`,
          cashBonus: 100000,
          xpBonus: 20,
        });
      }
    }

    if (type === 'MONTHLY') {
      // Oltin K/D Master: Highest K/D (Tasks / Errors)
      const stages = await prisma.taskStage.groupBy({
        by: ['assignedToId'],
        where: { completedAt: { gte: startDate, lte: endDate }, assignedToId: { not: null } },
        _count: { id: true },
      });
      const errors = await prisma.taskError.groupBy({
        by: ['workerId'],
        where: { date: { gte: startDate, lte: endDate } },
        _count: { id: true },
      });
      let bestKdWinner: any = null;
      let bestKd = -1;
      stages.forEach(s => {
        if (!s.assignedToId) return;
        const errs = errors.find(e => e.workerId === s.assignedToId)?._count.id || 0;
        const kd = errs === 0 ? s._count.id : s._count.id / errs;
        if (kd > bestKd) { bestKd = kd; bestKdWinner = s; }
      });
      if (bestKdWinner && bestKdWinner.assignedToId) {
        nominations.push({
          userId: bestKdWinner.assignedToId,
          medalType: 'GOLDEN_KD',
          period: periodStr,
          reason: `Eng yuqori K/D (${bestKd.toFixed(2)})`,
          cashBonus: 500000,
          xpBonus: 100,
        });
      }

      // O'sish Chempioni
      const prevStartDate = subMonths(startDate, 1);
      const prevEndDate = subMonths(endDate, 1);
      const prevStages = await prisma.taskStage.groupBy({
        by: ['assignedToId'],
        where: { completedAt: { gte: prevStartDate, lte: prevEndDate }, assignedToId: { not: null } },
        _count: { id: true },
      });
      let bestGrowthUser: any = null;
      let bestGrowthPct = -1;
      stages.forEach(s => {
        if (!s.assignedToId) return;
        const prev = prevStages.find(p => p.assignedToId === s.assignedToId)?._count.id || 0;
        if (prev > 0) {
          const pct = ((s._count.id - prev) / prev) * 100;
          if (pct > bestGrowthPct) { bestGrowthPct = pct; bestGrowthUser = s; }
        }
      });
      if (bestGrowthUser && bestGrowthUser.assignedToId && bestGrowthPct > 0) {
        nominations.push({
          userId: bestGrowthUser.assignedToId,
          medalType: 'GROWTH_CHAMPION',
          period: periodStr,
          reason: `O'sish ko'rsatkichi +${bestGrowthPct.toFixed(1)}%`,
          cashBonus: 300000,
          xpBonus: 60,
        });
      }

      // Tungi Boyqush (Admin o'zi kiritadi, lekin bo'sh template qaytaramiz)
      nominations.push({
        userId: null, // Admin selects
        medalType: 'NIGHT_OWL',
        period: periodStr,
        reason: 'Jamoa bilan tanlanadi',
        cashBonus: 200000,
        xpBonus: 40,
      });
    }

    if (type === 'QUARTERLY') {
      // Kompaniya Ustuni: oxirgi 3 oy K/D
      const stages = await prisma.taskStage.groupBy({
        by: ['assignedToId'],
        where: { completedAt: { gte: startDate, lte: endDate }, assignedToId: { not: null } },
        _count: { id: true },
      });
      const errors = await prisma.taskError.groupBy({
        by: ['workerId'],
        where: { date: { gte: startDate, lte: endDate } },
        _count: { id: true },
      });
      let bestKdWinner: any = null;
      let bestKd = -1;
      stages.forEach(s => {
        if (!s.assignedToId) return;
        const errs = errors.find(e => e.workerId === s.assignedToId)?._count.id || 0;
        const kd = errs === 0 ? s._count.id : s._count.id / errs;
        if (kd > bestKd) { bestKd = kd; bestKdWinner = s; }
      });
      if (bestKdWinner && bestKdWinner.assignedToId) {
        nominations.push({
          userId: bestKdWinner.assignedToId,
          medalType: 'COMPANY_PILLAR',
          period: periodStr,
          reason: `Chorak davomida eng baland K/D (${bestKd.toFixed(2)})`,
          cashBonus: 1500000,
          xpBonus: 300,
        });
      }

      // Muammolar Kushandasi (Chorak davomida eng ko'p xato topgan)
      const foundErrors = await prisma.taskError.findMany({
        where: { date: { gte: startDate, lte: endDate } },
      });
      const foundCount: Record<number, number> = {};
      foundErrors.forEach(e => {
        if (e.createdById !== e.workerId) {
          foundCount[e.createdById] = (foundCount[e.createdById] || 0) + 1;
        }
      });
      const topFinderId = Object.keys(foundCount).sort((a, b) => foundCount[Number(b)] - foundCount[Number(a)])[0];
      if (topFinderId) {
        nominations.push({
          userId: Number(topFinderId),
          medalType: 'PROBLEM_SOLVER',
          period: periodStr,
          reason: `Chorakda eng ko'p xato topgan (${foundCount[Number(topFinderId)]} ta)`,
          cashBonus: 1000000,
          xpBonus: 200,
        });
      }
    }

    if (type === 'YEARLY') {
      const topUser = users.sort((a, b) => b.xp - a.xp)[0];
      if (topUser && topUser.xp > 0) {
        nominations.push({
          userId: topUser.id,
          medalType: 'YEAR_STAR',
          period: periodStr,
          reason: `Yil davomida eng ko'p XP yig'gan (${topUser.xp} XP)`,
          cashBonus: 10000000, // example 10mln or Dubai
          xpBonus: 1000,
        });
      }
    }

    res.json({
      nominations,
      periodStr,
      type
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const awardSchema = z.object({
  userId: z.number(),
  medalType: z.enum(['FAST_WORKER', 'SHIELD', 'EAGLE_EYE', 'GOLDEN_KD', 'GROWTH_CHAMPION', 'NIGHT_OWL', 'COMPANY_PILLAR', 'PROBLEM_SOLVER', 'YEAR_STAR']),
  period: z.string(),
  cashBonus: z.number(),
  xpBonus: z.number(),
});

router.post('/award', requireAuth('ADMIN'), async (req, res) => {
  try {
    const parsed = awardSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });

    const { userId, medalType, period, cashBonus, xpBonus } = parsed.data;

    // Check if already awarded
    const existing = await prisma.userMedal.findFirst({
      where: { userId, medalType, period }
    });
    if (existing) {
      return res.status(400).json({ error: 'Ushbu medal bu davr uchun allaqachon berilgan.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const medal = await (tx as any).userMedal.create({
        data: {
          userId,
          medalType,
          period,
          cashBonus,
          xpBonus
        }
      });

      await (tx as any).user.update({
        where: { id: userId },
        data: { xp: { increment: xpBonus } }
      });

      // Notification
      const notif = await (tx as any).notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          title: 'Yangi Medal!',
          message: `Tabriklaymiz! Siz ${medalType} medalini qo'lga kiritdingiz!`,
          metadata: {
            isMedalAnimation: true,
            medalType,
            cashBonus,
            xpBonus,
          }
        }
      });

      return { medal, notif };
    });

    socketEmitter.toUser(userId, 'MEDAL_AWARDED', {
      ...result.notif.metadata,
      notificationId: result.notif.id
    });

    res.json(result.medal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-medals', requireAuth(), async (req, res) => {
  try {
    const medals = await prisma.userMedal.findMany({
      where: { userId: (req as any).user?.id },
      orderBy: { awardedAt: 'desc' }
    });
    res.json(medals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate current month's total bonus for a user
router.get('/my-bonus', requireAuth(), async (req, res) => {
  try {
    const start = startOfMonth(new Date());
    const medals = await prisma.userMedal.findMany({
      where: { 
        userId: (req as any).user?.id,
        awardedAt: { gte: start }
      }
    });
    const totalBonus = medals.reduce((acc: number, m: any) => acc + Number(m.cashBonus), 0);
    res.json({ totalBonus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch all medals for leaderboard integration
router.get('/all', requireAuth(), async (req, res) => {
  try {
    const medals = await prisma.userMedal.findMany({
      orderBy: { awardedAt: 'desc' }
    });
    res.json(medals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
