import { useEffect, useState } from 'react';

/** Qiymat `delayMs` davomida o'zgarmay turgandan keyingina yangilanadi (qidiruv so'rovlari uchun) */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
