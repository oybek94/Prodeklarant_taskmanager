import { Router, Request, Response, NextFunction } from 'express';
import { timingSafeEqual, createHash } from 'crypto';
import rateLimit from 'express-rate-limit';
import { getPublicSiteStats } from '../services/public-site-stats.service';

const router = Router();

const MIN_KEY_LENGTH = 24;

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Landing (prodeklarant.uz) serveri bilan umumiy sir. SITE_STATS_KEY sozlanmagan
 * yoki qisqa bo'lsa endpoint umuman yo'q (404) — tasodifan ochiq qolmaydi.
 */
function requireSiteStatsKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.SITE_STATS_KEY;
  if (!expected || expected.length < MIN_KEY_LENGTH) {
    return res.status(404).json({ error: 'Not found' });
  }
  const provided = req.header('x-site-stats-key');
  // Uzunligi har xil bo'lsa ham vaqt bo'yicha farq bildirmaslik uchun hash'lar solishtiriladi
  if (!provided || !timingSafeEqual(digest(provided), digest(expected))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Juda ko\'p so\'rov.' },
});

// GET /api/public/site-stats — faqat jamlangan sonlar, 1 soat keshlanadi
router.get('/', limiter, requireSiteStatsKey, async (_req, res) => {
  try {
    res.set('Cache-Control', 'private, max-age=300');
    res.json(await getPublicSiteStats());
  } catch (error) {
    console.error('Public site stats error:', error);
    res.status(500).json({ error: 'Statistikani hisoblashda xatolik yuz berdi' });
  }
});

export default router;
