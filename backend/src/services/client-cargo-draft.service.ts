import { Prisma, type ClientCargoDraft } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { callTelegram } from './telegram-bot-api';
import {
  applyDraftPatch,
  EMPTY_DRAFT_DATA,
  getMissingRequired,
  type AuthorMap,
  type DraftData,
  type DraftPatch,
  type MissingField,
} from './client-cargo-draft';
import { buildDraftKeyboard, draftLabel, formatDraftMessage, type DraftMessageContext, type DraftStatus } from './client-cargo-draft-message';
import { rememberProduct, shipmentPlaceOf } from './client-cargo-miniapp.service';
import type { FieldErrors } from './client-cargo-miniapp';

// Yuk arizasi (qoralama) servisi: bazaga yozish (versiya bo'yicha optimistik), guruhdagi jonli xabarni yuborish/tahrirlash.

const MAX_WRITE_ATTEMPTS = 3;
const SYNC_INTERVAL_MS = 3000;
const DEFAULT_LIST_LIMIT = 5;

export interface DraftView {
  id: number;
  status: DraftStatus;
  version: number;
  data: DraftData;
  authors: AuthorMap;
  missing: MissingField[];
  complete: boolean;
  messageId: number | null;
  completedByName: string | null;
}

export interface DraftSummary {
  id: number;
  label: string;
  missingCount: number;
  updatedAt: string;
}

export interface DraftFailure {
  ok: false;
  status: 400 | 404 | 409 | 502;
  error: string;
  errors?: FieldErrors;
}
export type DraftResult = { ok: true; draft: DraftView } | DraftFailure;

export interface DraftActor {
  tgUserId: number;
  name: string;
}
export interface DraftScope {
  botToken: string;
  clientId: number;
  chatId: string;
}
type ReadScope = Pick<DraftScope, 'clientId' | 'chatId'>;

export type SyncResult = { ok: true } | { ok: false; description: string };

const draftDataSchema = z.object({
  contractId: z.number().int().nullable(),
  branchId: z.number().int().nullable(),
  header: z.record(z.string(), z.string()),
  items: z.array(z.object({ uid: z.string(), fields: z.record(z.string(), z.string()), bruttoManual: z.boolean() })),
});
const authorMapSchema = z.record(z.string(), z.object({ tgUserId: z.number(), name: z.string(), at: z.string() }));

interface ParsedRow {
  data: DraftData;
  authors: AuthorMap;
}

/** Bazadagi Json'ni tekshirib o'qiydi; buzuq bo'lsa null (500 emas) */
function parseRow(row: ClientCargoDraft): ParsedRow | null {
  const data = draftDataSchema.safeParse(row.data);
  const authors = authorMapSchema.safeParse(row.authors);
  if (!data.success || !authors.success) return null;
  return { data: data.data, authors: authors.data };
}

function toView(row: ClientCargoDraft, parsed: ParsedRow): DraftView {
  const missing = getMissingRequired(parsed.data);
  return {
    id: row.id,
    status: row.status,
    version: row.version,
    data: parsed.data,
    authors: parsed.authors,
    missing,
    complete: missing.length === 0,
    messageId: row.messageId,
    completedByName: row.completedByName,
  };
}

/** Prisma Json maydoniga yoziladigan qiymat (qoralama tuzilmasi Zod bilan o'qishda tekshiriladi) */
const toJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const miniAppLink = (): string | null => process.env.CLIENT_BOT_MINIAPP_LINK?.trim().replace(/\/+$/, '') || null;

const failure = (status: DraftFailure['status'], error: string, errors?: FieldErrors): DraftFailure => ({ ok: false, status, error, errors });
const NOT_FOUND = failure(404, 'Ariza topilmadi');

const findScoped = (scope: ReadScope, id: number) =>
  prisma.clientCargoDraft.findFirst({ where: { id, clientId: scope.clientId, chatId: scope.chatId } });

/** Shartnoma shu mijozniki, filial faol ekanini tekshiradi (submitCargo dagi qoidalar bilan bir xil) */
async function validateRefs(clientId: number, patch: DraftPatch): Promise<DraftFailure | null> {
  if (patch.contractId) {
    const contract = await prisma.contract.findFirst({ where: { id: patch.contractId, clientId }, select: { id: true } });
    if (!contract) return failure(400, 'Shartnoma topilmadi');
  }
  if (patch.branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: patch.branchId, isActive: true }, select: { id: true } });
    if (!branch) return failure(400, 'Filial topilmadi');
  }
  return null;
}

/**
 * "Вид упаковки" faqat Sozlamalar → Spetsifikatsiyalar → Qadoq turlari (PackagingType) ro'yxatidan.
 * Katta-kichik harf farqsiz moslanadi va bazadagi yozuv (nomi) bilan almashtiriladi. Ro'yxatda yo'q qiymat — maydon xatosi.
 */
