import { describe, it, expect } from 'vitest';
import path from 'path';
import { resolveServableUploadPath } from '../utils/upload-path';

const root = path.resolve('/srv/app/uploads');

describe('resolveServableUploadPath', () => {
  it('uploads ichidagi oddiy faylning absolyut yo\'lini qaytaradi', () => {
    expect(resolveServableUploadPath(root, 'documents/a.pdf')).toBe(path.join(root, 'documents', 'a.pdf'));
    expect(resolveServableUploadPath(root, '/documents/a.pdf')).toBe(path.join(root, 'documents', 'a.pdf'));
  });

  it('uploads tashqarisiga chiqishni rad etadi', () => {
    expect(resolveServableUploadPath(root, '../.env')).toBeNull();
    expect(resolveServableUploadPath(root, 'documents/../../.env')).toBeNull();
  });

  it('bo\'sh yo\'l yoki ildizning o\'zini rad etadi', () => {
    expect(resolveServableUploadPath(root, '')).toBeNull();
    expect(resolveServableUploadPath(root, '.')).toBeNull();
  });

  it.each([
    'backups/db-backup-2026-11-11T22-00-00-012Z.zip',
    'Backups/db.zip',
    './backups/db.zip',
    '/backups/db.zip',
    '//backups/db.zip',
    'documents/../backups/db.zip',
    'backups',
  ])('DB zaxira papkasini hech kimga bermaydi: %s', (relativePath) => {
    expect(resolveServableUploadPath(root, relativePath)).toBeNull();
  });

  it('nomi o\'xshash oddiy fayllarni to\'smaydi', () => {
    expect(resolveServableUploadPath(root, 'documents/backups-2026.pdf')).toBe(
      path.join(root, 'documents', 'backups-2026.pdf')
    );
  });
});
