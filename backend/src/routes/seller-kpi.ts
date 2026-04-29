import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// ========================================
// QO'NG'IROQ HISOBLASH LOGIKASI
// ========================================
// Qo'ng'iroq = lid statusi Aloqada yoki Uchrashuvga o'zgarganda
//            + call/comment tipdagi faoliyatlar
// Raqam xato, O'chiq/Ko'tarmadi statuslariga o'tish hisoblanMAYDI

// Stage change note format: "Bosqich: [old] → [new]"
const VALID_CALL_TARGETS = ['Aloqaga chiqildi', 'Uchrashuv belgilandi'];
const INVALID_CALL_TARGETS = ['Raqam xato', "O'chiq / Ko'tarmadi"];

function isValidCallActivity(activity: { type: string; note: string | null }): boolean {
    if (activity.type === 'call' || activity.type === 'comment') return true;
    if (activity.type === 'stage_change') {
        if (!activity.note) return false;
        // Faqat "Aloqada" yoki "Uchrashuv" ga o'tgan stage_change larni hisoblash
        return VALID_CALL_TARGETS.some(target => activity.note!.includes(`→ ${target}`));
    }
    return false;
}

async function countValidCalls(
    userIdOrIds: number | number[],
    startDate: Date,
    endDate: Date
): Promise<number | Map<number, number>> {
    const isMultiple = Array.isArray(userIdOrIds);
    const activities = await prisma.leadActivity.findMany({
        where: {
            userId: isMultiple ? { in: userIdOrIds } : userIdOrIds,
            createdAt: { gte: startDate, lte: endDate },
            type: { in: ['call', 'comment', 'stage_change'] },
        },
        select: { userId: true, type: true, note: true },
    });

    const filtered = activities.filter(isValidCallActivity);

    if (isMultiple) {
        const counts = new Map<number, number>();
        for (const a of filtered) {
            counts.set(a.userId, (counts.get(a.userId) || 0) + 1);
        }
        return counts;
    }
    return filtered.length;
}

// ========================================
// KUNLIK MA'LUMOTLAR (SellerDailyLog)
// ========================================

// GET /api/seller-kpi/daily — Bugungi yoki berilgan sana uchun sotuvchining kunlik ma'lumotlari
router.get('/daily', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const dateStr = req.query.date as string;
        const userId = req.query.userId ? Number(req.query.userId) : req.user.id;
        
        // Faqat admin boshqa foydalanuvchi ma'lumotlarini ko'ra oladi
        if (userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Ruxsat yo\'q' });
        }

        const targetDate = dateStr ? new Date(dateStr) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        // LeadActivity dan bugungi qo'ng'iroqlarni avtomatik hisoblash
        const dayStart = new Date(targetDate);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const todayCallsCount = await countValidCalls(userId, dayStart, dayEnd) as number;

        // Mavjud yoki yangi log olish
        let log = await prisma.sellerDailyLog.findUnique({
            where: { userId_date: { userId, date: targetDate } },
        });

        if (!log) {
            log = await prisma.sellerDailyLog.create({
                data: {
                    userId,
                    date: targetDate,
                    callsMade: todayCallsCount,
                },
            });
        } else if (log.callsMade !== todayCallsCount) {
            // LeadActivity bilan sinxronlash
            log = await prisma.sellerDailyLog.update({
                where: { id: log.id },
                data: { callsMade: todayCallsCount },
            });
        }

        res.json(log);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/seller-kpi/daily — Kunlik ma'lumotlarni yangilash
router.put('/daily', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const { subscribersAdded, callsMade, date, userId: targetUserId } = req.body;
        const userId = targetUserId ? Number(targetUserId) : req.user.id;

        // Faqat admin boshqa foydalanuvchi ma'lumotlarini o'zgartira oladi
        if (userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Ruxsat yo\'q' });
        }

        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const data: any = {};
        if (subscribersAdded !== undefined) data.subscribersAdded = Number(subscribersAdded);
        if (callsMade !== undefined) data.callsMade = Number(callsMade);

        const log = await prisma.sellerDailyLog.upsert({
            where: { userId_date: { userId, date: targetDate } },
            update: data,
            create: {
                userId,
                date: targetDate,
                ...data,
            },
        });

        res.json(log);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// BONUSLAR
