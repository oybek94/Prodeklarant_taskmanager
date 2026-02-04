const STORAGE_KEY = 'tnved_products';

export interface TnvedProduct {
  id: string;
  name: string;
  code: string;
  botanicalName?: string;
}

const DEFAULT_TNVED_PRODUCTS: TnvedProduct[] = [
  { id: '1', name: 'Черешня свежая некалиброванный', code: '0809290001', botanicalName: 'Prunus avium' },
  { id: '2', name: 'Нектарины свежие', code: '0809301001', botanicalName: 'Prunus persica var.nucipersica' },
  { id: '3', name: 'Персики свежие', code: '0809309001', botanicalName: 'Prunus persica' },
  { id: '4', name: 'Абрикосы свежие некалиброванный', code: '0809100009', botanicalName: 'Prunus armeniaca' },
  { id: '4a', name: 'Абрикосы свежие', code: '0809100009', botanicalName: 'Prunus armeniaca' },
  { id: '5', name: 'Гранат свежий', code: '0810907502', botanicalName: 'Punica granatum' },
  { id: '6', name: 'Вишня свежая', code: '0809210001', botanicalName: 'Prúnus subg. Cérasus' },
  { id: '7', name: 'Томаты свежие', code: '0702000001', botanicalName: 'Solanum lycopersicum' },
  { id: '8', name: 'Чеснок свежий', code: '0703200000', botanicalName: 'Allium sativum' },
  { id: '9', name: 'Капуста цветная свежая', code: '0704100000', botanicalName: 'Brassica oleracea var. botrytis' },
  { id: '10', name: 'Морковь свежая', code: '0706100004', botanicalName: 'Daucus carota subsp.sativus' },
  { id: '11', name: 'Свекла столовая свежая', code: '0706909001', botanicalName: 'Beta vulgaris' },
  { id: '12', name: 'Репа свежая', code: '0706100008', botanicalName: 'Brassika napus' },
  { id: '13', name: 'Редька свежая', code: '0706909007', botanicalName: 'Raphanus sativus' },
  { id: '14', name: 'Лимоны свежие', code: '0805501001', botanicalName: 'Citrus limon' },
  { id: '15', name: 'Зелень петрушка свежая', code: '0709999000', botanicalName: 'Petroselinum sativum' },
  { id: '16', name: 'Зелень укроп свежая', code: '0709999000', botanicalName: 'Anethum graveolens' },
  { id: '17', name: 'Зелень кинза свежая', code: '0709999000', botanicalName: 'Coriandrum sativus' },
  { id: '18', name: 'Капуста Пекинская свежая', code: '0704908000', botanicalName: 'Brassica rapa subsp. Pekinensis' },
  { id: '19', name: 'Огурцы свежие', code: '0707000501', botanicalName: 'Cucumis sativus' },
  { id: '20', name: 'Перец горький свежий', code: '0709609900', botanicalName: 'Capsicum annuum' },
  { id: '21', name: 'Перец болгарский свежий', code: '0709601000', botanicalName: 'Capsicum annuum' },
  { id: '22', name: 'Лук репчатый свежий', code: '0703101900', botanicalName: 'Allium cepa' },
  { id: '23', name: 'Лук зеленный свежий', code: '0703900000', botanicalName: 'Allium fistulosum' },
  { id: '24', name: 'Баклажаны свежие', code: '0709300000', botanicalName: 'Solanum melongena' },
  { id: '25', name: 'Яблоки свежие', code: '0808108001', botanicalName: 'Malus domestica' },
  { id: '26', name: 'Дыни свежие', code: '0807190001', botanicalName: 'Cucumis melo' },
  { id: '27', name: 'Арбузы свежие', code: '0807110001', botanicalName: 'Citrullus lanatus' },
  { id: '28', name: 'Редис свежий', code: '0706909009', botanicalName: 'Raphanus sativus var.sativus' },
  { id: '29', name: 'Капуста белокочанная свежая', code: '0704901001', botanicalName: 'Brássica olerácea' },
  { id: '30', name: 'Сливы свежие', code: '0809400501', botanicalName: 'Prunus domestica' },
  { id: '31', name: 'Виноград свежий столовых сортов', code: '0806101009', botanicalName: 'Vitis vinifera' },
  { id: '32', name: 'Инжир свежий', code: '0804201000', botanicalName: 'Ficus carica' },
  { id: '33', name: 'Груша свежая', code: '0808309001', botanicalName: 'Pyrus communis' },
  { id: '34', name: 'Хурма свежая', code: '0810700009', botanicalName: 'Diospyros kaki' },
  { id: '35', name: 'Айва свежая', code: '0808400001', botanicalName: 'Cydonia oblonga' },
  { id: '36', name: 'Лаймы свежие', code: '0805509000', botanicalName: 'Citrus aurantiifolia' },
  { id: '37', name: 'Кукуруза свежая в початках', code: '0709996000', botanicalName: 'Zea mays' },
];

function loadFromStorage(): TnvedProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_TNVED_PRODUCTS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_TNVED_PRODUCTS];
    const defaultsByName = new Map(
      DEFAULT_TNVED_PRODUCTS.map((item) => [item.name.trim(), item])
    );
    const defaultsByCode = new Map(
      DEFAULT_TNVED_PRODUCTS.map((item) => [item.code.trim(), item])
    );
    return parsed.map((item) => {
      const name = String(item.name ?? '');
      const code = String(item.code ?? '');
      const fallback = defaultsByName.get(name.trim()) || defaultsByCode.get(code.trim());
      return {
      id: String(item.id ?? ''),
        name,
        code: code || fallback?.code || '',
        botanicalName:
          item.botanicalName ? String(item.botanicalName) : fallback?.botanicalName,
      };
    });
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

export function getDefaultTnvedProducts(): TnvedProduct[] {
  return DEFAULT_TNVED_PRODUCTS.map((item) => ({ ...item }));
}

export function setTnvedProducts(items: TnvedProduct[]) {
  saveToStorage(items);
}

export function addTnvedProduct(
  name: string,
  code: string,
  botanicalName?: string
): TnvedProduct {
  const items = loadFromStorage();
  const id = String(Date.now());
  const newItem: TnvedProduct = {
    id,
    name: name.trim(),
    code: code.trim(),
    botanicalName: botanicalName?.trim() || undefined,
  };
  items.push(newItem);
  saveToStorage(items);
  return newItem;
}

export function updateTnvedProduct(
  id: string,
  name: string,
  code: string,
  botanicalName?: string
): void {
  const items = loadFromStorage();
  const idx = items.findIndex((p) => p.id === id);
  if (idx === -1) return;
  items[idx] = {
    ...items[idx],
    name: name.trim(),
    code: code.trim(),
    botanicalName: botanicalName?.trim() || undefined,
  };
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
