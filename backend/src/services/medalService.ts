import { prisma } from '../prisma';
import { socketEmitter } from './socketEmitter';

export const MEDAL_NAMES: Record<string, string> = {
  FAST_WORKER: 'Entry Fragger',
  SHIELD: 'Flawless Defuser',
  EAGLE_EYE: 'Overwatch',
  GOLDEN_KD: 'Top Fragger',
  NIGHT_OWL: 'Midnight Operative',
  COMPANY_PILLAR: 'The Global Elite',
  PROBLEM_SOLVER: 'Clutch Master',
  YEAR_STAR: 'HLTV #1 Player'
};

export const MEDAL_DESCRIPTIONS: Record<string, string> = {
  FAST_WORKER: 'Hafta davomida eng ko\'p jarayonlarni yopgan',
  SHIELD: 'Hafta davomida xatosiz eng ko\'p jarayon bajargan',
  EAGLE_EYE: 'Boshqalarning eng ko\'p xatosini topgan',
  GOLDEN_KD: 'Oydagi eng yaxshi K/D ko\'rsatkichi',
  NIGHT_OWL: 'Kechasi soat 22:00 dan 06:00 gacha eng ko\'p ishlagan',
  COMPANY_PILLAR: 'Choraklik eng yaxshi K/D',
  PROBLEM_SOLVER: 'Choraklik eng ko\'p xato topgan',
  YEAR_STAR: 'Yillik reytingda eng peshqadam xodim'
};

export class MedalService {

