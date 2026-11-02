import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => ({ archiveFindMany: vi.fn(), taskDocFindMany: vi.fn() }));

vi.mock('../prisma', () => ({
  prisma: { archiveDocument: { findMany: m.archiveFindMany }, taskDocument: { findMany: m.taskDocFindMany } },
}));

import { loadTaskFiles } from '../services/client-cargo-archive.service';

const item = { taskId: 7, invoiceNumber: 'INV-1', vehicleNumber: '01A123BC' };
// Diskda yo'q fayllar: tanlash mantiqini tekshirish uchun yetarli (hammasi "skipped" bo'ladi)
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Hujjat ${i + 1}`, fileUrl: `/uploads/documents/yoq-${i + 1}.pdf` }));

beforeEach(() => vi.clearAllMocks());

describe('loadTaskFiles — haydovchi (preferTaskDocuments)', () => {
  it("yukning BARCHA hujjatlarini oladi: turi bo'yicha filtr yo'q, arxiv so'ralmaydi", async () => {
    m.taskDocFindMany.mockResolvedValue(rows(9));
    const result = await loadTaskFiles(item, { preferTaskDocuments: true });
    expect(result.documentCount).toBe(9);
    expect(m.taskDocFindMany.mock.calls[0][0].where).toEqual({ taskId: 7 });
    expect(m.archiveFindMany).not.toHaveBeenCalled();
  });

  it("TaskDocument bo'sh bo'lsa arxivdan oladi", async () => {
    m.taskDocFindMany.mockResolvedValue([]);
    m.archiveFindMany.mockResolvedValue(rows(2));
    expect((await loadTaskFiles(item, { preferTaskDocuments: true })).documentCount).toBe(2);
  });
});

describe('loadTaskFiles — arxiv (odatiy)', () => {
  it("avval arxivdan, u bo'sh bo'lsa TaskDocument'dan oladi", async () => {
    m.archiveFindMany.mockResolvedValue(rows(3));
    expect((await loadTaskFiles(item)).documentCount).toBe(3);
    expect(m.taskDocFindMany).not.toHaveBeenCalled();

    m.archiveFindMany.mockResolvedValue([]);
    m.taskDocFindMany.mockResolvedValue(rows(4));
    expect((await loadTaskFiles(item)).documentCount).toBe(4);
  });
});
