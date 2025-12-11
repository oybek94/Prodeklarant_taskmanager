import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(branches);
});

export default router;

