import { Router } from 'express';
import { prisma } from '../prisma';
import { comparePassword, hashPassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Email manzil noto\'g\'ri'),
  password: z.string().min(1, 'Parol kiritilishi shart'),
});

router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { email, password } = parsed.data;
    
    // Security: Find user by email (unique identifier) instead of password
    // This is more secure and efficient than iterating through all users
    // Using findUnique ensures we get at most one user, preventing timing attacks
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        passwordHash: true,
        role: true,
        branchId: true,
        active: true,
      },
    });
    
    // Security: Always perform password comparison, even if user not found
    // This prevents user enumeration attacks (timing differences)
    if (!user || !user.active) {
      // Perform dummy comparison to prevent timing attacks
      await comparePassword(password, '$2a$10$dummyhash');
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    }
    
    // Security: Verify password using bcrypt.compare
    // This uses constant-time comparison to prevent timing attacks
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
    }
    
    // Convert role to valid enum value
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
      user: { 
        id: user.id, 
        name: user.name, 
        role: validRole, 
        branchId: user.branchId || null 
      },
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

// Client login endpoint
const clientLoginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(4),
});

router.post('/client/login', async (req, res) => {
  try {
    const parsed = clientLoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { phone, password } = parsed.data;
    
    // Find client by phone
    const client = await prisma.client.findFirst({
      where: { phone },
    });
    
    if (!client) {
      return res.status(401).json({ error: 'Telefon raqam yoki parol noto\'g\'ri' });
    }
    
    // Check if client has password set
    if (!client.passwordHash) {
      return res.status(401).json({ error: 'Parol o\'rnatilmagan. Iltimos, administrator bilan bog\'laning.' });
    }
    
    // Verify password
    const isValid = await comparePassword(password, client.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Telefon raqam yoki parol noto\'g\'ri' });
    }
    
    // Generate tokens for client
    const payload = { sub: client.id, role: 'CLIENT', branchId: null, name: client.name };
    return res.json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: { id: client.id, name: client.name, role: 'CLIENT', branchId: null },
    });
  } catch (error: any) {
    console.error('Client login error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Client me endpoint
router.get('/client/me', requireAuth(), async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'CLIENT') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const client = await prisma.client.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        phone: true,
        dealAmount: true,
        createdAt: true,
      },
    });
    
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error: any) {
    console.error('Client me error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
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

export default router;

