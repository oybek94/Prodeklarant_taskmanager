import { Router } from 'express';
import { prisma } from '../prisma';
import { comparePassword, hashPassword, DUMMY_PASSWORD_HASH, MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT_MESSAGE } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { requireAuth, AuthRequest, resolveStaffRole } from '../middleware/auth';
import { z } from 'zod';
import { normalizeStaffPhone } from '../utils/phone';
import { createLoginAttemptLimiter } from '../utils/login-attempts';

const router = Router();

const loginSchema = z.object({
  phone: z.string().min(1, 'Telefon raqam kiritilishi shart').max(40),
  password: z.string().min(1, 'Parol kiritilishi shart').max(200),
});

const LOGIN_FAILED_MESSAGE = "Telefon yoki parol noto'g'ri";
const LOGIN_LOCK_MINUTES = 15;
const LOGIN_LOCK_MS = LOGIN_LOCK_MINUTES * 60 * 1000;

// Ikki darajali chegara:
//  - (telefon + IP): 5 urinish — bitta joydan parol saralashni to'xtatadi;
//  - telefon (barcha IP lar): 20 urinish — ko'p IP dan taqsimlangan saralashni to'xtatadi.
// Faqat telefon bo'yicha qattiq blok bo'lsa, begona odam 5 ta xato urinish bilan
// xodimni o'z kompyuteridan ham bloklab qo'yardi.
const attemptsPerPhoneAndIp = createLoginAttemptLimiter({ maxFailures: 5, windowMs: LOGIN_LOCK_MS });
const attemptsPerPhone = createLoginAttemptLimiter({ maxFailures: 20, windowMs: LOGIN_LOCK_MS });

/**
 * Kirish: telefon + parol. Parol FAQAT shu telefon egasining hashiga solishtiriladi.
 * Ilgari faqat parol kiritilardi va u barcha xodimlarga solishtirilardi — bitta zaif
 * parolni topgan kishi o'sha xodim (admin ham) bo'lib kirardi.
 */
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Telefon raqam va parolni kiriting' });
    const { password } = parsed.data;

    const phone = normalizeStaffPhone(parsed.data.phone);
    if (!phone) {
      await comparePassword(password, DUMMY_PASSWORD_HASH);
      return res.status(401).json({ error: LOGIN_FAILED_MESSAGE });
    }

    const phoneAndIp = `${phone}|${req.ip ?? ''}`;

    const user = await prisma.user.findFirst({
      where: { phone },
      select: { id: true, name: true, passwordHash: true, role: true, branchId: true, active: true },
    });

    // Tekshiruv va hisobga olish bcrypt'dan OLDIN, bitta sinxron qadamda bajariladi: aks holda
    // parallel yuborilgan so'rovlarning hammasi tekshiruvdan o'tib, chegarani chetlab o'tardi.
    // Muvaffaqiyatli kirishda hisob nolga qaytariladi.
    // Telefon bo'yicha umumiy hisob faqat MAVJUD xodimlar uchun yuritiladi — kalitlar soni
    // xodimlar soni bilan chegaralanadi, tasodifiy raqamlar bilan to'ldirib bo'lmaydi.
    if (attemptsPerPhoneAndIp.isBlocked(phoneAndIp)) {
      return res.status(429).json({
        error: `Juda ko'p noto'g'ri urinish. ${LOGIN_LOCK_MINUTES} daqiqadan keyin qayta urinib ko'ring.`,
      });
    }
    // Telefon bo'yicha umumiy blok: javob oddiy "noto'g'ri parol" bilan bir xil (401) va
    // bir xil vaqt sarflanadi — 429 qaytsa, raqam tizimda borligi bilinib qolardi.
    const phoneLocked = !!user && attemptsPerPhone.isBlocked(phone);
    attemptsPerPhoneAndIp.recordFailure(phoneAndIp);
    if (user) attemptsPerPhone.recordFailure(phone);
    if (phoneLocked) {
      await comparePassword(password, DUMMY_PASSWORD_HASH);
      return res.status(401).json({ error: LOGIN_FAILED_MESSAGE });
    }

    // Xodim topilmasa ham bir xil vaqt sarflanadi va bir xil xabar qaytadi —
    // telefon tizimda bor-yo'qligi oshkor bo'lmaydi
    const isValidPassword = await comparePassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !user.active || !isValidPassword) {
      return res.status(401).json({ error: LOGIN_FAILED_MESSAGE });
    }
    attemptsPerPhoneAndIp.reset(phoneAndIp);
    attemptsPerPhone.reset(phone);

    // Token roli bazadagi rol bilan bir xil (eski rollar DEKLARANT ga tushadi)
    const validRole = resolveStaffRole(user.role);

    const payload = { sub: user.id, role: validRole, branchId: user.branchId || null, name: user.name };
    return res.json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: {
        id: user.id,
        name: user.name,
        role: validRole,
        branchId: user.branchId || null
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const refreshSchema = z.object({ refreshToken: z.string() });

router.post('/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const payload = verifyRefreshToken(parsed.data.refreshToken);

    // Eski mijoz tokeni (sub = Client.id) User jadvalidan qidirilsa, shu ID'li
    // xodimning tokenini olib qo'yardi — mijoz portali yo'q, rad etiladi.
    if (payload.role === 'CLIENT' || payload.role === 'PORTAL') return res.status(401).json({ error: 'Invalid refresh' });

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    // Bloklangan xodim refresh orqali yangi token ololmasligi kerak
    if (!user || !user.active) return res.status(401).json({ error: 'Invalid refresh' });
    const newPayload = { sub: user.id, role: resolveStaffRole(user.role), branchId: user.branchId || null, name: user.name };
    return res.json({
      accessToken: signAccessToken(newPayload),
      refreshToken: signRefreshToken(newPayload),
    });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid refresh' });
    }
    return res.status(500).json({ error: 'Internal server error during refresh' });
  }
});

