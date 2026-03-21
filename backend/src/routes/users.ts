import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { hashPassword, comparePassword } from '../utils/hash';
import { z } from 'zod';

const router = Router();

// Only admin can access
router.get('/', requireAuth('ADMIN'), async (req, res) => {
  try {
    console.log('[Users] Fetching users...');
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
        branch: {
          select: {
            id: true,
            name: true
          }
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`[Users] Found ${users.length} users`);

    // Format users to ensure branch is null if branchId is null
    const formattedUsers = users.map((user: any) => {
      try {
        return {
          ...user,
          branch: user.branchId ? user.branch : null,
          salary: user.salary ? Number(user.salary) : null,
        };
      } catch (err) {
        console.error('Error formatting user:', user.id, err);
        return {
          ...user,
          branch: null,
          salary: user.salary ? Number(user.salary) : null,
        };
      }
    });

    console.log(`[Users] Returning ${formattedUsers.length} formatted users`);
    res.json(formattedUsers);
  } catch (error: any) {
    console.error('[Users] Error fetching users:', error);
    console.error('[Users] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    res.status(500).json({
      error: error.message || 'Xatolik yuz berdi. Iltimos, database migration bajarilganligini tekshiring.',
      details: error instanceof Error ? error.stack : String(error),
      code: error.code || 'UNKNOWN_ERROR',
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
  role: z.enum(['ADMIN', 'MANAGER', 'DEKLARANT', 'SELLER']),
  branchId: z.number().optional(),
  position: z.string().optional(),
  salary: z.number().optional(),
});

router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
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

    // Prisma data object - faqat mavjud field'larni qo'shamiz
    const userData: any = {
      name: parsed.data.name,
      email: email,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
      branchId: branchId || null,
    };

    // Optional field'larni qo'shamiz
    if (parsed.data.position !== undefined && parsed.data.position !== null && parsed.data.position !== '') {
      userData.position = parsed.data.position;
    }
    // Decimal field uchun - faqat mavjud va null bo'lmagan qiymatni
    if (parsed.data.salary !== undefined && parsed.data.salary !== null && !isNaN(parsed.data.salary)) {
      userData.salary = parsed.data.salary;
    }

    const user = await prisma.user.create({
      data: userData,
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
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'DEKLARANT', 'SELLER', 'CERTIFICATE_WORKER']).optional(),
  branchId: z.union([z.number(), z.null()]).optional(),
  position: z.string().optional(),
  salary: z.number().optional(),
  active: z.boolean().optional(),
});

router.put('/:id', requireAuth('ADMIN'), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error('Validation error:', parsed.error);
    return res.status(400).json({ error: parsed.error.flatten() });
  }
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
  // Agar branchId undefined bo'lsa, o'zgartirmaymiz (mavjud qiymatni saqlaymiz)
  if (data.role === 'MANAGER') {
    data.branchId = null;
  } else if (data.role === 'DEKLARANT' && data.branchId === undefined) {
    // Agar Deklarant roli tanlangan va branchId berilmagan bo'lsa, default branch olish
    const firstBranch = await prisma.branch.findFirst();
    if (firstBranch) {
      data.branchId = firstBranch.id;
    } else {
      return res.status(400).json({ error: 'Deklarant roli uchun filial tanlash majburiy. Iltimos, filial yarating.' });
    }
  }

  // Agar branchId null bo'lsa, uni to'g'ridan-to'g'ri yuboramiz
  // Agar branchId undefined bo'lsa, uni data'dan olib tashlaymiz (mavjud qiymatni saqlash uchun)
  if (data.branchId === undefined) {
    delete data.branchId;
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
  const userId = parseInt(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const [
    taskCount,
    taskStageCount,
    taskErrorCount,
    taskVersionCount,
    kpiLogCount,
    transactionCount,
    taskDocumentCount,
    archiveDocumentCount,
    workerPaymentCount,
    previousYearDebtCount,
  ] = await Promise.all([
    prisma.task.count({
      where: { OR: [{ createdById: userId }, { updatedById: userId }] },
    }),
    prisma.taskStage.count({ where: { assignedToId: userId } }),
    prisma.taskError.count({
      where: { OR: [{ workerId: userId }, { createdById: userId }] },
    }),
    prisma.taskVersion.count({ where: { changedBy: userId } }),
    prisma.kpiLog.count({ where: { userId } }),
    prisma.transaction.count({ where: { workerId: userId } }),
    prisma.taskDocument.count({ where: { uploadedById: userId } }),
    prisma.archiveDocument.count({ where: { uploadedById: userId } }),
    prisma.workerPayment.count({ where: { workerId: userId } }),
    prisma.previousYearWorkerDebt.count({ where: { workerId: userId } }),
  ]);

  const hasParticipation =
    taskCount > 0 ||
    taskStageCount > 0 ||
    taskErrorCount > 0 ||
    taskVersionCount > 0 ||
    kpiLogCount > 0 ||
    transactionCount > 0 ||
    taskDocumentCount > 0 ||
    archiveDocumentCount > 0 ||
    workerPaymentCount > 0 ||
    previousYearDebtCount > 0;

  if (hasParticipation) {
    if (user.active) {
      await prisma.user.update({
        where: { id: userId },
        data: { active: false },
      });
    }
    return res.status(204).send();
  }

  await prisma.user.delete({ where: { id: userId } });
  res.status(204).send();
});

export default router;

