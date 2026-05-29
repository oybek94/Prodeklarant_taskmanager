import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { socketEmitter } from '../services/socketEmitter';
import { MedalService } from '../services/medalService';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from 'date-fns';

const router = Router();

const MEDAL_NAMES: Record<string, string> = {
  FAST_WORKER: 'Entry Fragger',
  SHIELD: 'Flawless Defuser',
  EAGLE_EYE: 'Overwatch',
  GOLDEN_KD: 'Top Fragger',
  NIGHT_OWL: 'Midnight Operative',
  COMPANY_PILLAR: 'The Global Elite',
  PROBLEM_SOLVER: 'Clutch Master',
  YEAR_STAR: 'HLTV #1 Player'
};

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

    let nominations: any[] = [];

    if (type === 'WEEKLY') {
      nominations = await MedalService.calculateWeeklyWinners(startDate, endDate, periodStr);
    } else if (type === 'MONTHLY') {
      nominations = await MedalService.calculateMonthlyWinners(startDate, endDate, periodStr);
    } else if (type === 'QUARTERLY') {
      nominations = await MedalService.calculateQuarterlyWinners(startDate, endDate, periodStr);
    } else if (type === 'YEARLY') {
      nominations = await MedalService.calculateYearlyWinners(startDate, endDate, periodStr);
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
  medalType: z.enum(['FAST_WORKER', 'SHIELD', 'EAGLE_EYE', 'GOLDEN_KD', 'NIGHT_OWL', 'COMPANY_PILLAR', 'PROBLEM_SOLVER', 'YEAR_STAR']),
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

    const awarded = await MedalService.awardMedals([{
      userId, medalType, period, cashBonus, xpBonus, reason: (parsed.data as any).reason || ''
    }]);

    if (awarded.length > 0) {
      res.json(awarded[0]);
    } else {
      res.status(400).json({ error: 'Medal berilmadi.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/force-cron', requireAuth('ADMIN'), async (req, res) => {
  try {
    const { type } = req.body;
    const refDate = new Date(); // To test current period
    let title = '';
    let noms: any[] = [];

    if (type === 'WEEKLY') {
      const startDate = startOfWeek(refDate, { weekStartsOn: 1 });
      const endDate = endOfWeek(refDate, { weekStartsOn: 1 });
      const getWeek = (d: Date) => {
        const d1 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = d1.getUTCDay() || 7;
        d1.setUTCDate(d1.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d1.getUTCFullYear(),0,1));
        return Math.ceil((((d1.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
      };
      const periodStr = `${startDate.getFullYear()}-W${getWeek(startDate)}`;
      noms = await MedalService.calculateWeeklyWinners(startDate, endDate, periodStr);
      title = 'Hafta qahramonlari aniqlandi! Barcha yutuqdorlarni tabriklaymiz!';
    } else if (type === 'MONTHLY') {
      const startDate = startOfMonth(refDate);
      const endDate = endOfMonth(refDate);
      const periodStr = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;
      noms = await MedalService.calculateMonthlyWinners(startDate, endDate, periodStr);
      title = 'Oylik qahramonlar aniqlandi! O\'tgan oyning eng zo\'rlari:';
    } else if (type === 'QUARTERLY') {
      const startDate = startOfQuarter(refDate);
      const endDate = endOfQuarter(refDate);
      const periodStr = `${startDate.getFullYear()}-Q${Math.floor(startDate.getMonth() / 3) + 1}`;
      noms = await MedalService.calculateQuarterlyWinners(startDate, endDate, periodStr);
      title = 'Choraklik qahramonlar aniqlandi! Ular haqiqiy afsonalar:';
    } else if (type === 'YEARLY') {
      const startDate = startOfYear(refDate);
      const endDate = endOfYear(refDate);
      const periodStr = `${startDate.getFullYear()}`;
      noms = await MedalService.calculateYearlyWinners(startDate, endDate, periodStr);
      title = 'Yil yulduzlari aniqlandi! Butun kompaniya qahramoni:';
    }

    const awarded = await MedalService.awardMedals(noms, title);
    res.json({ success: true, awarded });
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
    const totalMedalBonus = medals.reduce((acc: number, m: any) => acc + Number(m.cashBonus), 0);

    const notes = await (prisma as any).dashboardNote.findMany({
      where: {
        completedById: (req as any).user?.id,
        isCompleted: true,
        completedAt: { gte: start },
        bountyReward: { not: null }
      }
    });
    const notesBonus = notes.reduce((acc: number, n: any) => acc + Number(n.bountyReward), 0);

    const totalBonus = totalMedalBonus + notesBonus;
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
