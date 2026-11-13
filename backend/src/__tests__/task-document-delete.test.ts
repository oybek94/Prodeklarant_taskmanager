import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TaskDoc = { id: number; taskId: number; fileUrl: string; uploadedById: number; createdAt: Date };
type ArchiveDoc = { id: number; taskId: number; fileUrl: string; uploadedById: number; archivedAt: Date };
type TaskRow = { id: number; status: string; createdById: number; stages: { status: string }[]; transactions: number };

const m = vi.hoisted(() => ({
  tasks: new Map<number, TaskRow>(),
  taskDocs: new Map<number, TaskDoc>(),
  archiveDocs: new Map<number, ArchiveDoc>(),
  deletedChildren: [] as string[],
}));

vi.mock('../prisma', () => {
  const taskDocument = {
    findUnique: vi.fn(async ({ where }: { where: { id: number } }) => m.taskDocs.get(where.id) ?? null),
    delete: vi.fn(async ({ where }: { where: { id: number } }) => { m.taskDocs.delete(where.id); }),
    count: vi.fn(async ({ where }: { where: { fileUrl: string } }) =>
      [...m.taskDocs.values()].filter((d) => d.fileUrl === where.fileUrl).length),
  };
  const archiveDocument = {
    findUnique: vi.fn(async ({ where }: { where: { id: number } }) => m.archiveDocs.get(where.id) ?? null),
    delete: vi.fn(async ({ where }: { where: { id: number } }) => { m.archiveDocs.delete(where.id); }),
    count: vi.fn(async ({ where }: { where: { fileUrl: string } }) =>
      [...m.archiveDocs.values()].filter((d) => d.fileUrl === where.fileUrl).length),
  };
  const child = (name: string) => ({ deleteMany: vi.fn(async () => { m.deletedChildren.push(name); }) });
  const task = {
    findUnique: vi.fn(async ({ where }: { where: { id: number } }) => {
      const row = m.tasks.get(where.id);
      if (!row) return null;
      return {
        status: row.status,
        createdById: row.createdById,
        stages: row.stages,
        documents: [...m.taskDocs.values()].filter((d) => d.taskId === row.id).map((d) => ({ fileUrl: d.fileUrl })),
        _count: { transactions: row.transactions },
      };
    }),
    delete: vi.fn(async ({ where }: { where: { id: number } }) => {
      m.tasks.delete(where.id);
      // bazadagi ON DELETE CASCADE
      for (const [docId, doc] of m.taskDocs) if (doc.taskId === where.id) m.taskDocs.delete(docId);
    }),
  };
  const client = {
    task, taskDocument, archiveDocument,
    taskError: child('taskError'), taskStage: child('taskStage'), kpiLog: child('kpiLog'),
    transaction: child('transaction'),
  };
  return { prisma: { ...client, $transaction: async (fn: (tx: typeof client) => Promise<void>) => fn(client) } };
});

import { deleteDocument, DocumentDeleteError } from '../services/document-delete.service';
import { deleteTask, TaskDeleteError } from '../services/task-delete.service';
import { removeUnreferencedUploads, resolveUploadFilePath } from '../services/uploaded-file-cleanup';

