const STORAGE_KEY = 'packaging_types';

export interface PackagingType {
  id: string;
  name: string;
}

const DEFAULT_PACKAGING_TYPES: PackagingType[] = [
  { id: '1', name: 'дер.ящик' },
  { id: '2', name: 'пласт.ящик' },
  { id: '3', name: 'мешки' },
  { id: '4', name: 'картон.короб.' },
  { id: '5', name: 'навалом' },
];

function loadFromStorage(): PackagingType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_PACKAGING_TYPES];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_PACKAGING_TYPES];
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

export function addPackagingType(name: string): PackagingType {
  const items = loadFromStorage();
  const id = String(Date.now());
  const newItem: PackagingType = { id, name: name.trim() };
  items.push(newItem);
  saveToStorage(items);
  return newItem;
}

export function updatePackagingType(id: string, name: string): void {
  const items = loadFromStorage();
  const idx = items.findIndex((p) => p.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], name: name.trim() };
  saveToStorage(items);
}

export function deletePackagingType(id: string): void {
  const items = loadFromStorage().filter((p) => p.id !== id);
  saveToStorage(items);
}
