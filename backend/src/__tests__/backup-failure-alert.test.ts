import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const state = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  sendDocument: vi.fn(),
  branchFindMany: vi.fn(),
}));

vi.mock('node-telegram-bot-api', () => {
  class FakeBot {
    sendMessage = state.sendMessage;
    sendDocument = state.sendDocument;
  }
  return { default: FakeBot };
});

// Faqat Branch o'qiladi — qolgan modellar delegatsiz, eksport ularni o'tkazib yuboradi
vi.mock('../prisma', () => ({
  prisma: { branch: { findMany: state.branchFindMany } },
}));

import { BackupService, formatBackupFailureMessage } from '../services/backup.service';

const CHAT_ID = '-1009998887776';

beforeEach(() => {
  state.sendMessage.mockReset();
  state.sendMessage.mockResolvedValue({});
  state.branchFindMany.mockReset();
  process.env.BACKUP_TELEGRAM_BOT_TOKEN = `test-${Math.random().toString(36).slice(2)}`;
  process.env.BACKUP_TELEGRAM_CHAT_ID = CHAT_ID;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('formatBackupFailureMessage', () => {
  it('xato matnini va vaqtni o\'z ichiga oladi', () => {
    const text = formatBackupFailureMessage(new Error('Do not know how to serialize a BigInt'), new Date('2026-11-12T22:00:00Z'));
    expect(text).toContain('ZAXIRA YARATILMADI');
    expect(text).toContain('Do not know how to serialize a BigInt');
    expect(text).toContain('2026');
  });

  it('juda uzun xato matnini qisqartiradi', () => {
    const text = formatBackupFailureMessage(new Error('x'.repeat(5000)), new Date());
    expect(text.length).toBeLessThan(1000);
  });
});

describe('BackupService.runScheduledBackup', () => {
  it('zaxira yiqilsa Telegram zaxira guruhiga ogohlantirish yuboradi', async () => {
    vi.spyOn(BackupService, 'createBackupArchive').mockRejectedValue(new Error('disk to\'la'));

    await BackupService.runScheduledBackup();

    expect(state.sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text] = state.sendMessage.mock.calls[0];
    expect(chatId).toBe(CHAT_ID);
    expect(text).toContain('disk to\'la');
  });

  it('zaxira muvaffaqiyatli bo\'lsa ogohlantirish yubormaydi', async () => {
    vi.spyOn(BackupService, 'createBackupArchive').mockResolvedValue('/tmp/db-backup.zip');

    await BackupService.runScheduledBackup();

    expect(state.sendMessage).not.toHaveBeenCalled();
  });

  it('ogohlantirishni yuborib bo\'lmasa ham xato tashlamaydi (cron yiqilmaydi)', async () => {
    vi.spyOn(BackupService, 'createBackupArchive').mockRejectedValue(new Error('xato'));
    state.sendMessage.mockRejectedValue(new Error('telegram ishlamayapti'));

    await expect(BackupService.runScheduledBackup()).resolves.toBeUndefined();
  });
});

describe('BackupService.exportAllData', () => {
  it('birorta jadval o\'qilmasa to\'liqsiz zaxira qaytarmaydi — jadval nomi bilan xato beradi', async () => {
    state.branchFindMany.mockRejectedValue(new Error('connection lost'));

    await expect(BackupService.exportAllData()).rejects.toThrow(/Branch/);
  });

  it('jadvallar o\'qilsa ma\'lumotni qaytaradi', async () => {
    state.branchFindMany.mockResolvedValue([{ id: 1, name: 'Toshkent' }]);

    expect((await BackupService.exportAllData()).Branch).toEqual([{ id: 1, name: 'Toshkent' }]);
  });
});
