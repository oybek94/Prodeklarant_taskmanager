import type { PricingMode, TariffRow } from './types';

/** Tarif jadvalidagi asosiy (BYuD) qatorining nomi va o'lchov birligi */
export const MAIN_TARIFF_ROW = { name: 'Электрон БЮД расмийлаштириш', unit: '1 БЮД' } as const;

/**
 * BYuD tarifi shartnomada IKKI joyda chiqadi: 4.2-band matnida
 * (`mainTariffBhm` / `mainTariffUzs`) va tarif jadvalining birinchi qatorida
 * (`tariffs[0]`). Ular ajralib qolsa, hujjatda bir-biriga zid ikkita narx
 * paydo bo'ladi — shuning uchun qiymat faqat shu funksiya orqali
 * o'zgartiriladi.
 *
 * `mode` qaysi ustunga yozishni hal qiladi: `BHM` — koeffitsient (`bhm`),
 * `FIXED` — so'mdagi qat'iy narx (`uzs`). Ikkinchi ustunga tegilmaydi, shuning
 * uchun rejim almashtirilib qaytarilganda eski qiymat joyida turadi.
 */
export function withMainTariff(
  tariffs: TariffRow[],
  valueText: string,
  mode: PricingMode = 'BHM',
): TariffRow[] {
  const parsed = Number(valueText);
  const value = Number.isFinite(parsed) ? parsed : 0;
  const [first, ...rest] = tariffs;
  const base = first ?? { ...MAIN_TARIFF_ROW, bhm: 0 };
  const updated = mode === 'FIXED' ? { ...base, uzs: value } : { ...base, bhm: value };
  return [updated, ...rest];
}
