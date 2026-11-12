import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { taskBranchParam } from '../middleware/branch-access';
import { getDriverCodeStatus, issueDriverCode, revokeDriverCode } from '../services/cargo-tracking.service';

// Haydovchi boti kodi (yukka bog'langan): xodim kodni oladi, haydovchiga beradi, ulanish holatini ko'radi.
// /api/tasks/:id/driver-code ostida ulanadi (server.ts).

const router = Router();

router.param('id', taskBranchParam);
const STAFF = ['ADMIN', 'DEKLARANT', 'MANAGER', 'SELLER'] as const;
const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

router.get('/:id/driver-code', requireAuth(...STAFF), async (req: AuthRequest, res) => {
  const params = paramsSchema.safeParse(req.params);
  if (!params.success) return res.status(404).json({ error: 'Not found' });
  const status = await getDriverCodeStatus(params.data.id);
  res.set('Cache-Control', 'no-store');
  res.json(status ? { exists: true, ...status } : { exists: false });
});

router.post('/:id/driver-code', requireAuth(...STAFF), async (req: AuthRequest, res) => {
  const params = paramsSchema.safeParse(req.params);
  if (!params.success) return res.status(404).json({ error: 'Not found' });
  const result = await issueDriverCode({ taskId: params.data.id, createdById: req.user?.id ?? null, createdVia: 'STAFF', regenerate: true });
  if (!result.ok) return res.status(404).json({ error: 'Not found' });
  res.set('Cache-Control', 'no-store');
  res.json({ code: result.code });
});

router.delete('/:id/driver-code', requireAuth(...STAFF), async (req: AuthRequest, res) => {
  const params = paramsSchema.safeParse(req.params);
  if (!params.success) return res.status(404).json({ error: 'Not found' });
  if (!(await revokeDriverCode(params.data.id))) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
