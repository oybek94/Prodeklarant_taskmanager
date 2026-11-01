import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { parseGroupChatId, submitBodySchema, validateFormFields, verifyInitData } from '../services/client-cargo-miniapp';

const BOT_TOKEN = '123456:TEST-token-not-real';
const NOW = 1_800_000_000;

/** Telegram qoidasi bo'yicha imzolangan initData yasaydi */
function signInitData(fields: Record<string, string>, token = BOT_TOKEN): string {
  const dataCheckString = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

const baseFields = (over: Record<string, string> = {}) => ({
  auth_date: String(NOW - 60),
  query_id: 'AAH',
  start_param: '-1001234567890',
  user: JSON.stringify({ id: 777, first_name: 'Test' }),
  ...over,
});

describe('verifyInitData', () => {
  it("to'g'ri imzolangan initData'dan foydalanuvchi va start_param ni oladi", () => {
    expect(verifyInitData(signInitData(baseFields()), BOT_TOKEN, NOW)).toEqual({ userId: 777, startParam: '-1001234567890' });
  });
  it("boshqa token bilan imzolangan bo'lsa rad etadi", () => {
    expect(verifyInitData(signInitData(baseFields(), '999:other'), BOT_TOKEN, NOW)).toBeNull();
  });
  it("maydon o'zgartirilsa (start_param soxtalashtirilsa) rad etadi", () => {
    const signed = signInitData(baseFields());
    const tampered = signed.replace(encodeURIComponent('-1001234567890'), encodeURIComponent('-1009999999999'));
    expect(tampered).not.toBe(signed);
    expect(verifyInitData(tampered, BOT_TOKEN, NOW)).toBeNull();
  });
  it('hash yo\'q yoki noto\'g\'ri formatda bo\'lsa rad etadi', () => {
    expect(verifyInitData('auth_date=1&user=%7B%7D', BOT_TOKEN, NOW)).toBeNull();
    expect(verifyInitData('hash=zzzz&auth_date=1', BOT_TOKEN, NOW)).toBeNull();
  });
  it('24 soatdan eski yoki kelajakdagi auth_date ni rad etadi', () => {
    expect(verifyInitData(signInitData(baseFields({ auth_date: String(NOW - 25 * 3600) })), BOT_TOKEN, NOW)).toBeNull();
    expect(verifyInitData(signInitData(baseFields({ auth_date: String(NOW + 3600) })), BOT_TOKEN, NOW)).toBeNull();
  });
  it('user maydoni yaroqsiz bo\'lsa rad etadi', () => {
    expect(verifyInitData(signInitData(baseFields({ user: 'not-json' })), BOT_TOKEN, NOW)).toBeNull();
    expect(verifyInitData(signInitData(baseFields({ user: JSON.stringify({ name: 'x' }) })), BOT_TOKEN, NOW)).toBeNull();
  });
});

describe('parseGroupChatId', () => {
  it('guruh chat ID sini (manfiy butun son) qabul qiladi', () => {
    expect(parseGroupChatId('-1001234567890')).toBe('-1001234567890');
    expect(parseGroupChatId('-4912345')).toBe('-4912345');
  });
  it('boshqa qiymatlarni rad etadi', () => {
    expect(parseGroupChatId(null)).toBeNull();
    expect(parseGroupChatId('1234567')).toBeNull();
    expect(parseGroupChatId('-100abc')).toBeNull();
    expect(parseGroupChatId("-100123' OR 1=1")).toBeNull();
  });
});

describe('validateFormFields', () => {
  const parse = (body: unknown) => validateFormFields(submitBodySchema.parse(body));

  it("sarlavhadagi bo'sh maydonlarni o'tkazib yuboradi, avto nomerni normallashtiradi", () => {
    const r = parse({ vehicleNumber: ' 40232baa / 402332ba ', invoiceNumber: '', orderNumber: '  ', temperature: '+2 C' });
    expect(r).toEqual({ ok: true, header: { vehicleNumber: '40232BAA/402332BA', temperature: '+2 C' }, items: [] });
  });

  it("tovarlardagi sonlarni tekshiradi va vergulni nuqtaga o'tkazadi", () => {
    const r = parse({
      items: [{ product: 'Xurmo', boxCount: '120', boxWeight: '1234,5', palletCount: '8', palletWeight: '400', netto: '18000', brutto: '19634,5', price: '1.25' }],
    });
    expect(r).toEqual({
      ok: true,
      header: {},
      items: [{ product: 'Xurmo', boxCount: '120', boxWeight: '1234.5', palletCount: '8', palletWeight: '400', netto: '18000', brutto: '19634.5', price: '1.25' }],
    });
  });

  it("xatolar tovar indeksi bilan qaytadi (items.<indeks>.<maydon>)", () => {
    const r = parse({ items: [{ product: 'Xurmo', netto: '100' }, { boxCount: '12a', netto: "ko'p" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['items.1.boxCount', 'items.1.netto']);
  });

  it("sarlavhadagi xato maydon nomi bilan qaytadi", () => {
    // 200 belgidan uzun matn rad etiladi
    const r = parse({ invoiceNumber: 'x'.repeat(250) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(['invoiceNumber']);
  });

  it("kontrakt va jo'natish joyini mijoz matnidan olmaydi (faqat contractId/branchId orqali)", () => {
    const r = parse({ contract: 'Soxta MChJ', shipmentPlace: 'Soxta joy', invoiceNumber: '15' });
    expect(r).toEqual({ ok: true, header: { invoiceNumber: '15' }, items: [] });
  });

  it("tovarlar sonini cheklaydi", () => {
    expect(submitBodySchema.safeParse({ items: Array.from({ length: 21 }, () => ({})) }).success).toBe(false);
    expect(submitBodySchema.safeParse({ items: Array.from({ length: 20 }, () => ({})) }).success).toBe(true);
  });
});
