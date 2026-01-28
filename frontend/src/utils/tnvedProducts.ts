const STORAGE_KEY = 'tnved_products';

export interface TnvedProduct {
  id: string;
  name: string;
  code: string;
}

const DEFAULT_TNVED_PRODUCTS: TnvedProduct[] = [
  { id: '1', name: 'Черешня свежая некалиброванный', code: '0809290001' },
  { id: '2', name: 'Нектарины свежие', code: '0809301001' },
  { id: '3', name: 'Персики свежие', code: '0809309001' },
  { id: '4', name: 'Абрикосы свежие', code: '0809100009' },
  { id: '5', name: 'Гранат свежий', code: '0810907502' },
  { id: '6', name: 'Вишня свежая', code: '0809210001' },
  { id: '7', name: 'Томаты свежие', code: '0702000001' },
  { id: '8', name: 'Чеснок свежий', code: '0703200000' },
  { id: '9', name: 'Капуста цветная свежая', code: '0704100000' },
  { id: '10', name: 'Морковь свежая', code: '0706100004' },
  { id: '11', name: 'Свекла столовая свежая', code: '0706909001' },
  { id: '12', name: 'Репа свежая', code: '0706100008' },
  { id: '13', name: 'Редька свежая', code: '0706909007' },
  { id: '14', name: 'Лимоны свежие', code: '0805501001' },
  { id: '15', name: 'Зелень петрушка свежая', code: '0709999000' },
  { id: '16', name: 'Зелень укроп свежая', code: '0709999000' },
  { id: '17', name: 'Зелень кинза свежая', code: '0709999000' },
  { id: '18', name: 'Капуста Пекинская свежая', code: '0704908000' },
  { id: '19', name: 'Огурцы свежие', code: '0707000504' },
  { id: '20', name: 'Перец горький свежий', code: '0709609900' },
  { id: '21', name: 'Перец болгарский свежий', code: '0709601000' },
  { id: '22', name: 'Лук репчатый свежий', code: '0703101900' },
  { id: '23', name: 'Лук зеленный свежий', code: '0703900000' },
  { id: '24', name: 'Баклажаны свежие', code: '0709300000' },
  { id: '25', name: 'Яблоки свежие', code: '0808108001' },
  { id: '26', name: 'Дыни свежие', code: '0807190001' },
  { id: '27', name: 'Арбузы свежие', code: '0807110001' },
  { id: '28', name: 'Редис свежий', code: '0706909009' },
  { id: '29', name: 'Капуста белокочанная свежая', code: '0704901001' },
  { id: '30', name: 'Сливы свежие', code: '0809400501' },
  { id: '31', name: 'Виноград свежий столовых сортов', code: '0806101009' },
  { id: '32', name: 'Инжир свежий', code: '0804201000' },
  { id: '33', name: 'Груша свежая', code: '0808309001' },
  { id: '34', name: 'Хурма свежая', code: '0810700009' },
  { id: '35', name: 'Айва свежая', code: '0808400001' },
  { id: '36', name: 'Лаймы свежие', code: '0805509000' },
  { id: '37', name: 'Кукуруза свежая в початках', code: '0709996000' },
];

function loadFromStorage(): TnvedProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_TNVED_PRODUCTS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_TNVED_PRODUCTS];
  } catch {
    return [...DEFAULT_TNVED_PRODUCTS];
  }
}

function saveToStorage(items: TnvedProduct[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getTnvedProducts(): TnvedProduct[] {
  return loadFromStorage();
}

export function setTnvedProducts(items: TnvedProduct[]) {
  saveToStorage(items);
}

export function addTnvedProduct(name: string, code: string): TnvedProduct {
  const items = loadFromStorage();
  const id = String(Date.now());
  const newItem: TnvedProduct = { id, name: name.trim(), code: code.trim() };
  items.push(newItem);
  saveToStorage(items);
  return newItem;
}

export function updateTnvedProduct(id: string, name: string, code: string): void {
  const items = loadFromStorage();
  const idx = items.findIndex((p) => p.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], name: name.trim(), code: code.trim() };
  saveToStorage(items);
}

export function deleteTnvedProduct(id: string): void {
  const items = loadFromStorage().filter((p) => p.id !== id);
  saveToStorage(items);
}

export function resetTnvedProductsToDefaults(): TnvedProduct[] {
  const items = DEFAULT_TNVED_PRODUCTS.map((p) => ({ ...p }));
  saveToStorage(items);
  return items;
}
