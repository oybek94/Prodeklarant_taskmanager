import { describe, it, expect } from 'vitest';
import express from 'express';
import multer from 'multer';
import http from 'http';
import type { AddressInfo } from 'net';
import { isActiveContentFile, normalizedExtension, uploadRejectedError, ACTIVE_CONTENT_REJECT_MESSAGE } from '../utils/upload-guard';

describe('isActiveContentFile', () => {
  it.each([
    ['hujjat.html', 'text/html'],
    ['hujjat.HTM', 'application/octet-stream'],
    ['rasm.svg', 'image/svg+xml'],
    ['invoice.pdf.html', 'application/pdf'], // mime soxta, kengaytma HTML
    ['a.html.', 'application/pdf'], // oxiridagi nuqta
    ['a.svg ', 'image/png'], // oxiridagi bo'shliq
    ['script.js', 'text/plain'],
    ['nomsiz', 'text/html; charset=utf-8'], // kengaytma yo'q, mime HTML
  ])('%s (%s) bloklanadi', (name, mime) => {
    expect(isActiveContentFile(name, mime)).toBe(true);
  });

  it.each([
    ['Invoice №12.pdf', 'application/pdf'],
    ['ST-1.jpg', 'image/jpeg'],
    ['Упаковочный лист.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['shartnoma.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['deklaratsiya.xml', 'application/xml'],
    ['arxiv.zip', 'application/zip'],
    ['html-haqida.pdf', 'application/pdf'],
  ])('%s (%s) o\'tadi', (name, mime) => {
    expect(isActiveContentFile(name, mime)).toBe(false);
  });

  it('normalizedExtension', () => {
    expect(normalizedExtension('A.HTML. ')).toBe('.html');
    expect(normalizedExtension('fayl')).toBe('');
  });
});

describe('multer + global handler: rad etilgan fayl 400 qaytaradi', () => {
  it('HTML yuklash 400 va tushunarli xabar, PDF 200', async () => {
    const upload = multer({
      storage: multer.memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (isActiveContentFile(file.originalname, file.mimetype)) {
          return cb(uploadRejectedError(ACTIVE_CONTENT_REJECT_MESSAGE));
        }
        cb(null, true);
      },
    });
    const app = express();
    app.post('/u', upload.array('files'), (_req, res) => { res.json({ ok: true }); });
    app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status ?? 500).json({ error: err.message });
    });

    const server = http.createServer(app).listen(0);
    const { port } = server.address() as AddressInfo;
    const send = async (name: string, type: string) => {
      const form = new FormData();
      form.append('files', new Blob(['<script>alert(1)</script>'], { type }), name);
      const r = await fetch(`http://127.0.0.1:${port}/u`, { method: 'POST', body: form });
      return { status: r.status, body: (await r.json()) as { error?: string } };
    };
    try {
      const bad = await send('x.html', 'application/pdf');
      expect(bad.status).toBe(400);
      expect(bad.body.error).toBe(ACTIVE_CONTENT_REJECT_MESSAGE);
      const good = await send('x.pdf', 'application/pdf');
      expect(good.status).toBe(200);
    } finally {
      server.close();
    }
  });
});
