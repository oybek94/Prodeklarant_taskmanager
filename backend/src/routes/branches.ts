import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const createBranchSchema = z.object({
  name: z.string().min(1, 'Filial nomi bo\'sh bo\'lmasligi kerak'),
});

// GET /api/branches - Get all branches
router.get('/', async (_req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(branches);
  } catch (error: any) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Filiallarni yuklashda xatolik yuz berdi' });
  }
});

// POST /api/branches - Create a new branch (ADMIN only)
router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = createBranchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    // Check if branch with same name already exists
    const existingBranch = await prisma.branch.findUnique({
      where: { name: parsed.data.name },
    });

    if (existingBranch) {
      return res.status(400).json({ error: 'Bu nomli filial allaqachon mavjud' });
    }

    const branch = await prisma.branch.create({
      data: {
        name: parsed.data.name,
      },
    });

    res.status(201).json(branch);
  } catch (error: any) {
    console.error('Error creating branch:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Bu nomli filial allaqachon mavjud' });
    }
    res.status(500).json({ 
      error: 'Filial yaratishda xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// DELETE /api/branches/:id - Delete a branch (ADMIN only)
router.delete('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);

    // Check if branch exists
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        tasks: { take: 1 },
        users: { take: 1 },
        invoices: { take: 1 },
        transactions: { take: 1 },
        statePayments: { take: 1 },
      },
    });

    if (!branch) {
      return res.status(404).json({ error: 'Filial topilmadi' });
    }

    // Check if branch is being used
    if (branch.tasks.length > 0) {
      return res.status(400).json({ error: 'Bu filial ishlatilmoqda. Avval barcha vazifalarni o\'chiring.' });
    }

    if (branch.users.length > 0) {
      return res.status(400).json({ error: 'Bu filial ishlatilmoqda. Avval barcha foydalanuvchilarni o\'chiring.' });
    }

    if (branch.invoices.length > 0) {
      return res.status(400).json({ error: 'Bu filial ishlatilmoqda. Avval barcha invoice\'larni o\'chiring.' });
    }

    if (branch.transactions.length > 0) {
      return res.status(400).json({ error: 'Bu filial ishlatilmoqda. Avval barcha transaksiyalarni o\'chiring.' });
    }

    if (branch.statePayments.length > 0) {
      return res.status(400).json({ error: 'Bu filial ishlatilmoqda. Avval barcha davlat to\'lovlarini o\'chiring.' });
    }

    await prisma.branch.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ 
      error: 'Filialni o\'chirishda xatolik yuz berdi',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;

