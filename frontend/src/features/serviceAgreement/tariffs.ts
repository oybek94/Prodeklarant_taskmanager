import type { TariffRow } from './types';

/** Tarif jadvalidagi asosiy (BYuD) qatorining nomi va o'lchov birligi */
export const MAIN_TARIFF_ROW = { name: 'Электрон БЮД расмийлаштириш', unit: '1 БЮД' } as const;

/**
 * BYuD tarifi shartnomada IKKI joyda chiqadi: 4.2-band matnida
 * (`mainTariffBhm`) va tarif jadvalining birinchi qatorida (`tariffs[0].bhm`).
 * Ular ajralib qolsa, hujjatda bir-biriga zid ikkita narx paydo bo'ladi —
 * shuning uchun qiymat faqat shu funksiya orqali o'zgartiriladi.
 */
export function withMainTariff(tariffs: TariffRow[], bhmText: string): TariffRow[] {
  const bhm = Number(bhmText);
  const value = Number.isFinite(bhm) ? bhm : 0;
  const [first, ...rest] = tariffs;
  return first ? [{ ...first, bhm: value }, ...rest] : [{ ...MAIN_TARIFF_ROW, bhm: value }];
}
