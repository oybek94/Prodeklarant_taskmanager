import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { hashPassword, comparePassword } from '../utils/hash';
import { z } from 'zod';

const router = Router();

// Only admin can access
router.get('/', requireAuth('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        branchId: true,
        position: true,
        salary: true,
        active: true,
        createdAt: true,
        branch: { select: { id: true, name: true } },
      },
    });
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: error.message || 'Xatolik yuz berdi. Iltimos, database migration bajarilganligini tekshiring.' 
    });
  }
});

router.get('/:id', requireAuth('ADMIN'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        position: true,
        salary: true,
        active: true,
        branch: { select: { id: true, name: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      error: error.message || 'Xatolik yuz berdi. Iltimos, database migration bajarilganligini tekshiring.' 
    });
  }
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  password: z.string(),
  role: z.enum(['ADMIN', 'MANAGER', 'DEKLARANT']),
  branchId: z.number().optional(),
  position: z.string().optional(),
  salary: z.number().optional(),
});

router.post('/', requireAuth('ADMIN'), async (req, res) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error('Validation error:', parsed.error);
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    
    // Generate email if not provided
    let email = parsed.data.email;
    if (!email) {
      email = `user_${Date.now()}_${Math.random().toString(36).substring(7)}@local.test`;
    }
    
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      // If email exists, generate a new one
      email = `user_${Date.now()}_${Math.random().toString(36).substring(7)}@local.test`;
    }
    
    // Check if password is unique
    const allUsers = await prisma.user.findMany({ select: { passwordHash: true } });
    for (const user of allUsers) {
      const isMatch = await comparePassword(parsed.data.password, user.passwordHash);
      if (isMatch) {
        return res.status(400).json({ error: 'Bu parol allaqachon boshqa foydalanuvchi tomonidan ishlatilmoqda. Iltimos, boshqa parol tanlang.' });
      }
    }
    
    // BranchId logic: Manager roli uchun branchId optional, Deklarant uchun majburiy
    let branchId = parsed.data.branchId;
    if (parsed.data.role === 'MANAGER') {
      // Manager roli uchun branchId null bo'lishi mumkin (barcha filiallarga kirish)
      branchId = branchId || undefined;
    } else if (parsed.data.role === 'DEKLARANT') {
      // Deklarant roli uchun branchId majburiy
      if (!branchId) {
        const firstBranch = await prisma.branch.findFirst();
        if (firstBranch) {
          branchId = firstBranch.id;
        } else {
          return res.status(400).json({ error: 'Deklarant roli uchun filial tanlash majburiy. Iltimos, filial yarating.' });
        }
      }
    } else {
      // Admin roli uchun ham default branch
      if (!branchId) {
        const firstBranch = await prisma.branch.findFirst();
        if (firstBranch) {
          branchId = firstBranch.id;
        }
      }
    }
    
    console.log('Creating user with data:', { 
      name: parsed.data.name, 
      email: email, 
      role: parsed.data.role,
      branchId 
    });
    
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: email,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        branchId,
        position: parsed.data.position || null,
        salary: parsed.data.salary ? parsed.data.salary : null,
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
    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    return res.status(500).json({ 
      error: error.message || 'Xatolik yuz berdi. Iltimos, database migration bajarilganligini tekshiring.' 
    });
  }
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'DEKLARANT']).optional(),
  branchId: z.number().optional(),
  position: z.string().optional(),
  salary: z.number().optional(),
  active: z.boolean().optional(),
});

router.put('/:id', requireAuth('ADMIN'), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data: any = { ...parsed.data };
  
  if (data.password) {
    // Check if password is unique (excluding current user)
    const allUsers = await prisma.user.findMany({ 
      where: { id: { not: parseInt(req.params.id) } },
      select: { passwordHash: true } 
    });
    for (const user of allUsers) {
      const isMatch = await comparePassword(data.password, user.passwordHash);
      if (isMatch) {
        return res.status(400).json({ error: 'Bu parol allaqachon boshqa foydalanuvchi tomonidan ishlatilmoqda. Iltimos, boshqa parol tanlang.' });
      }
    }
    
    data.passwordHash = await hashPassword(data.password);
    delete data.password;
  }

  // BranchId logic: Manager roli uchun branchId null bo'lishi kerak
  if (data.role === 'MANAGER') {
    data.branchId = null;
  } else if (data.role === 'DEKLARANT' && !data.branchId) {
    // Agar Deklarant roli tanlangan va branchId berilmagan bo'lsa, default branch olish
    const firstBranch = await prisma.branch.findFirst();
    if (firstBranch) {
      data.branchId = firstBranch.id;
    } else {
      return res.status(400).json({ error: 'Deklarant roli uchun filial tanlash majburiy. Iltimos, filial yarating.' });
    }
  }
  
  const user = await prisma.user.update({
    where: { id: parseInt(req.params.id) },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      position: true,
      salary: true,
      active: true,
    },
  });
  res.json(user);
});

router.delete('/:id', requireAuth('ADMIN'), async (req, res) => {
  await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
  res.status(204).send();
});

export default router;

