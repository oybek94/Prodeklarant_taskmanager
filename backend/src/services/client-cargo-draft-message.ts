// Yuk arizasining guruhdagi jonli xabari va tugmalari. Sof funksiyalar — Telegram'ga bog'liq emas.
// Xabar yorliqlari rus tilida (mavjud /yangi xabari bilan bir xil), tugma matnlari o'zbek tilida.

import { AuthorMap, DraftData, DraftItem, getMissingRequired } from './client-cargo-draft';
import { HEADER_FIELDS, ITEM_FIELDS } from './client-cargo-form';

export type DraftStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';

export interface DraftMessageContext {
  contractText: string | null;
  shipmentPlace: string | null;
  currency: string | null;
}

export type InlineButton = { text: string; url: string } | { text: string; callback_data: string };

const TELEGRAM_MESSAGE_LIMIT = 4096;
const ELLIPSIS = '…';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const row = (label: string, value: string): string => `${escapeHtml(label)}: <b>${escapeHtml(value)}</b>`;

/** Xabarda ko'rsatiladigan ishtirokchilar soni; qolganlari "и ещё N" */
const MAX_LISTED_CONTRIBUTORS = 10;

/** "👤 Заполнили: Aziz, Vali" — to'ldirganlar birinchi kiritgan vaqti bo'yicha, bir kishi bir marta. Hech kim bo'lmasa bo'sh qator. */
function contributorsLine(authors: AuthorMap): string {
  const firstSeen = new Map<number, { name: string; at: string }>();
  for (const author of Object.values(authors)) {
    const known = firstSeen.get(author.tgUserId);
    if (!known || author.at < known.at) firstSeen.set(author.tgUserId, { name: author.name, at: author.at });
  }
  const people = [...firstSeen.values()].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  if (people.length === 0) return '';
  const listed = people.slice(0, MAX_LISTED_CONTRIBUTORS).map((p) => escapeHtml(p.name));
  const rest = people.length - listed.length;
  return `👤 Заполнили: ${listed.join(', ')}${rest > 0 ? ` и ещё ${rest}` : ''}`;
}

const isItemFilled = (item: DraftItem): boolean => ITEM_FIELDS.some((f) => (item.fields[f.key] ?? '').trim() !== '');

interface MessageParts {
  /** Sarlavha, sarlavha maydonlari va tovar bloklari (juda uzun bo'lsa qirqiladi) */
  main: string;
  /** Yetishmayotganlar ro'yxati yoki yakunlagan odam (qirqilmaydi) */
  footer: string;
}

function buildBody(input: { data: DraftData; authors: AuthorMap; context: DraftMessageContext; status: DraftStatus }): MessageParts {
  const { data, authors, context, status } = input;

  const headerLines = HEADER_FIELDS.flatMap((f) => {
    const value = f.key === 'contract' ? context.contractText : f.key === 'shipmentPlace' ? context.shipmentPlace : data.header[f.key];
    return value ? [row(f.label, value)] : [];
  });

  const itemBlocks = data.items
    .filter(isItemFilled)
    .map((item, index) => {
      const lines = ITEM_FIELDS.flatMap((f) => {
        const value = item.fields[f.key];
        if (!value) return [];
        const shown = f.key === 'price' && context.currency ? `${value} ${context.currency}` : value;
        return [row(f.label, shown)];
      });
      return [`<b>Товар ${index + 1}</b>`, ...lines].join('\n');
    });

  const title = status === 'COMPLETED' ? '✅ <b>Данные о грузе — полные</b>' : '🚛 <b>Данные о грузе</b>';
  const parts = [title];
  if (headerLines.length > 0) parts.push(headerLines.join('\n'));
  parts.push(...itemBlocks);

  // Oxirgi blok (qirqilmaydi): yetishmayotganlar, keyin to'ldirganlar
  const footerBlocks: string[] = [];
  if (status === 'OPEN') {
    const missing = getMissingRequired(data);
    if (missing.length > 0) {
      const lines = missing.map((m) => `• ${m.itemNumber === null ? '' : `Товар ${m.itemNumber}: `}${escapeHtml(m.label)}`);
      footerBlocks.push(['⏳ <b>Не заполнено:</b>', ...lines].join('\n'));
    }
  }
  const contributors = contributorsLine(authors);
  if (contributors) footerBlocks.push(contributors);
  return { main: parts.join('\n\n'), footer: footerBlocks.join('\n\n') };
}

