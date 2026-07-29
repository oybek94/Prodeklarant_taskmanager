import { describe, it, expect } from 'vitest';
import http from 'http';
import { attachmentDisposition } from '../utils/content-disposition';

/** Haqiqiy Node header validatsiyasi (ERR_INVALID_CHAR shu yerdan chiqadi) */
const setRealHeader = (value: string) => {
  const res = new http.ServerResponse(new http.IncomingMessage(null as never));
  res.setHeader('Content-Disposition', value);
};

describe('Content-Disposition — ildiz sabab reproduksiyasi', () => {
  const fileName = 'FSS_Фаргона тумани-2024.xlsx';

  it('eski format (xom fayl nomi) Node tomonidan rad etiladi', () => {
    expect(() => setRealHeader(`attachment; filename="${fileName}"`)).toThrow(/ERR_INVALID_CHAR|Invalid character/);
  });

  it('yangi format Node tomonidan qabul qilinadi', () => {
    expect(() => setRealHeader(attachmentDisposition(fileName))).not.toThrow();
  });
});

/** Node header qiymatiga faqat latin1 (ASCII) belgilarga ruxsat beradi */
const isHeaderSafe = (value: string) => /^[\x20-\x7e]*$/.test(value);

describe('attachmentDisposition', () => {
  it('kirill fayl nomi uchun header-xavfsiz qiymat qaytaradi', () => {
    const header = attachmentDisposition('FSS_Фаргона-2024.xlsx');
    expect(isHeaderSafe(header)).toBe(true);
    expect(header).toContain("filename*=UTF-8''");
  });

  it("o'zbek va maxsus belgilarni ham xavfsiz kodlaydi", () => {
    const header = attachmentDisposition("Invoice_O'zbekiston №12/24.xlsx");
    expect(isHeaderSafe(header)).toBe(true);
  });

  it('sof ASCII nomni asl holida saqlaydi', () => {
    const header = attachmentDisposition('ST1_1024.xlsx');
    expect(header).toContain('filename="ST1_1024.xlsx"');
    expect(isHeaderSafe(header)).toBe(true);
  });

  it('qo\'shtirnoq va yangi qatorni header injection uchun tozalaydi', () => {
    const header = attachmentDisposition('bad"name\r\nX-Evil: 1.xlsx');
    expect(isHeaderSafe(header)).toBe(true);
    expect(header).not.toContain('X-Evil: 1"');
  });
});
