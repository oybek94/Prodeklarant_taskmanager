import { describe, it, expect } from 'vitest';
import { actorFromTelegramUser, buildNewCargoReply, parseDraftCallback } from '../services/client-cargo-draft-bot';

const LINK = 'https://t.me/pd_client_bot/cargo';

describe('buildNewCargoReply', () => {
  it("ochiq ariza yo'q: bitta 'Formani ochish' tugmasi (yangi ariza)", () => {
    const reply = buildNewCargoReply({ chatId: '-1001234567890', miniAppLink: LINK, drafts: [] });
    expect(reply.text).toContain('formani oching');
    expect(reply.keyboard).toEqual([[{ text: '📝 Formani ochish', url: `${LINK}?startapp=-1001234567890_new` }]]);
  });

  it("ochiq arizalar bor: har biri uchun davom ettirish tugmasi va oxirida 'Yangi yuk'", () => {
    const reply = buildNewCargoReply({
      chatId: '-1001234567890',
      miniAppLink: LINK,
      drafts: [
        { id: 7, label: 'INV-9 | 01A123BC', missingCount: 3, updatedAt: '2026-11-01T10:00:00.000Z' },
        { id: 8, label: '— | —', missingCount: 0, updatedAt: '2026-11-01T09:00:00.000Z' },
      ],
    });
    expect(reply.text).toContain('Ochiq');
    expect(reply.keyboard).toEqual([
      [{ text: "📝 INV-9 | 01A123BC — yetishmaydi: 3", url: `${LINK}?startapp=-1001234567890_7` }],
      [{ text: '📝 — | — — tayyor, yakunlanmagan', url: `${LINK}?startapp=-1001234567890_8` }],
      [{ text: '➕ Yangi yuk', url: `${LINK}?startapp=-1001234567890_new` }],
    ]);
  });

  it("uzun yorliq tugma matnida qisqartiriladi (60 belgigacha)", () => {
    const reply = buildNewCargoReply({
      chatId: '-100123',
      miniAppLink: LINK,
      drafts: [{ id: 1, label: 'X'.repeat(100), missingCount: 1, updatedAt: '2026-11-01T10:00:00.000Z' }],
    });
    const button = reply.keyboard[0][0];
    expect(button.text.length).toBeLessThanOrEqual(60);
  });
});

describe('parseDraftCallback', () => {
  it("done/cancel/cancel-yes/cancel-no ni va ariza raqamini ajratadi", () => {
    expect(parseDraftCallback('cargo:done:7')).toEqual({ action: 'done', draftId: 7 });
    expect(parseDraftCallback('cargo:cancel:12')).toEqual({ action: 'cancel', draftId: 12 });
    expect(parseDraftCallback('cargo:cancel-yes:12')).toEqual({ action: 'cancel-yes', draftId: 12 });
    expect(parseDraftCallback('cargo:cancel-no:12')).toEqual({ action: 'cancel-no', draftId: 12 });
  });
  it("boshqa va noto'g'ri ma'lumotlarda null (arxiv callback'lari ham)", () => {
    for (const bad of ['arx:p:1', 'arx:t:5', 'cargo:done:abc', 'cargo:done:', 'cargo:other:1', 'cargo:done:0', 'cargo:done:7:8', '']) {
      expect(parseDraftCallback(bad)).toBeNull();
    }
  });
});

describe('actorFromTelegramUser', () => {
  it("ism: first+last, bo'lmasa @username, bo'lmasa ID", () => {
    expect(actorFromTelegramUser({ id: 5, first_name: 'Aziz', last_name: 'K' })).toEqual({ tgUserId: 5, name: 'Aziz K' });
    expect(actorFromTelegramUser({ id: 5, first_name: '', username: 'aziz' })).toEqual({ tgUserId: 5, name: '@aziz' });
    expect(actorFromTelegramUser({ id: 5, first_name: '' })).toEqual({ tgUserId: 5, name: 'ID 5' });
  });
});
