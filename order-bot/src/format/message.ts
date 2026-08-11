import type { OrderPosition } from '../parse/table.js';

const EMPTY = '—';
/** Telegram xabar chegarasi 4096 belgi; biroz zaxira qoldiramiz. */
const MAX_MESSAGE_LENGTH = 3900;

const value = (raw: string | null): string => (raw && raw.trim() ? raw.trim() : EMPTY);

/** "1.41000" + "EUR" -> "1.41000 EUR" */
const formatPrice = (position: OrderPosition): string => {
  const price = position.price?.trim();
  const currency = position.currency?.trim();
  if (!price) return EMPTY;
  return currency ? `${price} ${currency}` : price;
};

/** Pozitsiyaga xos maydonlar (Поставщик va № заказа dan tashqari). */
const positionLines = (position: OrderPosition): string[] => [
  `Товар: ${value(position.productRu)}`,
  `PLU: ${value(position.plu)}`,
  `Калибр: ${value(position.size)}`,
  `Цена: ${formatPrice(position)}`,
  `Склад: ${value(position.warehouse)}`,
  `Адрес склада: ${value(position.warehouseAddress)}`,
  `Дата выхода: ${value(position.etd)}`,
  `Дата прихода: ${value(position.eta)}`,
];

const headerLines = (position: OrderPosition): string[] => [
  `Поставщик: ${value(position.supplier)}`,
  `№ заказа: ${value(position.orderNumber)}`,
];

const allSame = (values: (string | null)[]): boolean =>
  values.every((v) => (v ?? '') === (values[0] ?? ''));

/**
 * Pozitsiyalarni Telegram xabari(lari)ga aylantiradi.
 *
 * Bitta pozitsiya  — tekis ro'yxat.
 * Ko'p pozitsiya   — Поставщик/№ заказа bir xil bo'lsa yuqorida bir marta,
 *                    keyin raqamlangan bloklar. Har xil bo'lsa — har blok ichida.
 */
export const formatOrderMessage = (positions: OrderPosition[]): string[] => {
  if (positions.length === 0) return [];

  const first = positions[0]!;

  if (positions.length === 1) {
    return splitByLength([...headerLines(first), ...positionLines(first)].join('\n'));
  }

  const sharedHeader =
    allSame(positions.map((p) => p.supplier)) && allSame(positions.map((p) => p.orderNumber));

  const blocks = positions.map((position, index) => {
    const lines = [`${index + 1}.`];
    if (!sharedHeader) lines.push(...headerLines(position));
    lines.push(...positionLines(position));
    return lines.join('\n');
  });

  const prefix = sharedHeader ? `${headerLines(first).join('\n')}\n` : '';
  return splitBlocks(prefix, blocks);
};

/** Bloklarni chegaradan oshmaydigan xabarlarga guruhlaydi. */
const splitBlocks = (prefix: string, blocks: string[]): string[] => {
  const messages: string[] = [];
  let current = prefix;

  for (const block of blocks) {
    const candidate = current ? `${current}\n${block}` : block;
    if (candidate.length > MAX_MESSAGE_LENGTH && current.trim()) {
      messages.push(current.trimEnd());
      current = `${prefix}${block}`;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) messages.push(current.trimEnd());
  return messages.flatMap(splitByLength);
};

/** Oxirgi chora: bitta blokning o'zi chegaradan oshsa, qator bo'yicha kesadi. */
const splitByLength = (text: string): string[] => {
  if (text.length <= MAX_MESSAGE_LENGTH) return [text];

  const chunks: string[] = [];
  let current = '';
  for (const line of text.split('\n')) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > MAX_MESSAGE_LENGTH && current) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};
