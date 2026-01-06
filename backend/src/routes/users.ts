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
        defaultCurrency: true,
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
        defaultCurrency: true,
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

router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  // #region agent log
  const logEntry = {location:'users.ts:72',message:'POST /users entry',data:{hasUser:!!req.user,userId:req.user?.id,body:req.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'};
  console.log('[DEBUG]', JSON.stringify(logEntry));
  fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logEntry)}).catch(()=>{});
  // #endregion
  try {
    const parsed = createUserSchema.safeParse(req.body);
    // #region agent log
    const logValidation = {location:'users.ts:74',message:'Schema validation',data:{success:parsed.success,parsedData:parsed.success?parsed.data:null,errors:parsed.success?null:parsed.error.flatten()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'};
    console.log('[DEBUG]', JSON.stringify(logValidation));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logValidation)}).catch(()=>{});
    // #endregion
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
    
    // #region agent log
    const logBeforeCreate = {location:'users.ts:133',message:'userData before Prisma create',data:{userData:JSON.parse(JSON.stringify({...userData,passwordHash:'[HIDDEN]'})),userDataTypes:Object.keys(userData).reduce((acc,key)=>{acc[key]=typeof userData[key];return acc;},{})},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
    console.log('[DEBUG]', JSON.stringify(logBeforeCreate));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logBeforeCreate)}).catch(()=>{});
    // #endregion
    
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
    
    // #region agent log
    const logAfterCreate = {location:'users.ts:153',message:'User created successfully',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
    console.log('[DEBUG]', JSON.stringify(logAfterCreate));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logAfterCreate)}).catch(()=>{});
    // #endregion
    
    res.status(201).json(user);
  } catch (error: any) {
    // #region agent log
    const logError = {location:'users.ts:160',message:'Error creating user',data:{errorMessage:error?.message,errorName:error?.name,errorCode:error?.code,prismaError:error?.meta,prismaClientVersion:error?.clientVersion,errorStack:error instanceof Error?error.stack:'No stack'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'};
    console.log('[DEBUG ERROR]', JSON.stringify(logError, null, 2));
    fetch('http://127.0.0.1:7242/ingest/b7a51d95-4101-49e2-84b0-71f2f18445f2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logError)}).catch(()=>{});
    // #endregion
    console.error('Error creating user:', error);
    return res.status(500).json({ 
      error: error.message || 'Xatolik yuz berdi. Iltimos, database migration bajarilganligini tekshiring.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'DEKLARANT', 'CERTIFICATE_WORKER']).optional(),
  branchId: z.union([z.number(), z.null()]).optional(),
  position: z.string().optional(),
  salary: z.number().optional(),
  active: z.boolean().optional(),
  defaultCurrency: z.enum(['USD', 'UZS']).nullable().optional(), // For certifiers only
});

router.put('/:id', requireAuth('ADMIN'), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error('Validation error:', parsed.error);
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const data: any = { ...parsed.data };
  
  // Validate defaultCurrency: only for CERTIFICATE_WORKER role
  if (data.defaultCurrency !== undefined) {
    // Get current user to check role
    const currentUser = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { role: true },
    });
    
    // If setting defaultCurrency, user must be CERTIFICATE_WORKER
    const targetRole = data.role || currentUser?.role;
    if (targetRole !== 'CERTIFICATE_WORKER' && data.defaultCurrency !== null) {
      return res.status(400).json({ 
        error: 'defaultCurrency can only be set for CERTIFICATE_WORKER role' 
      });
    }
    
    // If role is being changed away from CERTIFICATE_WORKER, clear defaultCurrency
    if (data.role && data.role !== 'CERTIFICATE_WORKER' && data.defaultCurrency === undefined) {
      data.defaultCurrency = null;
    }
  }
  
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
  await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
  res.status(204).send();
});

export default router;