// ========================================

// GET /api/seller-kpi/bonuses — Bonus tarixi
router.get('/bonuses', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const userId = req.query.userId ? Number(req.query.userId) : req.user.id;
        const dateFrom = req.query.dateFrom as string;
        const dateTo = req.query.dateTo as string;

        // Faqat admin boshqa foydalanuvchi bonuslarini ko'ra oladi
        if (userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Ruxsat yo\'q' });
        }

        const where: any = { userId };
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = new Date(dateFrom);
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const bonuses = await prisma.sellerBonus.findMany({
            where,
            include: {
                lead: { select: { id: true, companyName: true, estimatedExportVolume: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const totalAmount = bonuses.reduce((sum, b) => sum + Number(b.amount), 0);

        res.json({ bonuses, totalAmount });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/seller-kpi/bonuses — Manual bonus qo'shish (faqat admin)
router.post('/bonuses', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Faqat admin bonus qo\'sha oladi' });
        }

        const { userId, type, amount, leadId, note } = req.body;
        if (!userId || !type || amount === undefined) {
            return res.status(400).json({ error: 'userId, type va amount majburiy' });
        }

        const bonus = await prisma.sellerBonus.create({
            data: {
                userId: Number(userId),
                type,
                amount: Number(amount),
                leadId: leadId ? Number(leadId) : null,
                note: note || null,
            },
            include: {
                lead: { select: { id: true, companyName: true } },
                user: { select: { id: true, name: true } },
            },
        });

        res.status(201).json(bonus);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// DASHBOARD (Admin nazorat paneli)
// ========================================

// GET /api/seller-kpi/dashboard — Barcha sotuvchilar KPI umumiy ko'rinishi
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const dateStr = req.query.date as string;
        const period = (req.query.period as string) || 'today'; // today, week, month
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let periodStart: Date;
        let periodEnd: Date;

        if (period === 'month') {
            periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
            periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (period === 'week') {
            const dayOfWeek = today.getDay();
            periodStart = new Date(today);
            periodStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodStart.getDate() + 6);
            periodEnd.setHours(23, 59, 59, 999);
        } else {
            periodStart = dateStr ? new Date(dateStr) : new Date(today);
            periodEnd = new Date(periodStart);
            periodEnd.setHours(23, 59, 59, 999);
        }

        // Barcha SELLER roldagi foydalanuvchilar
        const sellers = await prisma.user.findMany({
            where: { role: 'SELLER', active: true },
            select: { id: true, name: true, photoUrl: true },
        });

        // Kunlik loglar
        const dailyLogs = await prisma.sellerDailyLog.findMany({
            where: {
                userId: { in: sellers.map(s => s.id) },
                date: { gte: periodStart, lte: periodEnd },
            },
        });

        // Bonuslar
        const bonuses = await prisma.sellerBonus.findMany({
            where: {
                userId: { in: sellers.map(s => s.id) },
                createdAt: { gte: periodStart, lte: periodEnd },
            },
            include: {
                lead: { select: { id: true, companyName: true } },
            },
        });

        // LeadActivity dan qo'ng'iroqlarni to'g'ri hisoblash
        const callCountsMap = await countValidCalls(
            sellers.map(s => s.id), periodStart, periodEnd
        ) as Map<number, number>;

        // Har bir sotuvchi uchun ma'lumotlarni yig'ish
        const sellerStats = sellers.map(seller => {
            const sellerLogs = dailyLogs.filter(l => l.userId === seller.id);
            const sellerBonuses = bonuses.filter(b => b.userId === seller.id);

            const totalCalls = sellerLogs.reduce((sum, l) => sum + l.callsMade, 0);
            const totalSubscribers = sellerLogs.reduce((sum, l) => sum + l.subscribersAdded, 0);
            const totalBonusAmount = sellerBonuses.reduce((sum, b) => sum + Number(b.amount), 0);
            const activityCount = callCountsMap.get(seller.id) || 0;

            // Majburiy bajarilish foizi
            const daysInPeriod = sellerLogs.length || 1;
            const callsCompliance = Math.min(100, Math.round((totalCalls / (40 * daysInPeriod)) * 100));
            const subscribersCompliance = Math.min(100, Math.round((totalSubscribers / (20 * daysInPeriod)) * 100));

            return {
                ...seller,
                totalCalls,
                totalSubscribers,
                totalBonusAmount,
                activityCount,
                callsCompliance,
                subscribersCompliance,
                bonusBreakdown: {
                    phoneMeetings: sellerBonuses.filter(b => b.type === 'PHONE_MEETING').length,
                    inPersonMeetings: sellerBonuses.filter(b => b.type === 'IN_PERSON_MEETING').length,
                    contracts: sellerBonuses.filter(b => ['CONTRACT_SMALL', 'CONTRACT_MEDIUM', 'CONTRACT_LARGE'].includes(b.type)).length,
                },
                dailyLogs: sellerLogs,
                bonuses: sellerBonuses,
            };
        });

        // Umumiy statistika
        const totalCalls = sellerStats.reduce((sum, s) => sum + s.totalCalls, 0);
        const totalSubscribers = sellerStats.reduce((sum, s) => sum + s.totalSubscribers, 0);
        const totalBonuses = sellerStats.reduce((sum, s) => sum + s.totalBonusAmount, 0);
        const totalContracts = sellerStats.reduce((sum, s) => sum + s.bonusBreakdown.contracts, 0);

        res.json({
            period: { start: periodStart, end: periodEnd, type: period },
            summary: { totalCalls, totalSubscribers, totalBonuses, totalContracts, sellersCount: sellers.length },
            sellers: sellerStats,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/seller-kpi/my-stats — O'z statistikam (har qanday seller uchun)
router.get('/my-stats', async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        // Oylik davr
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

        // Bugungi qo'ng'iroqlar (LeadActivity dan) — faqat haqiqiy qo'ng'iroqlar
        const todayCallsCount = await countValidCalls(req.user.id, today, todayEnd) as number;

        // Bugungi log
        let todayLog = await prisma.sellerDailyLog.findUnique({
            where: { userId_date: { userId: req.user.id, date: today } },
        });

        if (!todayLog) {
            todayLog = await prisma.sellerDailyLog.create({
                data: { userId: req.user.id, date: today, callsMade: todayCallsCount },
            });
        } else if (todayLog.callsMade !== todayCallsCount) {
            todayLog = await prisma.sellerDailyLog.update({
                where: { id: todayLog.id },
                data: { callsMade: todayCallsCount },
            });
        }

        // Oylik bonuslar
        const monthlyBonuses = await prisma.sellerBonus.findMany({
            where: {
                userId: req.user.id,
                createdAt: { gte: monthStart, lte: monthEnd },
            },
            include: {
                lead: { select: { id: true, companyName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const totalMonthlyBonus = monthlyBonuses.reduce((sum, b) => sum + Number(b.amount), 0);

        // Oylik kunlik loglar (trend uchun)
        const monthlyLogs = await prisma.sellerDailyLog.findMany({
            where: {
                userId: req.user.id,
                date: { gte: monthStart, lte: monthEnd },
            },
            orderBy: { date: 'asc' },
        });

        // Haftalik ma'lumotlar (so'nggi 7 kun)
        const weekData: { date: string; calls: number; subscribers: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const log = monthlyLogs.find(l => {
                const logDate = new Date(l.date);
                return logDate.getFullYear() === d.getFullYear() &&
                       logDate.getMonth() === d.getMonth() &&
                       logDate.getDate() === d.getDate();
            });
            weekData.push({
                date: d.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric' }),
                calls: log?.callsMade || 0,
                subscribers: log?.subscribersAdded || 0,
            });
        }

        res.json({
            today: todayLog,
            monthlyBonuses,
            totalMonthlyBonus,
            monthlyLogs,
            weekData,
            bonusBreakdown: {
                phoneMeetings: monthlyBonuses.filter(b => b.type === 'PHONE_MEETING'),
                inPersonMeetings: monthlyBonuses.filter(b => b.type === 'IN_PERSON_MEETING'),
                contractsSmall: monthlyBonuses.filter(b => b.type === 'CONTRACT_SMALL'),
                contractsMedium: monthlyBonuses.filter(b => b.type === 'CONTRACT_MEDIUM'),
                contractsLarge: monthlyBonuses.filter(b => b.type === 'CONTRACT_LARGE'),
            },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
