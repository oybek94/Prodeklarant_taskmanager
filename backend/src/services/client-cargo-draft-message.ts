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

/** Qator boshidagi belgi: ko'z maydonni tez topishi uchun. Yorliq matni o'zgarmaydi (xodimlar o'rganib qolgan). */
const HEADER_ICONS: Record<string, string> = {
  contract: '📄',
  invoiceNumber: '🧾',
  deliveryTerms: '🌍',
  customsPlace: '🛃',
  destination: '🎯',
  vehicleNumber: '🚛',
  shipmentPlace: '🏭',
  orderNumber: '🔢',
  temperature: '🌡',
  sensorSerial: '📟',
};
const ITEM_ICONS: Record<string, string> = {
  product: '🏷',
  boxCount: '📦',
  boxWeight: '⚖️',
  packagingType: '🗃',
  palletCount: '🧱',
  palletWeight: '⚖️',
  netto: '⚖️',
  brutto: '⚖️',
  price: '💰',
};

/** Tovar maydonlari qiymatidan keyingi o'lchov birligi (narxga shartnoma valyutasi alohida qo'shiladi) */
const ITEM_UNITS: Record<string, string> = {
  boxCount: 'шт.',
  palletCount: 'шт.',
  boxWeight: 'кг.',
  palletWeight: 'кг.',
  netto: 'кг.',
  brutto: 'кг.',
};

/** Soni qatoriga vazni birlashtiriladigan juftliklar: soni → vazni (va aksincha: vazn qatori qaysi son qatoriga qo'shilgan) */
const COUNT_MERGES_WEIGHT: Record<string, string> = { boxCount: 'boxWeight', palletCount: 'palletWeight' };
const WEIGHT_MERGED_INTO: Record<string, string> = { boxWeight: 'boxCount', palletWeight: 'palletCount' };

/** Shundan uzun qiymat (masalan bojxona manzili) alohida qatorda <blockquote> ichida: qatorlar bir-biriga yopishib ketmasin */
const LONG_VALUE_LENGTH = 40;

function row(icon: string | undefined, label: string, value: string): string {
  const head = `${icon ? `${icon} ` : ''}${escapeHtml(label)}:`;
  // Qiymat bitta satrda: xabar satr chegarasida qirqilganda teglar buzilmaydi
  return value.length > LONG_VALUE_LENGTH ? `${head}\n<blockquote>${escapeHtml(value)}</blockquote>` : `${head} <b>${escapeHtml(value)}</b>`;
}

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

/** Qiymatlar 3 xonagacha o'nli: ming ga ko'paytirilgan butun son sifatida yig'iladi (0.1 + 0.2 kabi float xatosi bo'lmasin) */
function sumMilli(values: Array<string | undefined>): number | null {
  let total = 0;
  let found = false;
  for (const value of values) {
    const n = Number(value);
    if (!value || !Number.isFinite(n)) continue;
    total += Math.round(n * 1000);
    found = true;
  }
  return found ? total : null;
}

/** 20330000 → "20 330"; 3000750 → "3 000.75" (mingliklar bo'shliq bilan, o'nli qism nuqta bilan) */
function formatMilli(milli: number): string {
  const whole = Math.floor(milli / 1000);
  const fraction = milli % 1000;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction === 0 ? grouped : `${grouped}.${String(fraction).padStart(3, '0').replace(/0+$/, '')}`;
}

/** 2 va undan ortiq tovar bo'lsa: "📊 Итого: 20 330 нетто / 21 770 брутто". Qiymati bor qismigina chiqadi; hech biri bo'lmasa bo'sh. */
function totalsLine(items: DraftItem[]): string {
  const filled = items.filter(isItemFilled);
  if (filled.length < 2) return '';
  const netto = sumMilli(filled.map((i) => i.fields.netto));
  const brutto = sumMilli(filled.map((i) => i.fields.brutto));
  const parts = [...(netto === null ? [] : [`${formatMilli(netto)} нетто`]), ...(brutto === null ? [] : [`${formatMilli(brutto)} брутто`])];
  return parts.length > 0 ? `📊 Итого: <b>${parts.join(' / ')}</b>` : '';
}

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
    return value ? [row(HEADER_ICONS[f.key], f.label, value)] : [];
  });

  const itemBlocks = data.items
    .filter(isItemFilled)
    .map((item, index) => {
      const lines = ITEM_FIELDS.flatMap((f) => {
        const value = item.fields[f.key];
        if (!value) return [];
        const packaging = item.fields.packagingType;
        // Qadoq turi ящиклар soniga birlashtiriladi: "2500 дер.ящик" (alohida "Вид упаковки" qatori yo'q).
        // Ящиклар soni bo'lmasa qadoq turi yo'qolmasligi uchun o'z qatorida qoladi.
        if (f.key === 'packagingType' && item.fields.boxCount) return [];
        // Ящики va поддоны: soni va umumiy vazni ikkalasi ham kiritilgan bo'lsa bitta qatorda: "2500 дер.ящик (2500 кг)", "33 шт. (430 кг)".
        // Bittasi kiritilgan bo'lsa o'z qatorida qoladi (ma'lumot yo'qolmaydi).
        const countKey = WEIGHT_MERGED_INTO[f.key];
        if (countKey && item.fields[countKey]) return [];
        const weightKey = COUNT_MERGES_WEIGHT[f.key];
        const weight = weightKey ? item.fields[weightKey] : undefined;
        const unit = f.key === 'price' ? context.currency : f.key === 'boxCount' && packaging ? packaging : ITEM_UNITS[f.key];
        const base = unit ? `${value} ${unit}` : value;
        const shown = weight ? `${base} (${weight} кг)` : base;
        return [row(ITEM_ICONS[f.key], f.label, shown)];
      });
      return [`<b>Товар ${index + 1}</b>`, ...lines].join('\n');
    });

  const title = status === 'COMPLETED' ? '✅ <b>Данные о грузе — полные</b>' : '🚛 <b>Данные о грузе</b>';
  const parts = [title];
  if (headerLines.length > 0) parts.push(headerLines.join('\n'));
  parts.push(...itemBlocks);

  // Oxirgi blok (qirqilmaydi): tovarlar jami, yetishmayotganlar, keyin to'ldirganlar
  const footerBlocks: string[] = [];
  const totals = totalsLine(data.items);
  if (totals) footerBlocks.push(totals);
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
