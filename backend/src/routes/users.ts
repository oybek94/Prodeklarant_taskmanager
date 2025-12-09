import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { hashPassword } from '../utils/hash';
import { z } from 'zod';

const router = Router();

// Only admin/manager can access
router.get('/', requireAuth('ADMIN', 'MANAGER'), async (req, res) => {
  const users = await prisma.user.findMany({
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
  res.json(users);
});

router.get('/:id', requireAuth('ADMIN', 'MANAGER'), async (req, res) => {
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
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'MANAGER', 'WORKER', 'ACCOUNTANT']),
  branchId: z.number().optional(),
  position: z.string().optional(),
  salary: z.number().optional(),
});

router.post('/', requireAuth('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return res.status(400).json({ error: 'Email already used' });
  
  // If branchId is not provided, get the first branch as default
  let branchId = parsed.data.branchId;
  if (!branchId) {
    const firstBranch = await prisma.branch.findFirst();
    if (firstBranch) {
      branchId = firstBranch.id;
    } else {
      return res.status(400).json({ error: 'No branch available. Please create a branch first.' });
    }
  }
  
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
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
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'WORKER', 'ACCOUNTANT']).optional(),
  branchId: z.number().optional(),
  position: z.string().optional(),
  salary: z.number().optional(),
  active: z.boolean().optional(),
});

router.put('/:id', requireAuth('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data: any = { ...parsed.data };
  if (data.password) {
    data.passwordHash = await hashPassword(data.password);
    delete data.password;
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

