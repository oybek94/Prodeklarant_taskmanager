import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import {
  GENERIC_ERROR_MESSAGE,
  isInternalErrorMessage,
  sanitizeErrorBody,
  sanitizeErrorResponses,
} from '../middleware/sanitize-errors';

describe('isInternalErrorMessage — ichki tafsilotlar aniqlanadi', () => {
  it.each([
    ['Prisma invocation', '\nInvalid `prisma.task.findMany()` invocation in\n/var/www/app/backend/dist/routes/tasks.js:120:30'],
    ['Prisma kodi', 'Unique constraint failed P2002'],
    ['stack', 'Error: boom\n    at handler (/app/dist/x.js:1:2)'],
    ['tarmoq', 'connect ECONNREFUSED 127.0.0.1:5432'],
    ['JS xatosi', "Cannot read properties of undefined (reading 'id')"],
    ['SQL', 'UPDATE "Notification" SET "read" = true WHERE id = 1'],
    ['Postgres', 'relation "Foo" does not exist'],
    ['Windows yo\'li', 'ENOENT: no such file, open G:\\Prodeklarant\\backend\\uploads\\a.pdf'],
    ['OpenAI kalit', 'Incorrect API key provided: sk-proj-abc123****'],
    ['juda uzun', 'x'.repeat(301)],
  ])('%s', (_name, message) => {
    expect(isInternalErrorMessage(message)).toBe(true);
  });

  it.each([
    'Mijoz topilmadi',
    'Invoys raqami allaqachon mavjud',
    'Shartnoma summasi valyutasi noto\'g\'ri: USD kutilgan',
    'Ошибка при сохранении договора',
    'Xatolik yuz berdi',
  ])('foydalanuvchi xabari saqlanadi: %s', (message) => {
    expect(isInternalErrorMessage(message)).toBe(false);
  });
});

describe('sanitizeErrorBody', () => {
  it('4xx javobga tegmaydi', () => {
    const body = { error: 'Unique constraint failed P2002', details: 'x' };
    expect(sanitizeErrorBody(body, 400)).toBe(body);
  });

  it('5xx: ichki matn almashtiriladi, debug maydonlari olib tashlanadi', () => {
    expect(sanitizeErrorBody({ error: 'connect ECONNREFUSED 127.0.0.1:5432', details: 'd', stack: 's', code: 'X' }, 500))
      .toEqual({ error: GENERIC_ERROR_MESSAGE, code: 'X' });
  });

  it('5xx: foydalanuvchi xabari qoladi', () => {
    expect(sanitizeErrorBody({ error: 'Mijoz topilmadi' }, 500)).toEqual({ error: 'Mijoz topilmadi' });
  });

  it('5xx: string bo\'lmagan error (masalan Error obyekti) almashtiriladi', () => {
    expect(sanitizeErrorBody({ error: { name: 'PrismaClientKnownRequestError' } }, 500))
      .toEqual({ error: GENERIC_ERROR_MESSAGE });
  });

  it('massiv va primitivlarga tegmaydi', () => {
    expect(sanitizeErrorBody([1, 2], 500)).toEqual([1, 2]);
    expect(sanitizeErrorBody('text', 500)).toBe('text');
  });
});

describe('sanitizeErrorResponses middleware', () => {
  let server: Server;
  let baseUrl: string;

  const makeApp = (isProduction: boolean) => {
    const app = express();
    app.use(sanitizeErrorResponses(isProduction));
    app.get('/leak', (_req, res) => {
      res.status(500).json({ error: '\nInvalid `prisma.user.findMany()` invocation', details: 'secret' });
    });
    app.get('/ok', (_req, res) => { res.json({ data: 'Prisma haqida maqola' }); });
    app.get('/user-msg', (_req, res) => { res.status(500).json({ error: 'Mijoz topilmadi' }); });
    return app;
  };

  beforeAll(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    server = makeApp(true).listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.close();
    vi.restoreAllMocks();
  });

  it('production: Prisma dump mijozga ketmaydi', async () => {
    const res = await fetch(`${baseUrl}/leak`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: GENERIC_ERROR_MESSAGE });
  });

  it('muvaffaqiyatli javobga tegmaydi', async () => {
    expect(await (await fetch(`${baseUrl}/ok`)).json()).toEqual({ data: 'Prisma haqida maqola' });
  });

  it('5xx dagi foydalanuvchi xabari qoladi', async () => {
    expect(await (await fetch(`${baseUrl}/user-msg`)).json()).toEqual({ error: 'Mijoz topilmadi' });
  });
});