// Simple self register (optional) for bootstrap; can be removed later
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT_MESSAGE),
  role: z.enum(['ADMIN', 'MANAGER', 'DEKLARANT']),
  branchId: z.number(),
});

router.post('/register', requireAuth('ADMIN'), async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return res.status(400).json({ error: 'Email already used' });
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
      branchId: parsed.data.branchId,
    },
  });
  const payload = { sub: user.id, role: user.role, branchId: user.branchId, name: user.name };
  res.status(201).json({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, name: user.name, role: user.role, branchId: user.branchId },
  });
});

router.get('/me', requireAuth(), async (req: AuthRequest, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Use Prisma ORM instead of raw SQL
    const user = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        position: true,
        salary: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      position: user.position,
      salary: user.salary,
    });
  } catch (error: any) {
    console.error('Error in /auth/me:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
// Triggering reload
console.log('Reloading auth router...');

router.get('/me/achievements', requireAuth(), async (req: AuthRequest, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const achievements = await (prisma as any).userMedal.findMany({
      where: { userId: req.user.id },
      orderBy: { awardedAt: 'desc' }
    });

    res.json(achievements);
  } catch (error: any) {
    console.error('Error in /auth/me/achievements:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/me/xp', requireAuth(), async (req: AuthRequest, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

    const completedStagesCount = await prisma.taskStage.count({
      where: {
        status: 'TAYYOR',
        assignedToId: req.user.id,
        completedAt: { not: null, gte: yearStart },
      },
    });

    // Xato topgani uchun mukofot (faqat boshqa ishchining xatosini topsa).
    // O'z xatosini topsa — bu mukofot emas, jarima (pastdagi penaltyXp'da hisoblanadi).
    const bountyXpResult = await prisma.taskError.aggregate({
      where: {
        createdById: req.user.id,
        workerId: { not: req.user.id },
        adminRatedAt: { gte: yearStart }
      },
      _sum: { bountyXp: true }
    });

    const bountyXp = bountyXpResult._sum.bountyXp || 0;

    // Xato qilgani uchun jarima: baholangan xatolarda workerId shu foydalanuvchi bo'lsa, XP ayriladi.
    const penaltyXpResult = await prisma.taskError.aggregate({
      where: {
        workerId: req.user.id,
        adminRatedAt: { gte: yearStart }
      },
      _sum: { bountyXp: true }
    });
    const penaltyXp = penaltyXpResult._sum.bountyXp || 0;

    const noteXpResult = await (prisma as any).dashboardNote.aggregate({
      where: {
        completedById: req.user.id,
        isCompleted: true,
        completedAt: { gte: yearStart },
        xpReward: { not: null }
      },
      _sum: { xpReward: true }
    });
    const noteXp = noteXpResult._sum.xpReward || 0;

    const medalXpResult = await prisma.userMedal.aggregate({
      where: {
        userId: req.user.id,
        awardedAt: { gte: yearStart }
      },
      _sum: { xpBonus: true }
    });
    const medalXp = medalXpResult._sum.xpBonus || 0;

    const totalXP = completedStagesCount + bountyXp + noteXp + medalXp - penaltyXp;

    res.json({ xp: totalXP });
  } catch (error: any) {
    console.error('Error in /auth/me/xp:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});


export default router;

