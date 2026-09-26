import { Router } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { getCeoStats } from '../services/ceo-stats.service';

const router = Router();

// Moliya sahifasi — mantiq: services/ceo-stats.service.ts.
// Oldingi balance/debtors/debts/debt/statistics/exchange-rates/convert-currency endpointlari
// hech qayerda ishlatilmagani uchun 2026-09-26 da olib tashlandi (git tarixida bor).
router.get('/ceo-stats', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  try {
    res.json(await getCeoStats());
  } catch (error) {
    console.error('Error fetching CEO stats:', error);
    res.status(500).json({ error: 'CEO Statistika xatosi' });
  }
});

export default router;
