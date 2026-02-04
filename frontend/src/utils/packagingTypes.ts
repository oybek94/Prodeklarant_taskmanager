const STORAGE_KEY = 'packaging_types';

export interface PackagingType {
  id: string;
  name: string;
  code?: string;
}

const DEFAULT_PACKAGING_TYPES: PackagingType[] = [
  { id: '1', name: 'дер.ящик', code: '' },
  { id: '2', name: 'пласт.ящик', code: '' },
  { id: '3', name: 'мешки', code: '' },
  { id: '4', name: 'картон.короб.', code: '' },
  { id: '5', name: 'навалом', code: '' },
];

function loadFromStorage(): PackagingType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_PACKAGING_TYPES];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_PACKAGING_TYPES];
    return parsed.map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? ''),
      code: item.code ? String(item.code) : '',
    }));
  } catch {
    return [...DEFAULT_PACKAGING_TYPES];
  }
}

function saveToStorage(items: PackagingType[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getPackagingTypes(): PackagingType[] {
  return loadFromStorage();
}

export function addPackagingType(name: string, code?: string): PackagingType {
  const items = loadFromStorage();
  const id = String(Date.now());
  const newItem: PackagingType = { id, name: name.trim(), code: code?.trim() || '' };
  items.push(newItem);
  saveToStorage(items);
  return newItem;
}

export function updatePackagingType(id: string, name: string, code?: string): void {
  const items = loadFromStorage();
  const idx = items.findIndex((p) => p.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], name: name.trim(), code: code?.trim() || '' };
  saveToStorage(items);
}

export function deletePackagingType(id: string): void {
  const items = loadFromStorage().filter((p) => p.id !== id);
  saveToStorage(items);
}
