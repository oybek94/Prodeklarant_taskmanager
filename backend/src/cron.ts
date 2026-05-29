import cron from 'node-cron';
import { prisma } from './prisma';
import { socketEmitter } from './services/socketEmitter';
import { BackupService } from './services/backup.service';
import { MedalService } from './services/medalService';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subWeeks, subMonths, subQuarters, subYears } from 'date-fns';

export const initCronJobs = () => {
  // Run on the 1st of every month at midnight
  cron.schedule('0 0 1 * *', async () => {
    console.log('[CRON] Sifat tekshiruvi (Quality Score) oylik mukofotlarini hisoblash boshlandi.');
    
    try {
      const now = new Date();
      // Calculate previous month's start and end
      const previousMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      // Find all eligible workers
      const users = await prisma.user.findMany({
        where: { role: { in: ['DEKLARANT', 'ADMIN', 'MANAGER', 'CERTIFICATE_WORKER'] }, active: true },
        select: { id: true, name: true }
      });

      for (const user of users) {
        // Did they participate in at least 100 unique tasks/invoices in the last month?
        const stages = await prisma.taskStage.findMany({
          where: {
            assignedToId: user.id,
            completedAt: { gte: previousMonthFirstDay, lte: previousMonthLastDay },
            status: 'TAYYOR'
          },
          select: { taskId: true }
        });
        
        const uniqueTaskIds = new Set(stages.map((s) => s.taskId));
        
        if (uniqueTaskIds.size >= 100) {
          // Check if they made any mistakes
          const errorCount = await prisma.taskError.count({
            where: {
              workerId: user.id,
              date: { gte: previousMonthFirstDay, lte: previousMonthLastDay }
            }
          });

          if (errorCount === 0) {
            console.log(`[CRON] Foydalanuvchi ${user.name} 100+ vazifa va 0 xato qildi! Mukofotlash jarayoni...`);

            const periodStr = `${previousMonthFirstDay.getFullYear()}-${(previousMonthFirstDay.getMonth() + 1).toString().padStart(2, '0')}`;
            const hasMedal = await prisma.userMedal.count({
              where: { 
                userId: user.id, 
                medalType: 'GOLDEN_KD', 
                period: periodStr 
              }
            });

            if (hasMedal === 0) {
              await prisma.$transaction(async (tx) => {
                 const firstTaskId = Array.from(uniqueTaskIds)[0];
                 
                 await (tx as any).kpiLog.create({
                    data: {
                      userId: user.id,
                      taskId: firstTaskId, // Link to one of their tasks
                      stageName: 'Sifat Indeksi (Quality Score)',
                      amount: 0,
                      currency: 'UZS',
                      amount_uzs: 1000000,
                      amount_original: 1000000,
                      currency_universal: 'UZS',
                      exchange_rate: 1, 
                    }
                 });

                 // Award Achievement Medal
                 await (tx as any).userMedal.create({
                    data: {
                       userId: user.id,
                       medalType: 'GOLDEN_KD',
                       period: periodStr,
                       cashBonus: 1000000,
                       xpBonus: 100
                    }
                 });
                 
                 await (tx as any).user.update({
                   where: { id: user.id },
                   data: { xp: { increment: 100 } }
                 });
              });

              // Notification
              socketEmitter.broadcast('user:quality_award', { 
                  userId: user.id, 
                  message: `${user.name} o'tgan oyni xatosiz tugatdi va Global Elite unvonini oldi!`,
                  medal: 'The Global Elite'
              });
            }
          }
        }
      }
      
      console.log('[CRON] Sifat tekshiruvi yakunlandi.');
    } catch (e) {
      console.error('[CRON] Xatolik:', e);
    }
  });

  console.log('[CRON] Vazifalar (Quality Score) ishga tushdi.');

  // Run database backup daily at 03:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[CRON] Kundalik ma\'lumotlar zaxirasi boshlandi.');
    try {
      await BackupService.createBackupArchive();
      console.log('[CRON] Zaxira nusxasi muvaffaqiyatli yaratildi.');
    } catch (e) {
      console.error('[CRON] Zaxira yaratishda xatolik:', e);
    }
  });
  console.log('[CRON] Kundalik DB zaxiralash (03:00) ishga tushdi.');

  // === SELLER KPI: Kundalik tekshiruv soat 20:00 da ===
  cron.schedule('0 20 * * *', async () => {
    console.log('[CRON] Seller KPI kundalik tekshiruvi boshlandi.');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const sellers = await prisma.user.findMany({
        where: { role: 'SELLER', active: true },
        select: { id: true, name: true },
      });

      const underperformers: { name: string; calls: number; subscribers: number }[] = [];

      for (const seller of sellers) {
        // Bugungi LeadActivity dan HAQIQIY qo'ng'iroqlarni sanash
        // Faqat: call, comment, va Aloqada/Uchrashuv ga o'tgan stage_change
        const activities = await prisma.leadActivity.findMany({
          where: {
            userId: seller.id,
            createdAt: { gte: today, lte: todayEnd },
            type: { in: ['call', 'comment', 'stage_change'] },
          },
          select: { type: true, note: true },
        });

        const VALID_TARGETS = ['Aloqaga chiqildi', 'Uchrashuv belgilandi'];
        const callsCount = activities.filter(a => {
          if (a.type === 'call' || a.type === 'comment') return true;
          if (a.type === 'stage_change' && a.note) {
            return VALID_TARGETS.some(t => a.note!.includes(`→ ${t}`));
          }
          return false;
        }).length;

        // Bugungi log olish
        const log = await prisma.sellerDailyLog.findUnique({
          where: { userId_date: { userId: seller.id, date: today } },
        });

        const subscribers = log?.subscribersAdded || 0;

        // Logni yangilash
        await prisma.sellerDailyLog.upsert({
          where: { userId_date: { userId: seller.id, date: today } },
          update: { callsMade: callsCount },
          create: { userId: seller.id, date: today, callsMade: callsCount },
        });

        if (callsCount < 40 || subscribers < 20) {
          underperformers.push({ name: seller.name, calls: callsCount, subscribers });
        }
      }

      // Adminlarga xabar yuborish
      if (underperformers.length > 0) {
        const adminIds = await prisma.user.findMany({
          where: { role: 'ADMIN', active: true },
          select: { id: true },
        });

        const message = underperformers.map(u => 
          `⚠️ ${u.name}: ${u.calls}/40 qo'ng'iroq, ${u.subscribers}/20 obunachi`
        ).join('\n');

        for (const admin of adminIds) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'SYSTEM',
              title: 'Kunlik KPI hisoboti',
              message: `Bugun KPI bajarilmagan sotuvchilar:\n${message}`,
              metadata: { underperformers },
            },
          });
          socketEmitter.toUser(admin.id, 'SELLER_KPI_REPORT', { underperformers });
        }
      }

      console.log(`[CRON] Seller KPI tekshiruvi yakunlandi. ${underperformers.length} ta sotuvchi KPI bajarmadi.`);
    } catch (e) {
      console.error('[CRON] Seller KPI xatolik:', e);
    }
  });
  console.log('[CRON] Seller KPI kundalik tekshiruvi (20:00) ishga tushdi.');

  // ===============================
  // AVTOMATIK MEDALLAR (CS-THEMED)
  // ===============================

  // Haftalik medallar: Dushanba kuni soat 00:05 da ishlaydi (o'tgan hafta uchun)
  cron.schedule('5 0 * * 1', async () => {
    console.log('[CRON] Haftalik medallar hisoblanmoqda...');
    try {
      const refDate = subWeeks(new Date(), 1); // o'tgan hafta
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

      const noms = await MedalService.calculateWeeklyWinners(startDate, endDate, periodStr);
      await MedalService.awardMedals(noms, 'Hafta qahramonlari aniqlandi! Barcha yutuqdorlarni tabriklaymiz!');
      console.log('[CRON] Haftalik medallar taqsimlandi.');
    } catch (e) {
      console.error('[CRON] Haftalik medallar xatolik:', e);
    }
  });

  // Oylik medallar: Har oyning 1-sanasida soat 00:10 da ishlaydi (o'tgan oy uchun)
  cron.schedule('10 0 1 * *', async () => {
    console.log('[CRON] Oylik medallar hisoblanmoqda...');
    try {
      const refDate = subMonths(new Date(), 1); // o'tgan oy
      const startDate = startOfMonth(refDate);
      const endDate = endOfMonth(refDate);
      const periodStr = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;

      const noms = await MedalService.calculateMonthlyWinners(startDate, endDate, periodStr);
      await MedalService.awardMedals(noms, 'Oylik qahramonlar aniqlandi! O\'tgan oyning eng zo\'rlari:');
      console.log('[CRON] Oylik medallar taqsimlandi.');
    } catch (e) {
      console.error('[CRON] Oylik medallar xatolik:', e);
    }
  });

  // Choraklik medallar: Yanvar, Aprel, Iyul, Oktabrning 1-sanasida soat 00:15 da
  cron.schedule('15 0 1 1,4,7,10 *', async () => {
    console.log('[CRON] Choraklik medallar hisoblanmoqda...');
    try {
      const refDate = subQuarters(new Date(), 1); // o'tgan chorak
      const startDate = startOfQuarter(refDate);
      const endDate = endOfQuarter(refDate);
      const periodStr = `${startDate.getFullYear()}-Q${Math.floor(startDate.getMonth() / 3) + 1}`;

      const noms = await MedalService.calculateQuarterlyWinners(startDate, endDate, periodStr);
      await MedalService.awardMedals(noms, 'Choraklik qahramonlar aniqlandi! Ular haqiqiy afsonalar:');
      console.log('[CRON] Choraklik medallar taqsimlandi.');
    } catch (e) {
      console.error('[CRON] Choraklik medallar xatolik:', e);
    }
  });

  // Yillik medallar: Har yili 1-Yanvarda soat 00:20 da
  cron.schedule('20 0 1 1 *', async () => {
    console.log('[CRON] Yillik medallar hisoblanmoqda...');
    try {
      const refDate = subYears(new Date(), 1); // o'tgan yil
      const startDate = startOfYear(refDate);
      const endDate = endOfYear(refDate);
      const periodStr = `${startDate.getFullYear()}`;

      const noms = await MedalService.calculateYearlyWinners(startDate, endDate, periodStr);
      await MedalService.awardMedals(noms, 'Yil yulduzlari aniqlandi! Butun kompaniya qahramoni:');
      console.log('[CRON] Yillik medallar taqsimlandi.');
    } catch (e) {
      console.error('[CRON] Yillik medallar xatolik:', e);
    }
  });
};

