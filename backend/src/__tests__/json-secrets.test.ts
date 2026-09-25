import { describe, it, expect } from 'vitest';
import express from 'express';
import http from 'http';
import type { AddressInfo } from 'net';
import { stripSecretsReplacer } from '../utils/json-secrets';

describe("json replacer: passwordHash javobga chiqmaydi", () => {
  it('ichma-ich obyekt va massivlarda ham olib tashlanadi, qolgani saqlanadi', async () => {
    const app = express();
    app.set('json replacer', stripSecretsReplacer);
    app.get('/t', (_req, res) => {
      res.json({
        id: 1,
        client: { id: 3, name: 'Mijoz', passwordHash: '$2a$10$abc' },
        stages: [{ assignedTo: { id: 7, passwordHash: '$2a$10$def', role: 'ADMIN' } }],
        qrToken: 'ochiq',
      });
    });
    const server = http.createServer(app);
    await new Promise<void>((r) => server.listen(0, r));
    const { port } = server.address() as AddressInfo;
    const text = await (await fetch(`http://127.0.0.1:${port}/t`)).text();
    server.close();

    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain('$2a$');
    expect(JSON.parse(text)).toEqual({
      id: 1,
      client: { id: 3, name: 'Mijoz' },
      stages: [{ assignedTo: { id: 7, role: 'ADMIN' } }],
      qrToken: 'ochiq',
    });
  });
});
