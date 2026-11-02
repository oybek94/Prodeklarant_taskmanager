import { describe, it, expect } from 'vitest';
import { formatNominatimAddress, geocodeCacheKey } from '../services/geocode';

describe('formatNominatimAddress', () => {
  it('shahar, viloyat va davlatni birlashtiradi', () => {
    expect(formatNominatimAddress({ town: 'Aktobe', state: 'Aktobe Region', country: 'Qozogiston', road: 'M32' })).toBe(
      'Aktobe, Aktobe Region, Qozogiston'
    );
  });
  it("takrorlanuvchi qismlarni bir marta qoldiradi", () => {
    expect(formatNominatimAddress({ city: 'Moskva', state: 'Moskva', country: 'Россия' })).toBe('Moskva, Россия');
  });
  it("bo'sh yoki yo'q manzilda null", () => {
    expect(formatNominatimAddress(undefined)).toBeNull();
    expect(formatNominatimAddress({ road: 'M32' })).toBeNull();
  });
});

describe('geocodeCacheKey', () => {
  it("yaqin koordinatalarni bitta kalitga yaxlitlaydi", () => {
    expect(geocodeCacheKey(50.281, 57.204)).toBe(geocodeCacheKey(50.2849, 57.2049));
    expect(geocodeCacheKey(50.28, 57.2)).not.toBe(geocodeCacheKey(51.28, 57.2));
  });
});
