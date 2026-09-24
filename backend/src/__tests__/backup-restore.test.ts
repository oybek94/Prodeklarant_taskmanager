import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock('../prisma', () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { BackupService, RestoreValidationError, validateRestoreData } from '../services/backup.service';

const modelNames = Prisma.dmmf.datamodel.models.map((m) => m.name);

/** Barcha modellar bo'sh massiv bo'lgan to'liq zaxira */
const fullBackup = (): Record<string, unknown[]> =>
  Object.fromEntries(modelNames.map((name) => [name, []]));

type Call = { kind: 'sql'; text: string } | { kind: 'createMany'; model: string; rows: number };

/** Tranzaksiya ichidagi chaqiruvlar ketma-ketligini yozib oladigan soxta `tx` */
function fakeTx(calls: Call[], failOnModel?: string) {
  const executeRaw = (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ kind: 'sql', text: Prisma.sql(strings, ...values).sql });
    return Promise.resolve(0);
  };
  return new Proxy({ $executeRaw: executeRaw } as Record<string, unknown>, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      return {
        createMany: async ({ data }: { data: unknown[] }) => {
          if (prop === failOnModel) throw new Error('insert failed');
          calls.push({ kind: 'createMany', model: prop, rows: data.length });
          return { count: data.length };
        },
      };
    },
  });
}

beforeEach(() => {
  mocks.transaction.mockReset();
});

describe('validateRestoreData', () => {
  it('obyekt bo\'lmagan zaxirani rad etadi', () => {
    expect(() => validateRestoreData([], modelNames)).toThrow(RestoreValidationError);
    expect(() => validateRestoreData(null, modelNames)).toThrow(RestoreValidationError);
  });

  it('yetishmayotgan jadvalni nomi bilan ko\'rsatib rad etadi', () => {
    const data = fullBackup();
    delete data[modelNames[0]];
    expect(() => validateRestoreData(data, modelNames)).toThrow(modelNames[0]);
  });
});

describe('BackupService.restoreAllData', () => {
  it('noto\'g\'ri zaxirada tranzaksiya umuman boshlanmaydi (TRUNCATE yo\'q)', async () => {
    const data = fullBackup();
    delete data[modelNames[0]];
    await expect(BackupService.restoreAllData(data)).rejects.toBeInstanceOf(RestoreValidationError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('hammasi bitta tranzaksiyada: SET LOCAL → TRUNCATE → yozish → sequence', async () => {
    const calls: Call[] = [];
    mocks.transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx(calls)));

    const data = fullBackup();
    data.User = Array.from({ length: 2500 }, (_, i) => ({ id: i + 1 }));

    const inserted = await BackupService.restoreAllData(data);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    // Uzoq tiklash uchun Prisma'ning 5s default timeout'i oshirilgan
    expect(mocks.transaction.mock.calls[0][1]).toMatchObject({ timeout: 10 * 60 * 1000 });

    expect(calls[0]).toEqual({ kind: 'sql', text: "SET LOCAL session_replication_role = 'replica'" });
    expect(calls[1].kind === 'sql' && calls[1].text).toMatch(/^TRUNCATE TABLE "[^"]+"(, "[^"]+")* CASCADE$/);
    // Bitta TRUNCATE barcha jadvallarni qamraydi
    expect(calls.filter((c) => c.kind === 'sql' && c.text.startsWith('TRUNCATE'))).toHaveLength(1);

    // 2500 qator 1000 talik bo'laklarda yoziladi
    const userInserts = calls.filter((c) => c.kind === 'createMany' && c.model === 'user');
    expect(userInserts.map((c) => c.kind === 'createMany' && c.rows)).toEqual([1000, 1000, 500]);
    expect(inserted.User).toBe(2500);

    // Sequence'lar yozishdan KEYIN tiklanadi
    const lastInsert = calls.map((c) => c.kind).lastIndexOf('createMany');
    const setvals = calls.map((c, i) => ({ c, i })).filter(({ c }) => c.kind === 'sql' && c.text.includes('setval'));
    expect(setvals.length).toBeGreaterThan(0);
    expect(setvals.every(({ i }) => i > lastInsert)).toBe(true);
  });

  it('yozish yiqilsa xato tashqariga chiqadi (tranzaksiya rollback qiladi)', async () => {
    const calls: Call[] = [];
    mocks.transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx(calls, 'user')));
    const data = fullBackup();
    data.User = [{ id: 1 }];
    await expect(BackupService.restoreAllData(data)).rejects.toThrow('insert failed');
  });
});
