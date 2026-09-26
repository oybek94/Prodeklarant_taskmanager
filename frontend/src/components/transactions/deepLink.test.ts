import { describe, it, expect } from 'vitest';
import { shouldOpenEditFromRoute } from './deepLink';

describe('shouldOpenEditFromRoute', () => {
  it('mobilda /transactions/:id/edit havolasi bir marta ochiladi', () => {
    expect(shouldOpenEditFromRoute({ isMobile: true, editRouteId: 5, handledId: null })).toBe(true);
  });
  it('yopilgandan keyin (route hali o‘zgarmagan) qayta ochilmaydi', () => {
    expect(shouldOpenEditFromRoute({ isMobile: true, editRouteId: 5, handledId: 5 })).toBe(false);
  });
  it('desktopda yoki route yo‘q bo‘lsa ochilmaydi', () => {
    expect(shouldOpenEditFromRoute({ isMobile: false, editRouteId: 5, handledId: null })).toBe(false);
    expect(shouldOpenEditFromRoute({ isMobile: true, editRouteId: null, handledId: null })).toBe(false);
  });
});