async function resolvePackagingTypes(patch: DraftPatch): Promise<{ ok: true; patch: DraftPatch } | DraftFailure> {
  const wanted: Array<{ uid: string; value: string }> = [];
  for (const [uid, entry] of Object.entries(patch.items ?? {})) {
    const value = entry?.fields?.packagingType;
    if (typeof value === 'string' && value.trim() !== '') wanted.push({ uid, value: value.trim() });
  }
  if (wanted.length === 0) return { ok: true, patch };

  const types = await prisma.packagingType.findMany({ orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }], select: { name: true } });
  const byLower = new Map(types.map((t) => [t.name.trim().toLowerCase(), t.name]));
  const errors: FieldErrors = {};
  const items: NonNullable<DraftPatch['items']> = { ...patch.items };
  for (const { uid, value } of wanted) {
    const canonical = byLower.get(value.toLowerCase());
    if (!canonical) {
      errors[`items.${uid}.packagingType`] = "Qadoq turini ro'yxatdan tanlang";
      continue;
    }
    const entry = items[uid];
    if (entry) items[uid] = { ...entry, fields: { ...entry.fields, packagingType: canonical } };
  }
  if (Object.keys(errors).length > 0) return failure(400, "Ba'zi maydonlar noto'g'ri", errors);
  return { ok: true, patch: { ...patch, items } };
}

export async function getDraft(scope: ReadScope, id: number): Promise<DraftView | null> {
  const row = await findScoped(scope, id);
  if (!row) return null;
  const parsed = parseRow(row);
  return parsed ? toView(row, parsed) : null;
}

