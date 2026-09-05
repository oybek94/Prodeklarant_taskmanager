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

      // Kunlik KPI hisoboti bildirishnomasi o'chirilgan (foydalanuvchi so'rovi bo'yicha).
      // KPI ma'lumotlari SellerDailyLog'da saqlanib boradi, faqat xabar yuborilmaydi.

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

  // AuditLog retention: eski access-loglarni tozalash (kunlik 03:30, backupdan keyin).
  // Jadval faqat yoziladi — retention cheksiz o'sishning (111k+ qator) oldini oladi.
  // Saqlash muddati: AUDIT_LOG_RETENTION_DAYS env (default 90 kun).
  cron.schedule('30 3 * * *', async () => {
    const days = Number(process.env.AUDIT_LOG_RETENTION_DAYS) || 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    console.log(`[CRON] AuditLog retention: ${days} kundan eski yozuvlar tozalanmoqda (< ${cutoff.toISOString()}).`);
    try {
      let deleted = 0;
      // Katta birinchi tozalashda uzoq lock bo'lmasligi uchun partiyalab (5000 tadan) o'chiramiz.
      for (;;) {
        const batch = await prisma.auditLog.findMany({
          where: { createdAt: { lt: cutoff } },
          select: { id: true },
          take: 5000,
        });
        if (batch.length === 0) break;
        const r = await prisma.auditLog.deleteMany({
          where: { id: { in: batch.map((b) => b.id) } },
        });
        deleted += r.count;
        if (batch.length < 5000) break;
      }
      console.log(`[CRON] AuditLog retention tugadi: ${deleted} ta yozuv o'chirildi.`);
    } catch (e) {
      console.error('[CRON] AuditLog retention xatolik:', e);
    }
  });

  // ==========================================
  // LIDLAR KEYINGI QO'NG'IROQ ES LATMALARI (TELEGRAM BOT)
  // Har 1 daqiqada tekshiradi: nextCallAt <= now va reminderSent = false
  // ==========================================
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const pendingReminders = await prisma.lead.findMany({
        where: {
          nextCallAt: { lte: now },
          reminderSent: false,
          stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
        },
        select: { id: true, companyName: true, nextCallAt: true },
      });

      if (pendingReminders.length > 0) {
        console.log(`[CRON] ${pendingReminders.length} ta lid bo'yicha qo'ng'iroq vaqti bo'ldi. Telegram bot orqali eslatilmoqda...`);
        const { sendLeadCallReminder } = await import('./services/lead-reminder-bot.service');

        for (const lead of pendingReminders) {
          try {
            await sendLeadCallReminder(lead.id);
            console.log(`[CRON] Lid #${lead.id} (${lead.companyName}) eslatmasi Telegram bot orqali yuborildi.`);
          } catch (err) {
            console.error(`[CRON] Lid #${lead.id} eslatma yuborishda xatolik:`, err);
          }
        }
      }
    } catch (e) {
      console.error('[CRON] Lid eslatma cron xatolik:', e);
    }
  });
  console.log('[CRON] Lidlar keyingi qo\'ng\'iroq eslatmalari (daqiqalik) ishga tushdi.');
};

