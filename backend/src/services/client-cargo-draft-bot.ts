// Yuk arizasi (qoralama) botdagi yordamchilari: /yangi javobi, callback ma'lumotini ajratish, muallifni aniqlash.
// Sof funksiyalar — node-telegram-bot-api ga bog'liq emas, alohida test qilinadi.

import { truncateButtonText } from './client-cargo-archive.service';
import { buildDraftLaunchLink, type InlineButton } from './client-cargo-draft-message';
import type { DraftActor, DraftSummary } from './client-cargo-draft.service';
import { telegramDisplayName } from './client-cargo-miniapp';

export interface NewCargoReply {
  text: string;
  keyboard: InlineButton[][];
}

/** /yangi javobi: ochiq arizalar bo'lsa davom ettirish ro'yxati, aks holda bitta "Formani ochish" tugmasi */
export function buildNewCargoReply(input: { chatId: string; miniAppLink: string; drafts: DraftSummary[] }): NewCargoReply {
  const { chatId, miniAppLink, drafts } = input;
  const newLink = buildDraftLaunchLink(miniAppLink, chatId, 'new');
  if (drafts.length === 0) {
    return { text: "📋 Yuk ma'lumotini kiritish uchun formani oching:", keyboard: [[{ text: '📝 Formani ochish', url: newLink }]] };
  }
  const rows: InlineButton[][] = drafts.map((draft) => {
    const status = draft.missingCount > 0 ? `yetishmaydi: ${draft.missingCount}` : 'tayyor, yakunlanmagan';
    return [{ text: truncateButtonText(`📝 ${draft.label} — ${status}`), url: buildDraftLaunchLink(miniAppLink, chatId, draft.id) }];
  });
  rows.push([{ text: '➕ Yangi yuk', url: newLink }]);
  return { text: "📋 Ochiq yuk arizalari bor. To'ldirishni davom ettiring yoki yangisini boshlang:", keyboard: rows };
}

export type DraftCallbackAction = 'done' | 'cancel' | 'cancel-yes' | 'cancel-no';

/** `cargo:<amal>:<arizaId>` — boshqa callback'lar (masalan arxiv) uchun null */
export function parseDraftCallback(data: string): { action: DraftCallbackAction; draftId: number } | null {
  const match = /^cargo:(done|cancel-yes|cancel-no|cancel):([1-9]\d{0,9})$/.exec(data);
  if (!match) return null;
  return { action: match[1] as DraftCallbackAction, draftId: Number(match[2]) };
}

/** Tugmani bosgan foydalanuvchi — muallif ismi Telegram yuborgan (soxtalashtirib bo'lmaydigan) ma'lumotdan */
export function actorFromTelegramUser(user: { id: number; first_name?: string; last_name?: string; username?: string }): DraftActor {
  return { tgUserId: user.id, name: telegramDisplayName(user) };
}