  // Haftalik medallar: FAST_WORKER, SHIELD, EAGLE_EYE
  static async calculateWeeklyWinners(startDate: Date, endDate: Date, periodStr: string) {
    const nominations: any[] = [];
    
    // 1. FAST_WORKER (Entry Fragger)
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
        reason: `Hafta davomida eng ko'p jarayon bajardi (${topWorker._count.id} ta)`,
        cashBonus: 100000,
        xpBonus: 20,
      });
    }

    // 2. SHIELD (Flawless Defuser)
    const errors = await prisma.taskError.groupBy({
      by: ['workerId'],
      where: { date: { gte: startDate, lte: endDate } },
      _count: { id: true }
    });
    const workersWithErrors = new Set(errors.map(e => e.workerId));
    const flawlessWorkers = stages.filter(s => s.assignedToId && !workersWithErrors.has(s.assignedToId));
    if (flawlessWorkers.length > 0) {
      const flawlessWinner = flawlessWorkers[0];
      nominations.push({
        userId: flawlessWinner.assignedToId,
        medalType: 'SHIELD',
        period: periodStr,
        reason: `0 ta xato va ${flawlessWinner._count.id} ta jarayon bajarildi`,
        cashBonus: 50000,
        xpBonus: 10,
      });
    }

    // 3. EAGLE_EYE (Overwatch)
    const foundErrors = await prisma.taskError.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    });
    const foundCount: Record<number, number> = {};
    foundErrors.forEach(e => {
      if (e.workerId !== null && e.createdById !== e.workerId) {
        foundCount[e.createdById] = (foundCount[e.createdById] || 0) + 1;
      }
    });
    const topFinderId = Object.keys(foundCount).sort((a, b) => foundCount[Number(b)] - foundCount[Number(a)])[0];
    if (topFinderId) {
      nominations.push({
        userId: Number(topFinderId),
        medalType: 'EAGLE_EYE',
        period: periodStr,
        reason: `Eng ko'p xato topdi (${foundCount[Number(topFinderId)]} ta)`,
        cashBonus: 100000,
        xpBonus: 20,
      });
    }

    return nominations;
  }

  // Oylik medallar: GOLDEN_KD, NIGHT_OWL
  static async calculateMonthlyWinners(startDate: Date, endDate: Date, periodStr: string) {
    const nominations: any[] = [];
    
    // 1. GOLDEN_KD (Top Fragger)
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
        reason: `Eng yuqori K/D nisbati (${bestKd.toFixed(2)})`,
        cashBonus: 500000,
        xpBonus: 100,
      });
    }

    // 2. NIGHT_OWL (Midnight Operative) - 22:00 dan 06:00 gacha ishlaganlar
    const allStages = await prisma.taskStage.findMany({
      where: { completedAt: { gte: startDate, lte: endDate }, assignedToId: { not: null } },
      select: { assignedToId: true, completedAt: true }
    });

    const nightOwlCounts: Record<number, number> = {};
    allStages.forEach(s => {
      if (s.completedAt && s.assignedToId) {
        // Javascript Date.getHours() returns local time. We need to be careful with timezone if the server is in UTC.
        // Assuming the DB stores UTC and we want to check 22:00 to 06:00 in +05:00 Timezone.
        // So let's get the UTC hour and adjust it to Tashkent Time (UTC+5).
        const utcHour = s.completedAt.getUTCHours();
        const localHour = (utcHour + 5) % 24;
        
        if (localHour >= 22 || localHour < 6) {
          nightOwlCounts[s.assignedToId] = (nightOwlCounts[s.assignedToId] || 0) + 1;
        }
      }
    });

    const topOwlId = Object.keys(nightOwlCounts).sort((a, b) => nightOwlCounts[Number(b)] - nightOwlCounts[Number(a)])[0];
    if (topOwlId) {
      nominations.push({
        userId: Number(topOwlId),
        medalType: 'NIGHT_OWL',
        period: periodStr,
        reason: `Kechasi 22:00-06:00 oralig'ida eng ko'p jarayon bajardi (${nightOwlCounts[Number(topOwlId)]} ta)`,
        cashBonus: 200000,
        xpBonus: 40,
      });
    }

    return nominations;
  }

  // Choraklik medallar: COMPANY_PILLAR, PROBLEM_SOLVER
  static async calculateQuarterlyWinners(startDate: Date, endDate: Date, periodStr: string) {
    const nominations: any[] = [];
    
    // 1. COMPANY_PILLAR (The Global Elite)
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

    // 2. PROBLEM_SOLVER (Clutch Master)
    const foundErrors = await prisma.taskError.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    });
    const foundCount: Record<number, number> = {};
    foundErrors.forEach(e => {
      if (e.workerId !== null && e.createdById !== e.workerId) {
        foundCount[e.createdById] = (foundCount[e.createdById] || 0) + 1;
      }
    });
    const topFinderId = Object.keys(foundCount).sort((a, b) => foundCount[Number(b)] - foundCount[Number(a)])[0];
    if (topFinderId) {
      nominations.push({
        userId: Number(topFinderId),
        medalType: 'PROBLEM_SOLVER',
        period: periodStr,
        reason: `Chorakda eng ko'p xato topdi (${foundCount[Number(topFinderId)]} ta)`,
        cashBonus: 1000000,
        xpBonus: 200,
      });
    }

    return nominations;
  }

  // Yillik medallar: YEAR_STAR
  static async calculateYearlyWinners(startDate: Date, endDate: Date, periodStr: string) {
    const nominations: any[] = [];
    
    // YEAR_STAR (HLTV #1 Player)
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, xp: true }
    });
    
    const topUser = users.sort((a, b) => b.xp - a.xp)[0];
    if (topUser && topUser.xp > 0) {
      nominations.push({
        userId: topUser.id,
        medalType: 'YEAR_STAR',
        period: periodStr,
        reason: `Yil davomida eng ko'p XP yig'di (${topUser.xp} XP)`,
        cashBonus: 10000000, 
        xpBonus: 1000,
      });
    }

    return nominations;
  }

  static async awardMedals(nominations: any[], title?: string) {
    const awardedMedals: any[] = [];
    
    for (const nom of nominations) {
      if (!nom.userId) continue;

      // Check if already awarded
      const existing = await prisma.userMedal.findFirst({
        where: { userId: nom.userId, medalType: nom.medalType, period: nom.period }
      });

      if (!existing) {
        const result = await prisma.$transaction(async (tx) => {
          const medal = await (tx as any).userMedal.create({
            data: {
              userId: nom.userId,
              medalType: nom.medalType,
              period: nom.period,
              cashBonus: nom.cashBonus,
              xpBonus: nom.xpBonus
            }
          });

          await (tx as any).user.update({
            where: { id: nom.userId },
            data: { xp: { increment: nom.xpBonus } }
          });

          // Individual Notification
          const notif = await (tx as any).notification.create({
            data: {
              userId: nom.userId,
              type: 'SYSTEM',
              title: 'Yangi Medal!',
              message: `Tabriklaymiz! Siz ${MEDAL_NAMES[nom.medalType] || nom.medalType} medalini qo'lga kiritdingiz!`,
              metadata: {
                isMedalAnimation: true,
                medalType: nom.medalType,
                cashBonus: nom.cashBonus,
                xpBonus: nom.xpBonus,
              }
            }
          });

          return { medal, notif };
        });

        socketEmitter.toUser(nom.userId, 'MEDAL_AWARDED', {
          ...result.notif.metadata,
          notificationId: result.notif.id
        });
        
        awardedMedals.push({ ...nom, user: await prisma.user.findUnique({ where: { id: nom.userId } }) });
      }
    }
    
    // Send Broadcast to everyone if anyone won and title provided
    if (awardedMedals.length > 0 && title) {
      const allUsers = await prisma.user.findMany({ where: { active: true }, select: { id: true } });
      
      let broadcastMessage = `${title}\n\n`;
      awardedMedals.forEach(m => {
        broadcastMessage += `🏆 ${m.user?.name} - **${MEDAL_NAMES[m.medalType] || m.medalType}**\n(${m.reason})\n\n`;
      });

      for (const u of allUsers) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            type: 'SYSTEM',
            title: 'Taqdirlash!',
            message: broadcastMessage,
          }
        });
        socketEmitter.toUser(u.id, 'NEW_NOTIFICATION', { title: 'Taqdirlash!', message: broadcastMessage });
      }
    }
    
    return awardedMedals;
  }
}
