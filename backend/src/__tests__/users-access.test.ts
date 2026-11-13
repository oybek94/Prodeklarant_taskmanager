import { describe, expect, it } from 'vitest';
import { isUserSelectListRequest } from '../middleware/users-access';

const req = (method: string, path: string, query: Record<string, unknown> = {}) =>
  ({ method, path, query }) as Parameters<typeof isUserSelectListRequest>[0];

describe('isUserSelectListRequest', () => {
  it('faqat GET /?selectList=true ochiladi', () => {
    expect(isUserSelectListRequest(req('GET', '/', { selectList: 'true' }))).toBe(true);
  });

  it.each([
    ['GET', '/', {}],
    ['GET', '/', { selectList: 'false' }],
    ['GET', '/', { selectList: ['true', 'x'] }],
    ['GET', '/5', { selectList: 'true' }],
    ['GET', '/5/anything', { selectList: 'true' }],
    ['POST', '/', { selectList: 'true' }],
    ['PUT', '/5', { selectList: 'true' }],
    ['DELETE', '/5', { selectList: 'true' }],
  ])('%s %s %j — ADMIN talab qilinadi', (method, path, query) => {
    expect(isUserSelectListRequest(req(method, path, query))).toBe(false);
  });
});
