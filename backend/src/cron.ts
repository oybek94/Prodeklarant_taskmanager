import cron from 'node-cron';
import { prisma } from './prisma';
import { socketEmitter } from './services/socketEmitter';
import { BackupService } from './services/backup.service';

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
};
