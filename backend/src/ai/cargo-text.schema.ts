// cargo-text.schema.ts
// Mijoz Telegram orqali yuboradigan erkin shablon matnidan invoys maydonlarini
// ajratib olish uchun Zod schema — bitta haqiqat manbai.
//
// OpenAI strict mode talabi: barcha maydonlar required, optionallik faqat
// `| null` orqali ifodalanadi (extraction.schemas.ts bilan bir xil uslub).

import { z } from 'zod';
import { buildResponseFormat } from './extraction.schemas';

/** Tanib bo'lmagan "Nom: qiymat" qatori — invoysga custom maydon sifatida tushadi */
export const cargoLabeledFieldSchema = z.strictObject({
  label: z.string(),
  value: z.string(),
});

export const cargoProductSchema = z.strictObject({
  /** Tovar nomi, masalan "Нектарины свежие" */
  name: z.string(),
  /** PLU kod(lar)i matn holicha, masalan "3682719 / 3639748" */
  plu_code: z.string().nullable(),
  /** Qadoq turi, masalan "Пластиковый ящик" */
  package_type: z.string().nullable(),
  /** Qadoq soni (Кол-во упаковки), masalan 3648 */
  packages_count: z.number().nullable(),
  /** Joylar soni (Мест) — "33 паллет" dagi 33 */
  places_count: z.number().nullable(),
  gross_weight: z.number().nullable(),
  net_weight: z.number().nullable(),
  unit_price: z.number().nullable(),
  /** Narx valyutasi: USD, UZS ... */
  currency: z.string().nullable(),
  /** "Квант" — qadoqdagi og'irlik koeffitsienti, har tovarda o'ziniki bo'lishi mumkin */
  kvant: z.number().nullable(),
  /** "Калибр" — o'lcham (masalan "40mm+"), har tovarda o'ziniki bo'lishi mumkin */
  calibre: z.string().nullable(),
  /** "РЦ ..." — taqsimlash markazi (masalan "РЦ Москов Север Алкоголь") */
  distribution_center: z.string().nullable(),
});

export const cargoTextExtractionSchema = z.strictObject({
  invoice_number: z.string().nullable(),
  /** Номер ТС — butun holicha, ajratilmaydi */
  vehicle_number: z.string().nullable(),
  harvest_year: z.string().nullable(),
  /** Buyurtma/partiya kodi, masalan "RVI-2026-29-31-TKGARDENS-3682719-BGR-DSC_1" */
  order_number: z.string().nullable(),
  delivery_terms: z.string().nullable(),
  /** "Таможня:" bloki — ko'p qatorli, \n bilan birlashtirilgan */
  customs_address: z.string().nullable(),
  /** "Выгрузка:" bloki — ko'p qatorli, \n bilan birlashtirilgan */
  destination: z.string().nullable(),
  /** Квант, Калибр va boshqa tanilmagan nomli qiymatlar */
  extra_fields: z.array(cargoLabeledFieldSchema),
  /** "В упаковочный лист:" bo'limidagi maydonlar */
  packing_fields: z.array(cargoLabeledFieldSchema),
  products: z.array(cargoProductSchema),
});

export type CargoLabeledField = z.infer<typeof cargoLabeledFieldSchema>;
export type CargoProduct = z.infer<typeof cargoProductSchema>;
export type CargoTextExtraction = z.infer<typeof cargoTextExtractionSchema>;

export const CARGO_TEXT_RESPONSE_FORMAT = buildResponseFormat(
  'cargo_text_extraction',
  cargoTextExtractionSchema
);
