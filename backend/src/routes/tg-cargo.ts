import { NextFunction, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../prisma';
import { z } from 'zod';
import { draftPatchSchema, parseLaunchParam } from '../services/client-cargo-draft';
import { completeDraft, createDraft, getDraft, listOpenDrafts, patchDraft, type DraftResult } from '../services/client-cargo-draft.service';
import { submitBodySchema, verifyInitData } from '../services/client-cargo-miniapp';
import { getCargoContext, isGroupMember, submitCargo } from '../services/client-cargo-miniapp.service';

// Yuk ma'lumotlari Mini App API. Bu yo'llar umumiy JWT himoyasidan ochiq (PUBLIC_API_PREFIXES),
// ammo har so'rovda Telegram imzosi (initData) tekshiriladi va foydalanuvchi guruh a'zosi bo'lishi shart.

interface TgRequest extends Request {
  tg?: { botToken: string; clientId: number; chatId: string; userId: number; userName: string; draft: number | 'new' | null };
}

const router = Router();

router.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 60 : 1000,
    message: { error: "Juda ko'p so'rov. Bir daqiqadan keyin qayta urinib ko'ring." },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const requireTelegramAuth = async (req: TgRequest, res: Response, next: NextFunction) => {
  try {
    const botToken = process.env.CLIENT_BOT_TOKEN;
    if (!botToken) return res.status(503).json({ error: 'Mini App sozlanmagan' });

    const header = req.headers.authorization;
    if (!header?.startsWith('tma ')) return res.status(401).json({ error: 'Telegram orqali oching' });

    const launch = verifyInitData(header.slice(4), botToken, Math.floor(Date.now() / 1000));
    if (!launch) return res.status(401).json({ error: 'Sessiya eskirgan. Mini App ni qayta oching' });

    const param = parseLaunchParam(launch.startParam);
    if (!param) return res.status(400).json({ error: 'Formani guruhdagi tugma orqali oching' });
    const { chatId, draft } = param;

    const client = await prisma.client.findUnique({ where: { botGroupChatId: chatId }, select: { id: true } });
    if (!client) return res.status(404).json({ error: 'Bu guruh mijozga ulanmagan' });

    if (!(await isGroupMember(botToken, chatId, launch.userId))) {
      return res.status(403).json({ error: 'Siz bu guruh a\'zosi emassiz' });
    }

    req.tg = { botToken, clientId: client.id, chatId, userId: launch.userId, userName: launch.userName, draft };
    next();
  } catch (e) {
    console.error('[ClientCargoMiniApp] auth xatosi:', e instanceof Error ? e.message : e);
    res.status(500).json({ error: 'Server xatosi' });
  }
};

router.use(requireTelegramAuth);

router.get('/context', async (req: TgRequest, res) => {
  const context = await getCargoContext(req.tg!.clientId);
  if (!context) return res.status(404).json({ error: 'Mijoz topilmadi' });
  res.set('Cache-Control', 'no-store');
  res.json({ ...context, launch: { draft: req.tg!.draft } });
});

router.post('/submit', async (req: TgRequest, res) => {
  const body = submitBodySchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "So'rov noto'g'ri" });
  const { botToken, clientId, chatId } = req.tg!;
  const result = await submitCargo({ botToken, clientId, chatId, body: body.data });
  if (result.ok) return res.json({ ok: true });
  res.status(result.status).json({ error: result.error, errors: 'errors' in result ? result.errors : undefined });
});

// ---- Yuk arizasi (qoralama): bir nechta xodim navbatma-navbat to'ldiradi ----

const draftIdSchema = z.coerce.number().int().positive();

const scopeOf = (tg: NonNullable<TgRequest['tg']>) => ({ botToken: tg.botToken, clientId: tg.clientId, chatId: tg.chatId });
/** Muallif ismi faqat imzolangan initData'dan olinadi */
const actorOf = (tg: NonNullable<TgRequest['tg']>) => ({ tgUserId: tg.userId, name: tg.userName });

const sendDraftResult = (res: Response, result: DraftResult) => {
  if (result.ok) return res.json(result.draft);
  return res.status(result.status).json({ error: result.error, errors: result.errors });
};

router.get('/drafts', async (req: TgRequest, res) => {
  const { clientId, chatId } = req.tg!;
  res.set('Cache-Control', 'no-store');
  res.json({ drafts: await listOpenDrafts({ clientId, chatId }) });
});

router.get('/drafts/:id', async (req: TgRequest, res) => {
  const id = draftIdSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Ariza raqami noto'g'ri" });
  const { clientId, chatId } = req.tg!;
  const draft = await getDraft({ clientId, chatId }, id.data);
  if (!draft) return res.status(404).json({ error: 'Ariza topilmadi' });
  res.set('Cache-Control', 'no-store');
  res.json(draft);
});

router.post('/drafts', async (req: TgRequest, res) => {
  const body = draftPatchSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "So'rov noto'g'ri" });
  sendDraftResult(res, await createDraft(scopeOf(req.tg!), actorOf(req.tg!), body.data));
});

router.patch('/drafts/:id', async (req: TgRequest, res) => {
  const id = draftIdSchema.safeParse(req.params.id);
  const body = draftPatchSchema.safeParse(req.body);
  if (!id.success || !body.success) return res.status(400).json({ error: "So'rov noto'g'ri" });
  sendDraftResult(res, await patchDraft(scopeOf(req.tg!), id.data, actorOf(req.tg!), body.data));
});

router.post('/drafts/:id/complete', async (req: TgRequest, res) => {
  const id = draftIdSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Ariza raqami noto'g'ri" });
  sendDraftResult(res, await completeDraft(scopeOf(req.tg!), id.data, actorOf(req.tg!)));
});

export default router;
