import { Router } from 'express';
import { prisma } from '../prisma';
import { comparePassword, hashPassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  password: z.string().min(4),
});

router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { password } = parsed.data;
    
    // Find user by password - check all users using raw SQL to avoid enum issues
    const users = await prisma.$queryRaw<Array<{ id: number; name: string; passwordHash: string; role: string; branchId: number }>>`
      SELECT id, name, "passwordHash", role::text as role, "branchId"
      FROM "User"
      WHERE active = true
    `;
    
    type UserType = { id: number; name: string; passwordHash: string; role: string; branchId: number };
    let matchedUser: UserType | null = null;
    for (const user of users) {
      const ok = await comparePassword(password, user.passwordHash);
      if (ok) {
        if (matchedUser) {
          // Multiple users with same password - security issue
          return res.status(400).json({ 
            error: 'Xatolik: Bir nechta foydalanuvchi bir xil parolga ega. Iltimos, parollarni o\'zgartiring.' 
          });
        }
        matchedUser = user;
      }
    }
    
    if (!matchedUser) {
      return res.status(401).json({ error: 'Noto\'g\'ri parol' });
    }
    
    // Convert role to valid enum value
    const user = matchedUser as any;
    let validRole = user.role;
    if (user.role === 'WORKER' || user.role === 'ACCOUNTANT') {
      validRole = 'DEKLARANT';
    } else if (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'DEKLARANT') {
      validRole = user.role;
    } else {
      validRole = 'DEKLARANT';
    }
    
    const payload = { sub: user.id, role: validRole, branchId: user.branchId || null, name: user.name };
    return res.json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: { id: user.id, name: user.name, role: validRole, branchId: user.branchId || null },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.message && error.message.includes('not found in enum')) {
      return res.status(500).json({ 
        error: 'Database rollarida muammo. Iltimos, backend/fix-roles.sql faylini pgAdmin orqali bajarishingiz kerak.' 
      });
    }
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

const refreshSchema = z.object({ refreshToken: z.string() });

router.post('/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const payload = verifyRefreshToken(parsed.data.refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Invalid refresh' });
    const newPayload = { sub: user.id, role: user.role, branchId: user.branchId || null, name: user.name };
    return res.json({
      accessToken: signAccessToken(newPayload),
      refreshToken: signRefreshToken(newPayload),
    });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh' });
  }
});

// Simple self register (optional) for bootstrap; can be removed later
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'MANAGER', 'DEKLARANT']),
  branchId: z.number(),
});

router.post('/register', async (req, res) => {
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
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
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
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;

