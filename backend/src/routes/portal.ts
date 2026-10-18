import { Router } from 'express';
import { AuthRequest, requirePortal, PORTAL_ROLE } from '../middleware/auth';
import { verifyRefreshToken } from '../utils/jwt';
import {
  loginSchema,
  refreshSchema,
  shipmentsQuerySchema,
  documentsQuerySchema,
  loginClient,
  refreshClient,
  getClientProfile,
  listShipments,
  getShipment,
  listDocuments,
  getDownloadableDocument,
} from '../services/portal.service';

/**
 * Mijoz portali API (`/api/portal/*`, my.prodeklarant.uz).
 * Himoya: auth'dan tashqari hamma yo'l requirePortal() ostida; clientId faqat token'dan.
 */
const router = Router();

router.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Login yoki parol noto\'g\'ri formatda' });
  try {
    const result = await loginClient(parsed.data.login, parsed.data.password);
    if (!result) return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
    return res.json(result);
  } catch (error) {
    console.error('Portal login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid refresh' });
  try {
    const payload = verifyRefreshToken(parsed.data.refreshToken);
    // Xodim refresh tokeni bu yerda yaroqsiz (sub = User.id)
    if (payload.role !== PORTAL_ROLE) return res.status(401).json({ error: 'Invalid refresh' });
    const tokens = await refreshClient(payload.sub);
    if (!tokens) return res.status(401).json({ error: 'Invalid refresh' });
    return res.json(tokens);
  } catch {
    return res.status(401).json({ error: 'Invalid refresh' });
  }
});

router.get('/auth/me', requirePortal(), async (req: AuthRequest, res) => {
  try {
    const profile = await getClientProfile(req.user!.id);
    if (!profile) return res.status(404).json({ error: 'Not found' });
    return res.json(profile);
  } catch (error) {
    console.error('Portal me error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/shipments', requirePortal(), async (req: AuthRequest, res) => {
  const parsed = shipmentsQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status' });
  try {
    return res.json(await listShipments(req.user!.id, parsed.data.status));
  } catch (error) {
    console.error('Portal shipments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/shipments/:id', requirePortal(), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Not found' });
  try {
    const shipment = await getShipment(req.user!.id, id);
    if (!shipment) return res.status(404).json({ error: 'Not found' });
    return res.json(shipment);
  } catch (error) {
    console.error('Portal shipment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/documents', requirePortal(), async (req: AuthRequest, res) => {
  const parsed = documentsQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid query' });
  try {
    return res.json(await listDocuments(req.user!.id, parsed.data.shipmentId));
  } catch (error) {
    console.error('Portal documents error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/documents/:docId/download', requirePortal(), async (req: AuthRequest, res) => {
  try {
    const doc = await getDownloadableDocument(req.user!.id, String(req.params.docId));
    if (!doc) return res.status(404).json({ error: 'Not found' });
    return res.download(doc.absolutePath, doc.fileName);
  } catch (error) {
    console.error('Portal download error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
