import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import { composeEmail } from '../services/mail-footer';

describe('composeEmail', () => {
  it('HTML ichida kontaktlar bo\'ladi', () => {
    const { html } = composeEmail('Salom');
    expect(html).toContain('+998 91-118-70-07');
    expect(html).toContain('https://wa.me/998911187007');
    expect(html).toContain('https://t.me/oybek94');
    expect(html).toContain('https://prodeklarant.uz');
  });

  it('logo takrorlagan nom va shiorni HTML matnida qaytarmaydi', () => {
    const { html } = composeEmail('Salom');
    expect(html).not.toContain('Ваш надежный представитель на таможне.');
    // "PRODEKLARANT" faqat logo alt matnida bo'lishi mumkin, ko'rinadigan
    // matn sifatida emas.
    expect(html).not.toMatch(/>\s*PRODEKLARANT\s*</);
  });

  it('foydalanuvchi matnini HTML\'ga qochiradi', () => {
    const { html } = composeEmail('5 < 10 & "narx"');
    expect(html).toContain('5 &lt; 10 &amp; &quot;narx&quot;');
    expect(html).not.toContain('5 < 10 &');
  });

  it('qator uzilishlarini <br> ga aylantiradi', () => {
    const { html } = composeEmail('birinchi\nikkinchi');
    expect(html).toContain('birinchi<br>ikkinchi');
  });

  it('plain-text nusxasida HTML teglari yo\'q, kontaktlar bor', () => {
    const { text } = composeEmail('Salom');
    expect(text).toContain('Salom');
    expect(text).toContain('+998 91-118-70-07');
    expect(text).toContain('https://prodeklarant.uz');
    expect(text).not.toMatch(/<[a-z]/i);
  });

  it('logo mavjud bo\'lsa CID attachment qaytaradi', () => {
    const { attachments, html } = composeEmail('Salom');
    expect(attachments).toHaveLength(1);
    expect(attachments[0].cid).toBe('prodeklarant-logo');
    expect(attachments[0].content.length).toBeGreaterThan(0);
    expect(html).toContain('cid:prodeklarant-logo');
  });

  it('logo topilmasa ham xat yasaladi, attachments bo\'sh bo\'ladi', () => {
    const spy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT');
    });
    try {
      const { html, attachments } = composeEmail('Salom');
      expect(attachments).toHaveLength(0);
      expect(html).toContain('PRODEKLARANT');
      expect(html).not.toContain('cid:prodeklarant-logo');
    } finally {
      spy.mockRestore();
    }
  });

  it('bo\'sh matn bilan ham ishlaydi', () => {
    const { html, text } = composeEmail('');
    expect(html).toContain('PRODEKLARANT');
    expect(text).toContain('PRODEKLARANT');
  });
});
