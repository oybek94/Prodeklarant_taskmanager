/**
 * Магнит / GrandTrade zakaz xatining tuzilishi.
 *
 * Haqiqiy xatdan olingan: 4 ustunli jadval, kataklar ichida <p><span>,
 * jadvaldan keyin uzun yo'riqnoma matni va yana ikkita begona jadval
 * (parser aynan zakaz jadvalini topishi kerak).
 */

export type GtFixtureRow = [gt: string, customsPlace: string, product: string, arrival: string];

export const ROW_773210: GtFixtureRow = [
  'GT-773210',
  'Оренбург',
  'Свежий столовый виноград Дамский палец / Fresh table Grape',
  'РЦ ГТ ПроФреш Санкт-Петербург',
];

export const ROW_773211_KIROV: GtFixtureRow = [
  'GT-773211',
  'Оренбург',
  'Свежий столовый виноград Дамский палец / Fresh table Grape',
  'РЦ Киров 10000 кг',
];

export const ROW_773211_ZELENODOLSK: GtFixtureRow = [
  'GT-773211',
  'Оренбург',
  'Свежий столовый виноград Дамский палец / Fresh table Grape',
  'РЦ Зеленодольск 10000 кг',
];

const cell = (text: string): string =>
  `<td width="85" valign="bottom"><p class="MsoNormal_mr_css_attr"><span style="font-size:9.0pt">${text}</span></p></td>`;

const row = (cells: readonly string[]): string => `<tr>${cells.map(cell).join('')}</tr>`;

export const buildGtEmailHtml = (rows: GtFixtureRow[]): string => `
<html><body>
  <p>Добрый день!</p>
  <p>Новые заказы, адреса ТО, РЦ и макет стикера во вложении.</p>
  <table border="1" cellspacing="0" cellpadding="0">
    ${row(['заказ', 'Место ТО', 'Товар для указания в заказе', 'Место прибытия'])}
    ${rows.map((r) => row(r)).join('\n    ')}
  </table>
  <p>Обращаем ваше внимание на важность своевременного предоставления информации.</p>
  <table><tr>${cell('Место ТО: Оренбург')}</tr></table>
  <table><tr>${cell('Контакты СК ниже:')}</tr></table>
</body></html>`;

/** Zakaz jadvali yo'q, oddiy yozishma. */
export const PLAIN_REPLY_HTML = `
<html><body><p>Замечаний нет.</p><table><tr>${cell('С уважением')}</tr></table></body></html>`;
