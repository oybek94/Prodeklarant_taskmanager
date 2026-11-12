import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { blockPrivateUploads, serveSecureUpload } from '../middleware/secure-uploads';

let server: Server;
let baseUrl: string;
let uploadsRoot: string;

beforeAll(async () => {
  uploadsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-uploads-'));
  fs.mkdirSync(path.join(uploadsRoot, 'documents'));
  fs.mkdirSync(path.join(uploadsRoot, 'backups'));
  fs.writeFileSync(path.join(uploadsRoot, 'documents', 'a.txt'), 'hujjat');
  fs.writeFileSync(path.join(uploadsRoot, 'backups', 'db-backup.zip'), 'butun baza');

  // server.ts dagi ulanish bilan bir xil (auth'siz — bu yerda faqat yo'l himoyasi tekshiriladi)
  const app = express();
  app.use('/uploads', blockPrivateUploads(uploadsRoot), express.static(uploadsRoot));
  app.get('/api/secure-uploads/*path', serveSecureUpload(uploadsRoot));
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  fs.rmSync(uploadsRoot, { recursive: true, force: true });
});

describe('/api/secure-uploads', () => {
  it('oddiy hujjatni beradi', async () => {
    const res = await fetch(`${baseUrl}/api/secure-uploads/documents/a.txt`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('hujjat');
  });

  it('DB zaxira faylini bermaydi', async () => {
    expect((await fetch(`${baseUrl}/api/secure-uploads/backups/db-backup.zip`)).status).toBe(403);
  });

  it('kodlangan yo\'l bilan ham zaxira papkasiga kirib bo\'lmaydi', async () => {
    expect((await fetch(`${baseUrl}/api/secure-uploads/documents%2F..%2Fbackups%2Fdb-backup.zip`)).status).toBe(403);
    expect((await fetch(`${baseUrl}/api/secure-uploads/%2562ackups/db-backup.zip`)).status).toBe(403);
  });

  it('mavjud bo\'lmagan fayl uchun 404', async () => {
    expect((await fetch(`${baseUrl}/api/secure-uploads/documents/yoq.txt`)).status).toBe(404);
  });

  it('buzuq kodlangan yo\'l 500 emas, 400 qaytaradi', async () => {
    expect((await fetch(`${baseUrl}/api/secure-uploads/documents/%25E0%25A4%25A`)).status).toBe(400);
  });
});

describe('/uploads statik', () => {
  it('oddiy hujjatni beradi', async () => {
    expect((await fetch(`${baseUrl}/uploads/documents/a.txt`)).status).toBe(200);
  });

  it.each(['/uploads/backups/db-backup.zip', '/uploads//backups/db-backup.zip', '/uploads/%62ackups/db-backup.zip'])(
    'DB zaxira faylini bermaydi: %s',
    async (url) => {
      expect((await fetch(`${baseUrl}${url}`)).status).toBe(403);
    }
  );
});