export async function listOpenDrafts(scope: ReadScope, limit = DEFAULT_LIST_LIMIT): Promise<DraftSummary[]> {
  const rows = await prisma.clientCargoDraft.findMany({
    where: { clientId: scope.clientId, chatId: scope.chatId, status: 'OPEN' },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  const summaries: DraftSummary[] = [];
  for (const row of rows) {
    const parsed = parseRow(row);
    if (!parsed) continue;
    summaries.push({ id: row.id, label: draftLabel(parsed.data), missingCount: getMissingRequired(parsed.data).length, updatedAt: row.updatedAt.toISOString() });
  }
  return summaries;
}

// ---- Guruhdagi jonli xabar ----

const lastSyncAt = new Map<number, number>();
const pendingSync = new Map<number, ReturnType<typeof setTimeout>>();

async function loadMessageContext(data: DraftData): Promise<DraftMessageContext> {
  const [contract, branch] = await Promise.all([
    data.contractId ? prisma.contract.findUnique({ where: { id: data.contractId }, select: { contractNumber: true, buyerName: true, contractCurrency: true } }) : null,
    data.branchId ? prisma.branch.findUnique({ where: { id: data.branchId }, select: { name: true, regionText: true } }) : null,
  ]);
  return {
    contractText: contract ? `${contract.contractNumber}, ${contract.buyerName}` : null,
    shipmentPlace: branch ? shipmentPlaceOf(branch) : null,
    currency: contract?.contractCurrency ?? null,
  };
}

async function runSyncNow(botToken: string, draftId: number): Promise<SyncResult> {
  lastSyncAt.set(draftId, Date.now());
  const row = await prisma.clientCargoDraft.findUnique({ where: { id: draftId } });
  if (!row) return { ok: false, description: 'Ariza topilmadi' };
  const parsed = parseRow(row);
  if (!parsed) return { ok: false, description: "Ariza ma'lumoti buzuq" };

  const view = toView(row, parsed);
  const text = formatDraftMessage({
    data: parsed.data,
    authors: parsed.authors,
    context: await loadMessageContext(parsed.data),
    status: row.status,
  });
  const reply_markup = {
    inline_keyboard: buildDraftKeyboard({ draftId, chatId: row.chatId, status: row.status, complete: view.complete, miniAppLink: miniAppLink() }),
  };

  if (row.messageId !== null) {
    const edited = await callTelegram<unknown>(botToken, 'editMessageText', { chat_id: row.chatId, message_id: row.messageId, text, parse_mode: 'HTML', reply_markup });
    if (edited.ok) return { ok: true };
    if (edited.description.includes('message is not modified')) return { ok: true };
    const gone = edited.description.includes('message to edit not found') || edited.description.includes("message can't be edited");
    if (!gone) {
      console.error('[ClientCargoDraft] Xabarni tahrirlab bo\'lmadi:', edited.description);
      return { ok: false, description: edited.description };
    }
  }

  const sent = await callTelegram<{ message_id: number }>(botToken, 'sendMessage', { chat_id: row.chatId, text, parse_mode: 'HTML', reply_markup });
  if (!sent.ok) {
    console.error("[ClientCargoDraft] Guruhga yuborib bo'lmadi:", sent.description);
    return { ok: false, description: sent.description };
  }
  await prisma.clientCargoDraft.update({ where: { id: draftId }, data: { messageId: sent.result.message_id } });
  return { ok: true };
}

const syncChains = new Map<number, Promise<SyncResult>>();

/**
 * Bir ariza uchun sinxronlashlar ketma-ket bajariladi: kechikib tugagan eski tahrir yangi (masalan "Отменено") xabarni bosib ketmaydi,
 * chunki keyingi sinxronlash oldingisi tugagach bazadagi eng yangi holatni o'qiydi. Xato otmaydi — natija sifatida qaytaradi.
 */
function runSync(botToken: string, draftId: number): Promise<SyncResult> {
  const previous = syncChains.get(draftId);
  const next: Promise<SyncResult> = (previous ? previous.catch(() => undefined) : Promise.resolve())
    .then(() => runSyncNow(botToken, draftId))
    .catch((e: unknown): SyncResult => {
      const description = e instanceof Error ? e.message : "noma'lum xato";
      console.error('[ClientCargoDraft] Xabarni moslashda xato:', description);
      return { ok: false, description };
    });
  syncChains.set(draftId, next);
  const cleanup = () => {
    if (syncChains.get(draftId) === next) syncChains.delete(draftId);
  };
  next.then(cleanup, cleanup);
  return next;
}

/**
 * Ariza xabarini bazadagi holatga moslaydi. `immediate` bo'lmasa shu ariza tahrirlari orasida kamida 3 soniya bo'ladi:
 * tez ketma-ket o'zgarishlar bitta kechiktirilgan tahrirga birlashadi (Telegram cheklovi + guruhni to'ldirmaslik uchun).
 */
export async function syncDraftMessage(botToken: string, draftId: number, options: { immediate?: boolean } = {}): Promise<SyncResult> {
  if (options.immediate) {
    const timer = pendingSync.get(draftId);
    if (timer) clearTimeout(timer);
    pendingSync.delete(draftId);
    return runSync(botToken, draftId);
  }
  if (pendingSync.has(draftId)) return { ok: true };
  const wait = SYNC_INTERVAL_MS - (Date.now() - (lastSyncAt.get(draftId) ?? Number.NEGATIVE_INFINITY));
  if (wait > 0) {
    pendingSync.set(
      draftId,
      setTimeout(() => {
        pendingSync.delete(draftId);
        runSync(botToken, draftId).catch((e: unknown) => console.error('[ClientCargoDraft] Kechiktirilgan tahrir xatosi:', e instanceof Error ? e.message : e));
      }, wait)
    );
    return { ok: true };
  }
  return runSync(botToken, draftId);
}

// ---- Yozish ----

type Decision = { kind: 'error'; error: DraftFailure } | { kind: 'noop' } | { kind: 'write'; data: Prisma.ClientCargoDraftUpdateManyMutationInput };

/** Versiya bo'yicha optimistik yozuv: to'qnashuvda qayta o'qib, qarorni yangi holat ustida qaytadan hisoblaydi */
async function mutateDraft(
  scope: DraftScope,
  id: number,
  decide: (row: ClientCargoDraft, parsed: ParsedRow) => Promise<Decision> | Decision,
  options: { immediateSync: boolean; /** Yopiq arizada o'zgarish yo'q bo'lsa ham xabarni qayta moslash (oldingi tahrir yiqilgan bo'lishi mumkin) */ syncOnNoop?: boolean; afterWrite?: (parsed: ParsedRow) => Promise<void> }
): Promise<DraftResult> {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    const row = await findScoped(scope, id);
    if (!row) return NOT_FOUND;
    const parsed = parseRow(row);
    if (!parsed) return failure(409, "Ariza ma'lumoti buzuq");

    const decision = await decide(row, parsed);
    if (decision.kind === 'error') return decision.error;
    if (decision.kind === 'noop') {
      if (options.syncOnNoop) await syncDraftMessage(scope.botToken, id, { immediate: true });
      return { ok: true, draft: toView(row, parsed) };
    }

    const written = await prisma.clientCargoDraft.updateMany({
      where: { id: row.id, version: row.version, status: 'OPEN' },
      data: { ...decision.data, version: { increment: 1 } },
    });
    if (written.count === 0) continue;

    await options.afterWrite?.(parsed);
    await syncDraftMessage(scope.botToken, id, { immediate: options.immediateSync });
    const fresh = await findScoped(scope, id);
    const freshParsed = fresh ? parseRow(fresh) : null;
    if (!fresh || !freshParsed) return NOT_FOUND;
    return { ok: true, draft: toView(fresh, freshParsed) };
  }
  return failure(409, "Boshqa foydalanuvchi bir vaqtda o'zgartirdi, qayta urinib ko'ring");
}

const CLOSED_ERROR = failure(409, 'Ariza yopilgan, uni o\'zgartirib bo\'lmaydi');

export async function patchDraft(scope: DraftScope, id: number, actor: DraftActor, rawPatch: DraftPatch): Promise<DraftResult> {
  const refError = await validateRefs(scope.clientId, rawPatch);
  if (refError) return refError;
  const resolved = await resolvePackagingTypes(rawPatch);
  if (!resolved.ok) return resolved;
  const patch = resolved.patch;
  return mutateDraft(
    scope,
    id,
    (row, parsed) => {
      if (row.status !== 'OPEN') return { kind: 'error', error: CLOSED_ERROR };
      const applied = applyDraftPatch(parsed.data, parsed.authors, patch, { ...actor, at: new Date().toISOString() });
      if (!applied.ok) return { kind: 'error', error: failure(400, "Ba'zi maydonlar noto'g'ri", applied.errors) };
      if (JSON.stringify(applied.data) === JSON.stringify(parsed.data)) return { kind: 'noop' };
      return { kind: 'write', data: { data: toJson(applied.data), authors: toJson(applied.authors) } };
    },
    { immediateSync: false }
  );
}

export async function createDraft(scope: DraftScope, actor: DraftActor, rawPatch: DraftPatch): Promise<DraftResult> {
  const refError = await validateRefs(scope.clientId, rawPatch);
  if (refError) return refError;
  const resolved = await resolvePackagingTypes(rawPatch);
  if (!resolved.ok) return resolved;
  const patch = resolved.patch;
  const applied = applyDraftPatch(EMPTY_DRAFT_DATA, {}, patch, { ...actor, at: new Date().toISOString() });
  if (!applied.ok) return failure(400, "Ba'zi maydonlar noto'g'ri", applied.errors);
  if (Object.keys(applied.authors).length === 0) return failure(400, "Hech narsa kiritilmadi. Kamida bitta maydonni to'ldiring");

  const created = await prisma.clientCargoDraft.create({
    data: { clientId: scope.clientId, chatId: scope.chatId, status: 'OPEN', data: toJson(applied.data), authors: toJson(applied.authors) },
  });
  const sent = await syncDraftMessage(scope.botToken, created.id, { immediate: true });
  if (!sent.ok) {
    // Guruhga xabar chiqmagan ariza foydalanuvchiga ko'rinmaydi — qoldirmaymiz, qayta urinishda takrorlanmasin
    await prisma.clientCargoDraft.delete({ where: { id: created.id } });
    return failure(502, "Xabarni guruhga yuborib bo'lmadi. Bot guruhda ekanini tekshiring");
  }
  const view = await getDraft(scope, created.id);
  return view ? { ok: true, draft: view } : NOT_FOUND;
}

export async function completeDraft(scope: DraftScope, id: number, actor: DraftActor): Promise<DraftResult> {
  return mutateDraft(
    scope,
    id,
    (row, parsed) => {
      if (row.status === 'COMPLETED') return { kind: 'noop' };
      if (row.status === 'CANCELLED') return { kind: 'error', error: CLOSED_ERROR };
      const missing = getMissingRequired(parsed.data);
      if (missing.length > 0) {
        const names = missing.map((m) => (m.itemNumber === null ? m.label : `Товар ${m.itemNumber}: ${m.label}`)).join(', ');
        return { kind: 'error', error: failure(400, `Majburiy maydonlar to'ldirilmagan: ${names}`) };
      }
      return { kind: 'write', data: { status: 'COMPLETED', completedAt: new Date(), completedByName: actor.name } };
    },
    {
      immediateSync: true,
      syncOnNoop: true,
      afterWrite: async (parsed) => {
        const products = new Set(parsed.data.items.map((item) => item.fields.product).filter((p): p is string => !!p));
        for (const name of products) {
          try {
            await rememberProduct(scope.clientId, name);
          } catch (e) {
            console.error('[ClientCargoDraft] Mahsulot nomini saqlashda xatolik:', e instanceof Error ? e.message : e);
          }
        }
      },
    }
  );
}

export async function cancelDraft(scope: DraftScope, id: number, _actor: DraftActor): Promise<DraftResult> {
  return mutateDraft(
    scope,
    id,
    (row) => {
      if (row.status === 'CANCELLED') return { kind: 'noop' };
      if (row.status === 'COMPLETED') return { kind: 'error', error: CLOSED_ERROR };
      return { kind: 'write', data: { status: 'CANCELLED' } };
    },
    { immediateSync: true, syncOnNoop: true }
  );
}