const ADMIN = { id: 1, role: 'ADMIN' };
const WORKER = { id: 7, role: 'DEKLARANT' };
const NOW = new Date('2026-11-13T10:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000);

let uploadsRoot: string;
const touch = (name: string) => {
  const file = path.join(uploadsRoot, 'documents', name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'x');
  return file;
};

beforeEach(() => {
  m.tasks.clear();
  m.taskDocs.clear();
  m.archiveDocs.clear();
  m.deletedChildren.length = 0;
  uploadsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-'));
});
afterEach(() => fs.rmSync(uploadsRoot, { recursive: true, force: true }));

describe('deleteDocument', () => {
  it('vazifa hujjati topilmasa shu ID li arxiv hujjatiga TEGMAYDI', async () => {
    m.archiveDocs.set(5, { id: 5, taskId: 90, fileUrl: '/uploads/documents/a.pdf', uploadedById: 7, archivedAt: NOW });
    await expect(deleteDocument(5, ADMIN, 'task', NOW)).rejects.toMatchObject({ status: 404 });
    expect(m.archiveDocs.has(5)).toBe(true);
  });

  it('bir xil ID: standart holatda faqat vazifa hujjati o\'chadi', async () => {
    m.taskDocs.set(5, { id: 5, taskId: 10, fileUrl: '/uploads/documents/t.pdf', uploadedById: 7, createdAt: NOW });
    m.archiveDocs.set(5, { id: 5, taskId: 90, fileUrl: '/uploads/documents/a.pdf', uploadedById: 7, archivedAt: NOW });
    await expect(deleteDocument(5, ADMIN, 'task', NOW)).resolves.toEqual({ taskId: 10 });
    expect(m.taskDocs.has(5)).toBe(false);
    expect(m.archiveDocs.has(5)).toBe(true);
  });

  it('arxiv hujjati faqat source=archive bilan o\'chadi', async () => {
    m.archiveDocs.set(5, { id: 5, taskId: 90, fileUrl: '/uploads/documents/a.pdf', uploadedById: 7, archivedAt: NOW });
    await expect(deleteDocument(5, ADMIN, 'archive', NOW)).resolves.toEqual({ taskId: 90 });
    expect(m.archiveDocs.has(5)).toBe(false);
  });

  it('boshqa xodimning hujjati — 403, o\'ziniki 2 kundan keyin — 403', async () => {
    m.taskDocs.set(1, { id: 1, taskId: 10, fileUrl: '/uploads/documents/1.pdf', uploadedById: 99, createdAt: NOW });
    m.taskDocs.set(2, { id: 2, taskId: 10, fileUrl: '/uploads/documents/2.pdf', uploadedById: 7, createdAt: hoursAgo(49) });
    m.taskDocs.set(3, { id: 3, taskId: 10, fileUrl: '/uploads/documents/3.pdf', uploadedById: 7, createdAt: hoursAgo(47) });
    await expect(deleteDocument(1, WORKER, 'task', NOW)).rejects.toBeInstanceOf(DocumentDeleteError);
    await expect(deleteDocument(2, WORKER, 'task', NOW)).rejects.toMatchObject({ status: 403 });
    await expect(deleteDocument(3, WORKER, 'task', NOW)).resolves.toEqual({ taskId: 10 });
    expect([...m.taskDocs.keys()]).toEqual([1, 2]);
  });
});

describe('deleteTask', () => {
  const unstarted = (over: Partial<TaskRow> = {}): TaskRow => ({
    id: 10, status: 'BOSHLANMAGAN', createdById: 7, stages: [{ status: 'BOSHLANMAGAN' }], transactions: 0, ...over,
  });

  it('tranzaksiya bog\'langan vazifa o\'chirilmaydi va hech narsa o\'zgarmaydi', async () => {
    m.tasks.set(10, unstarted({ transactions: 2 }));
    await expect(deleteTask(10, ADMIN)).rejects.toMatchObject({ status: 400 });
    expect(m.tasks.has(10)).toBe(true);
    expect(m.deletedChildren).toEqual([]);
  });

  it('tranzaksiyalarni hech qachon o\'chirmaydi', async () => {
    m.tasks.set(10, unstarted());
    await deleteTask(10, ADMIN);
    expect(m.tasks.has(10)).toBe(false);
    expect(m.deletedChildren).toEqual(['taskError', 'taskStage', 'kpiLog']);
  });

  it('ruxsat va holat tekshiruvlari saqlangan', async () => {
    m.tasks.set(10, unstarted({ createdById: 99 }));
    await expect(deleteTask(10, WORKER)).rejects.toMatchObject({ status: 403 });
    m.tasks.set(11, unstarted({ id: 11, status: 'JARAYONDA' }));
    await expect(deleteTask(11, ADMIN)).rejects.toMatchObject({ status: 400 });
    m.tasks.set(12, unstarted({ id: 12, stages: [{ status: 'TAYYOR' }] }));
    await expect(deleteTask(12, ADMIN)).rejects.toBeInstanceOf(TaskDeleteError);
    await expect(deleteTask(404, ADMIN)).rejects.toMatchObject({ status: 404 });
  });
});

describe('removeUnreferencedUploads', () => {
  it('hech kim ishora qilmagan faylni o\'chiradi, ishora qilinganini qoldiradi', async () => {
    const orphan = touch('orphan.pdf');
    const shared = touch('shared.pdf');
    m.archiveDocs.set(1, { id: 1, taskId: 9, fileUrl: '/uploads/documents/shared.pdf', uploadedById: 1, archivedAt: NOW });
    await removeUnreferencedUploads(['/uploads/documents/orphan.pdf', '/uploads/documents/shared.pdf'], uploadsRoot);
    expect(fs.existsSync(orphan)).toBe(false);
    expect(fs.existsSync(shared)).toBe(true);
  });

  it('yo\'q fayl va uploads\'dan tashqari yo\'l xato bermaydi, tashqaridagi faylga tegmaydi', async () => {
    const outside = path.join(uploadsRoot, '..', `outside-${path.basename(uploadsRoot)}.txt`);
    fs.writeFileSync(outside, 'x');
    try {
      await removeUnreferencedUploads(
        ['/uploads/documents/yoq.pdf', `/uploads/../${path.basename(outside)}`, path.basename(outside), '/etc/passwd'],
        uploadsRoot,
      );
      expect(fs.existsSync(outside)).toBe(true);
    } finally {
      fs.rmSync(outside, { force: true });
    }
  });

  it('resolveUploadFilePath: faqat /uploads/ ichidagi yo\'l, zaxira papkasi yopiq', () => {
    expect(resolveUploadFilePath('/uploads/documents/a.pdf', uploadsRoot)).toBe(path.join(uploadsRoot, 'documents', 'a.pdf'));
    expect(resolveUploadFilePath('/uploads/../secret', uploadsRoot)).toBeNull();
    expect(resolveUploadFilePath('/uploads/backups/db.zip', uploadsRoot)).toBeNull();
    expect(resolveUploadFilePath('documents/a.pdf', uploadsRoot)).toBeNull();
  });
});
