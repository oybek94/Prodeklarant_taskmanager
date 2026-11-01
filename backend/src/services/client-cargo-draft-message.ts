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

function row(label: string, value: string, author: string | null): string {
  const base = `${escapeHtml(label)}: <b>${escapeHtml(value)}</b>`;
  return author ? `${base} — 👤 ${escapeHtml(author)}` : base;
}

const isItemFilled = (item: DraftItem): boolean => ITEM_FIELDS.some((f) => (item.fields[f.key] ?? '').trim() !== '');

function buildBody(input: { data: DraftData; authors: AuthorMap; context: DraftMessageContext; status: DraftStatus; actorName?: string | null }, withAuthors: boolean): string {
  const { data, authors, context, status, actorName } = input;
  const authorOf = (path: string): string | null => (withAuthors ? (authors[path]?.name ?? null) : null);

  const headerLines = HEADER_FIELDS.flatMap((f) => {
    let value: string | undefined;
    let authorPath = `header.${f.key}`;
    if (f.key === 'contract') {
      value = context.contractText ?? undefined;
      authorPath = 'contractId';
    } else if (f.key === 'shipmentPlace') {
      value = context.shipmentPlace ?? undefined;
      authorPath = 'branchId';
    } else {
      value = data.header[f.key];
    }
    return value ? [row(f.label, value, authorOf(authorPath))] : [];
  });

  const itemBlocks = data.items
    .filter(isItemFilled)
    .map((item, index) => {
      const lines = ITEM_FIELDS.flatMap((f) => {
        const value = item.fields[f.key];
        if (!value) return [];
        const shown = f.key === 'price' && context.currency ? `${value} ${context.currency}` : value;
        return [row(f.label, shown, authorOf(`items.${item.uid}.${f.key}`))];
      });
      return [`<b>Товар ${index + 1}</b>`, ...lines].join('\n');
    });

  const title = status === 'COMPLETED' ? '✅ <b>Данные о грузе — полные</b>' : '🚛 <b>Данные о грузе</b>';
  const parts = [title];
  if (headerLines.length > 0) parts.push(headerLines.join('\n'));
  parts.push(...itemBlocks);

  if (status === 'OPEN') {
    const missing = getMissingRequired(data);
    if (missing.length > 0) {
      const lines = missing.map((m) => `• ${m.itemNumber === null ? '' : `Товар ${m.itemNumber}: `}${escapeHtml(m.label)}`);
      parts.push(['⏳ <b>Не заполнено:</b>', ...lines].join('\n'));
    }
  }
  if (status === 'COMPLETED' && actorName) parts.push(`Завершил(а): <b>${escapeHtml(actorName)}</b>`);
  return parts.join('\n\n');
}

/** Satr chegarasida qirqadi: har satrdagi <b> teglari o'sha satrning ichida yopiladi, shuning uchun HTML buzilmaydi */
function truncateAtLine(text: string): string {
  const cut = text.lastIndexOf('\n', TELEGRAM_MESSAGE_LIMIT - ELLIPSIS.length);
  return `${text.slice(0, cut > 0 ? cut : TELEGRAM_MESSAGE_LIMIT - ELLIPSIS.length)}${ELLIPSIS}`;
}

/**
 * Guruhdagi jonli xabar matni (HTML). Uzun bo'lsa avval mualliflarsiz qayta quriladi, hali ham uzun bo'lsa satr chegarasida qirqiladi.
 */
export function formatDraftMessage(input: {
  data: DraftData;
  authors: AuthorMap;
  context: DraftMessageContext;
  status: DraftStatus;
  actorName?: string | null;
}): string {
  if (input.status === 'CANCELLED') return '❌ <b>Отменено</b>';
  const full = buildBody(input, true);
  if (full.length <= TELEGRAM_MESSAGE_LIMIT) return full;
  const compact = buildBody(input, false);
  return compact.length <= TELEGRAM_MESSAGE_LIMIT ? compact : truncateAtLine(compact);
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
