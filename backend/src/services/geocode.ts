// Koordinatadan manzilga (reverse geocoding): OpenStreetMap Nominatim. Kalit kerak emas, lekin siyosat:
// ≤1 so'rov/s va aniq User-Agent (env GEOCODE_USER_AGENT). Natija koordinata (~1 km) bo'yicha keshlanadi.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const REQUEST_GAP_MS = 1100;
const REQUEST_TIMEOUT_MS = 8000;
const CACHE_MAX = 500;

const PLACE_KEYS = ['city', 'town', 'village', 'hamlet', 'suburb'] as const;
const REGION_KEYS = ['state', 'region', 'county', 'state_district'] as const;

type AddressParts = Record<string, unknown>;

function pickFirst(address: AddressParts, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = address[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return null;
}

/** Nominatim `address` obyektidan "shahar, viloyat, davlat" ko'rinishidagi qisqa manzil */
export function formatNominatimAddress(address: AddressParts | undefined): string | null {
  if (!address) return null;
  const parts = [pickFirst(address, PLACE_KEYS), pickFirst(address, REGION_KEYS), pickFirst(address, ['country'])].filter(
    (part): part is string => part !== null
  );
  const unique = parts.filter((part, index) => parts.indexOf(part) === index);
  return unique.length > 0 ? unique.join(', ') : null;
}

export function geocodeCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

const cache = new Map<string, string | null>();
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

async function fetchAddress(lat: number, lng: number): Promise<string | null> {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
  const url = `${NOMINATIM_URL}?format=jsonv2&zoom=10&accept-language=ru&lat=${lat}&lon=${lng}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': process.env.GEOCODE_USER_AGENT?.trim() || 'Prodeklarant-CargoBot/1.0' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { address?: AddressParts };
  return formatNominatimAddress(json.address);
}

/** Manzilni qaytaradi; xizmat ishlamasa yoki topilmasa null (chaqiruvchi koordinatani ko'rsatadi) */
export function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = geocodeCacheKey(lat, lng);
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const job = queue.then(async () => {
    try {
      const address = await fetchAddress(lat, lng);
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
      cache.set(key, address);
      return address;
    } catch (e) {
      console.error('[Geocode] xato:', e instanceof Error ? e.name : 'unknown');
      return null;
    }
  });
  queue = job.catch(() => undefined);
  return job;
}