const joinParts = (p: MessageParts): string => (p.footer ? `${p.main}\n\n${p.footer}` : p.main);

/** Satr chegarasida qirqadi: har satrdagi <b> teglari o'sha satrning ichida yopiladi, shuning uchun HTML buzilmaydi */
function truncateAtLine(text: string, maxLength: number): string {
  const cut = text.lastIndexOf('\n', maxLength - ELLIPSIS.length);
  return `${text.slice(0, cut > 0 ? cut : maxLength - ELLIPSIS.length)}${ELLIPSIS}`;
}

/**
 * Guruhdagi jonli xabar matni (HTML). Qatorlarda muallif ko'rsatilmaydi: kimlar to'ldirgani oxirida bitta qatorda.
 * Juda uzun bo'lsa tovarlar satr chegarasida qirqiladi, oxirgi blok (yetishmayotganlar, to'ldirganlar) saqlanadi.
 */
export function formatDraftMessage(input: {
  data: DraftData;
  authors: AuthorMap;
  context: DraftMessageContext;
  status: DraftStatus;
}): string {
  if (input.status === 'CANCELLED') return '❌ <b>Отменено</b>';
  const parts = buildBody(input);
  const full = joinParts(parts);
  if (full.length <= TELEGRAM_MESSAGE_LIMIT) return full;
  // Foydalanuvchi nima yetishmayotganini ko'rsin: "Не заполнено" / "Заполнили" qirqilmaydi
  const room = TELEGRAM_MESSAGE_LIMIT - (parts.footer ? parts.footer.length + 2 : 0);
  return joinParts({ main: truncateAtLine(parts.main, room), footer: parts.footer });
}

export function buildDraftLaunchLink(baseLink: string, chatId: string, draft: number | 'new'): string {
  return `${baseLink}?startapp=${chatId}_${draft}`;
}

export function buildDraftKeyboard(input: {
  draftId: number;
  chatId: string;
  status: DraftStatus;
  complete: boolean;
  miniAppLink: string | null;
  confirmCancel?: boolean;
}): InlineButton[][] {
  const { draftId, chatId, status, complete, miniAppLink, confirmCancel } = input;
  if (status !== 'OPEN') return [];
  if (confirmCancel) {
    return [
      [
        { text: 'Ha, bekor qilish', callback_data: `cargo:cancel-yes:${draftId}` },
        { text: "Yo'q", callback_data: `cargo:cancel-no:${draftId}` },
      ],
    ];
  }
  const keyboard: InlineButton[][] = [];
  const actions: InlineButton[] = [];
  if (miniAppLink) actions.push({ text: "✏️ To'ldirish", url: buildDraftLaunchLink(miniAppLink, chatId, draftId) });
  if (complete) actions.push({ text: '✅ Yakunlash', callback_data: `cargo:done:${draftId}` });
  if (actions.length > 0) keyboard.push(actions);
  keyboard.push([{ text: '🗑 Bekor qilish', callback_data: `cargo:cancel:${draftId}` }]);
  return keyboard;
}

/** "INV-123 | 01A123BC" — qiymat yo'q bo'lsa "—" */
export function draftLabel(data: DraftData): string {
  const invoice = data.header.invoiceNumber?.trim() || '—';
  const vehicle = data.header.vehicleNumber?.trim() || '—';
  return `${invoice} | ${vehicle}`;
}
