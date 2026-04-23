import { Router } from 'express';
import { fetchUsdToRubRate } from '../services/exchange-rate';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/exchange-rate/usd-rub
router.get('/usd-rub', requireAuth(), async (req, res) => {
  try {
    const rate = await fetchUsdToRubRate();
    if (rate !== null) {
      res.json({ rate: rate.toNumber() });
    } else {
      res.status(503).json({ error: 'Valyuta kursini olish iloji bo\'lmadi' });
    }
  } catch (error: any) {
    console.error('Error in /usd-rub endpoint:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

export default router;
