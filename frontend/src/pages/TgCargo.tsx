import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { API_BASE_URL } from '../lib/api';
import { REQUIRED_ITEM_FIELDS, branchLabel, buildPatch, deriveManualFlags, fieldAnchor, makeUid, requiredProgress,snapshotFromDraft, stripCyrillic, totalsLine, type DraftView, type FormSnapshot, type MissingField, type SnapshotItem } from './tgCargoDraft';
import { ChoiceField, ErrorText, FieldHead, Icon, NumberBox, NumberGroup, Section, TextField, type ChoiceOption } from './TgCargoControls';
import './TgCargo.css';

// Telegram Mini App: yuk ma'lumotlari formasi. Guruhdagi "Formani ochish" tugmasi orqali ochiladi.
// Auth: Telegram initData (Authorization: tma ...) — backend imzoni va guruh a'zoligini tekshiradi.
// Bu sahifa asosiy ilovaning login/Layout tizimidan tashqarida; shuning uchun lib/api (JWT) ishlatilmaydi.

interface TelegramWebApp {
  initData: string;
  colorScheme?: 'light' | 'dark';
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  onEvent?: (event: 'themeChanged', handler: () => void) => void;
  offEvent?: (event: 'themeChanged', handler: () => void) => void;
  HapticFeedback?: { notificationOccurred: (type: 'success' | 'error' | 'warning') => void };
  /** Yoqilgan bo'lsa Mini App'ni yopishdan oldin Telegram tasdiq so'raydi */
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

interface ContractInfo {
  id: number;
  contractNumber: string;
  buyerName: string;
  currency: string | null;
  cities: Array<{ text: string; pairedCustoms: string | null }>;
  customs: string[];
  destinations: string[];
  /** Eski backend bu maydonni bermaydi */
  lastInvoice?: { number: string; date: string } | null;
}

interface CargoContext {
  /** Mini App qaysi ariza bilan ochilgan: raqam — mavjud ariza, 'new'/null — yangi */
  launch?: { draft: number | 'new' | null };
  clientName: string;
  contracts: ContractInfo[];
  branches: Array<{ id: number; name: string; place?: string }>;
  products: string[];
  /** "Вид упаковки" variantlari (Sozlamalar → Qadoq turlari); eski backend bermaydi */
  packagingTypes?: string[];
}

type HeaderField = 'invoiceNumber' | 'deliveryTerms' | 'customsPlace' | 'destination' | 'vehicleNumber' | 'orderNumber' | 'temperature' | 'sensorSerial';
type HeaderValues = Record<HeaderField, string>;
type ManualKey = 'deliveryTerms' | 'customsPlace' | 'destination';
type ManualFlags = Record<ManualKey, boolean>;
type ItemField = 'product' | 'boxCount' | 'boxWeight' | 'packagingType' | 'palletCount' | 'palletWeight' | 'netto' | 'price';
type Scheme = 'light' | 'dark';

interface ItemState extends Record<ItemField, string> {
  /** Barqaror id (serverdagi qoralama tovarini aniqlaydi); bir nechta xodim bir vaqtda tovar qo'shsa to'qnashmasligi uchun tasodifiy */
  uid: string;
  /** null — Brutto avtomatik hisoblanadi; qiymat bo'lsa foydalanuvchi qo'lda o'zgartirgan */
  bruttoOverride: string | null;
}

/** "Qaytarish" bilan bekor qilinadigan amallar: tovarni o'chirish va shartnoma almashganda maydonlarning tozalanishi */
type UndoEntry =
  | { kind: 'item'; item: ItemState; index: number }
  | { kind: 'contract'; contractId: number | null; terms: Pick<HeaderValues, ManualKey>; manual: ManualFlags };

/** Shartnomaga bog'liq maydonlar: shartnoma almashsa eskiradi */
const CONTRACT_FIELDS: readonly ManualKey[] = ['deliveryTerms', 'customsPlace', 'destination'];

const EMPTY_HEADER: HeaderValues = {
  invoiceNumber: '',
  deliveryTerms: '',
  customsPlace: '',
  destination: '',
  vehicleNumber: '',
  orderNumber: '',
  temperature: '',
  sensorSerial: '',
};
const NO_MANUAL: ManualFlags = { deliveryTerms: false, customsPlace: false, destination: false };
/** Saqlangan holatdagi tovarni forma holatiga o'tkazadi (Brutto qo'lda bo'lsagina override) */
const itemStateOf = (item: SnapshotItem): ItemState => ({
  uid: item.uid,
  product: item.fields.product,
  boxCount: item.fields.boxCount,
  boxWeight: item.fields.boxWeight,
  packagingType: item.fields.packagingType,
  palletCount: item.fields.palletCount,
  palletWeight: item.fields.palletWeight,
  netto: item.fields.netto,
  price: item.fields.price,
  bruttoOverride: item.bruttoManual ? item.fields.brutto : null,
});

const newItem = (uid: string): ItemState => ({
  uid,
  product: '',
  boxCount: '',
  boxWeight: '',
  packagingType: '',
  palletCount: '',
  palletWeight: '',
  netto: '',
  price: '',
  bruttoOverride: null,
});

const TELEGRAM_SDK_URL = 'https://telegram.org/js/telegram-web-app.js';
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap';
/** "Yakunlandi" ekrani o'qib ulgurilsin; kutishni istamagan "Yopish" tugmasini bosadi */
const CLOSE_DELAY_MS = 8000;
const OFFLINE_MESSAGE = "Internet aloqasi yo'q. Aloqani tekshirib, qayta urinib ko'ring.";
const MAX_ITEMS = 20;
const SCHEME_COLORS: Record<Scheme, string> = { light: '#eaf0f7', dark: '#121212' };

/** Maydon nomlari forma va guruh xabarida bir xil (backend `client-cargo-form.ts` dagi HEADER_FIELDS/ITEM_FIELDS bilan mos) */
const HEADER_LABELS = {
  contract: 'Контракт',
  invoiceNumber: 'Инвойс №',
  deliveryTerms: 'Условия поставки',
  customsPlace: 'Место там. очистки',
  destination: 'Место назначения',
  vehicleNumber: 'Номер автотранспорта',
  shipmentPlace: 'Место отгрузки груза',
  orderNumber: 'Номер заказа',
  temperature: 'Температура',
  sensorSerial: 'Серийный номер датчика',
} as const;
const ITEM_LABELS = {
  product: 'Наименование',
  boxCount: 'Количество ящиков',
  boxWeight: 'Общий вес ящиков',
  packagingType: 'Вид упаковки',
  palletCount: 'Количество поддонов',
  palletWeight: 'Общий вес поддонов',
  netto: 'Нетто',
  brutto: 'Брутто',
  price: 'Цена',
} as const;

const HEADER_ORDER = ['contract', 'invoiceNumber', 'deliveryTerms', 'customsPlace', 'destination', 'vehicleNumber', 'shipmentPlace', 'orderNumber', 'temperature', 'sensorSerial'] as const;
const ITEM_ORDER = ['product', 'boxCount', 'boxWeight', 'packagingType', 'palletCount', 'palletWeight', 'netto', 'brutto', 'price'] as const;

const toNumber = (v: string) => {
  const n = Number(v.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Brutto = Netto + yashiklar jami og'irligi + poddon jami og'irligi. Uchalasi ham bo'sh bo'lsa bo'sh qoladi. */
const computeBrutto = (v: Pick<ItemState, 'netto' | 'boxWeight' | 'palletWeight'>): string => {
  const parts = [v.netto, v.boxWeight, v.palletWeight];
  if (parts.every((p) => p.trim() === '')) return '';
  const sum = parts.reduce((acc, p) => acc + toNumber(p), 0);
  return String(Math.round(sum * 1000) / 1000);
};

const bruttoOf = (item: ItemState) => item.bruttoOverride ?? computeBrutto(item);

/** Hech narsa kiritilmagan tovar: o'chirilsa qaytarish taklif qilinmaydi */
const isUntouched = (item: ItemState): boolean => item.bruttoOverride === null && ITEM_ORDER.every((key) => key === 'brutto' || item[key] === '');

/** 2026-10-12T... → 12.10.2026 */
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

interface PreviewRow {
  label: string;
  value: string;
}
interface PreviewModel {
  header: PreviewRow[];
  items: Array<{ title: string; rows: PreviewRow[] }>;
  /** 2 va undan ortiq tovar bo'lsa "Итого: … нетто / … брутто" (guruh xabaridagi kabi) */
  total: string | null;
}

const normalizeText = (v: string) => v.replace(/\s+/g, ' ').trim();
const normalizeDecimal = (v: string) => v.trim().replace(',', '.');
/** Guruh xabaridagi kabi o'lchov birligi (шт. / кг.); qiymat bo'sh bo'lsa bo'sh qoladi */
const withUnit = (value: string, unit: string) => (value ? `${value} ${unit}` : '');

/** Backend xabarga qanday yozsa, shunday ko'rsatamiz (avto nomer katta harfda, vergul nuqta bo'ladi, bo'sh tovar tushadi) */
function buildPreview(header: HeaderValues, contract: ContractInfo | null, shipmentBranch: string, items: ItemState[]): PreviewModel {
  const headerValues: Record<(typeof HEADER_ORDER)[number], string> = {
    contract: contract ? `${contract.contractNumber}, ${contract.buyerName}` : '',
    invoiceNumber: normalizeText(header.invoiceNumber),
    deliveryTerms: normalizeText(header.deliveryTerms),
    customsPlace: normalizeText(header.customsPlace),
    destination: normalizeText(header.destination),
    vehicleNumber: header.vehicleNumber.replace(/\s+/g, '').toUpperCase(),
    shipmentPlace: shipmentBranch,
    orderNumber: normalizeText(header.orderNumber),
    temperature: normalizeText(header.temperature),
    sensorSerial: normalizeText(header.sensorSerial),
  };
  const headerRows = HEADER_ORDER.flatMap((key) => (headerValues[key] ? [{ label: HEADER_LABELS[key], value: headerValues[key] }] : []));

  const itemRows = items
    .map((item) => {
      const values: Record<(typeof ITEM_ORDER)[number], string> = {
        product: normalizeText(item.product),
        // Qadoq turi tanlangan bo'lsa ящиклар soni shu nom bilan: "2500 дер.ящик" (guruh xabaridagi kabi)
        // Ящиклар: soni (qadoq turi bilan) va vazni ikkalasi ham bo'lsa bitta qatorda "2500 дер.ящик (2500 кг)" (guruh xabaridagi kabi)
        boxCount: item.boxCount.trim()
          ? `${item.boxCount.trim()} ${normalizeText(item.packagingType) || 'шт.'}${normalizeDecimal(item.boxWeight) ? ` (${normalizeDecimal(item.boxWeight)} кг)` : ''}`
          : '',
        boxWeight: item.boxCount.trim() ? '' : withUnit(normalizeDecimal(item.boxWeight), 'кг.'),
        // Ящиклар soni bo'lsa qadoq turi unga birlashtirilgan — alohida qator chiqmaydi
        packagingType: item.boxCount.trim() ? '' : normalizeText(item.packagingType),
        // Поддоны: soni va vazni ikkalasi ham bo'lsa bitta qatorda "33 шт. (430 кг)" (guruh xabaridagi kabi)
        palletCount: item.palletCount.trim()
          ? `${item.palletCount.trim()} шт.${normalizeDecimal(item.palletWeight) ? ` (${normalizeDecimal(item.palletWeight)} кг)` : ''}`
          : '',
        palletWeight: item.palletCount.trim() ? '' : withUnit(normalizeDecimal(item.palletWeight), 'кг.'),
        netto: withUnit(normalizeDecimal(item.netto), 'кг.'),
        brutto: withUnit(normalizeDecimal(bruttoOf(item)), 'кг.'),
        price: normalizeDecimal(item.price) ? `${normalizeDecimal(item.price)}${contract?.currency ? ` ${contract.currency}` : ''}` : '',
      };
      const rows = ITEM_ORDER.flatMap((key) => (values[key] ? [{ label: ITEM_LABELS[key], value: values[key] }] : []));
      return { rows, netto: values.netto ? normalizeDecimal(item.netto) : '', brutto: values.brutto ? normalizeDecimal(bruttoOf(item)) : '' };
    })
    .filter((item) => item.rows.length > 0);

  return {
    header: headerRows,
    items: itemRows.map((item, i) => ({ title: `Товар ${i + 1}`, rows: item.rows })),
    total: totalsLine(itemRows.map((item) => ({ netto: item.netto, brutto: item.brutto }))),
  };
}

const previewCount = (model: PreviewModel) => model.header.length + model.items.reduce((sum, item) => sum + item.rows.length, 0);

/** SDK yuklanmagan bo'lsa initData Telegram bergan URL hash'idan olinadi */
const readInitData = (): string => {
  const fromSdk = window.Telegram?.WebApp?.initData;
  if (fromSdk) return fromSdk;
  return new URLSearchParams(window.location.hash.slice(1)).get('tgWebAppData') ?? '';
};

const systemScheme = (): Scheme => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const loadTelegramSdk = (): Promise<void> =>
  new Promise((resolve) => {
    if (window.Telegram?.WebApp) return resolve();
    const script = document.createElement('script');
    script.src = TELEGRAM_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // SDK'siz ham ishlaydi (hash'dan initData olinadi)
    document.head.appendChild(script);
  });

/** Shrift tarmoqdan kelmasa tizim shrifti ishlatiladi, shuning uchun yuklanishini kutmaymiz */
const loadFont = () => {
  if (document.querySelector(`link[href="${FONT_URL}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONT_URL;
  document.head.appendChild(link);
};

type FieldErrors = Partial<Record<string, string>>;

class ApiError extends Error {
  fieldErrors?: FieldErrors;
  status?: number;
  constructor(message: string, fieldErrors?: FieldErrors, status?: number) {
    super(message);
    this.fieldErrors = fieldErrors;
    this.status = status;
  }
}

/** So'rov serverga yetib bormadi: brauzerning inglizcha xatosi o'rniga tushunarli matn */
class OfflineError extends Error {
  constructor() {
    super(OFFLINE_MESSAGE);
  }
}

async function tgFetch<T>(path: string, initData: string, body?: unknown, method?: 'POST' | 'PATCH'): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/tg-cargo${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { Authorization: `tma ${initData}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new OfflineError();
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string; errors?: FieldErrors } & T;
  if (!response.ok) throw new ApiError(json.error ?? 'Xatolik yuz berdi', json.errors, response.status);
  return json;
}

function PreviewBubble({ model, empty }: { model: PreviewModel; empty: string }) {
  if (previewCount(model) === 0) return <div className="tgc-bubble"><p className="tgc-bubble-empty">{empty}</p></div>;
  return (
    <div className="tgc-bubble" lang="ru">
      <div className="tgc-bubble-head">🚛 Данные о грузе</div>
      {model.header.map((row) => (
        <div key={row.label}>
          {row.label}: <b>{row.value}</b>
        </div>
      ))}
      {model.items.map((item) => (
        <div key={item.title} className="tgc-bubble-item">
          <div className="tgc-bubble-item-title">{item.title}</div>
          {item.rows.map((row) => (
            <div key={row.label}>
              {row.label}: <b>{row.value}</b>
            </div>
          ))}
        </div>
      ))}
      {model.total && <div className="tgc-bubble-item">📊 <b>{model.total}</b></div>}
    </div>
  );
}

/** saved — saqlandi (yetishmayotganlar yoki Yakunlash), completed — yakunlandi, closed — ariza yopilgan */
type Phase = 'loading' | 'ready' | 'sending' | 'saved' | 'completed' | 'closed' | 'fatal';

const CLOSED_STATUSES: ReadonlySet<string> = new Set(['COMPLETED', 'CANCELLED']);

const FLASH_MS = 1600;

/** "Saqlandi" ekranida yetishmayotgan maydon qaysi bo'limda ekani */
const missingPlace = (m: MissingField): string => {
  if (m.itemNumber !== null) return `Товар ${m.itemNumber}`;
  return m.path === 'branchId' ? "Transport va jo'natish" : "Hujjat va yo'nalish";
};

export default function TgCargo() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [fatalError, setFatalError] = useState('');
  /** "Qayta urinish" bosilganda yuklash effekti qayta ishlaydi */
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [context, setContext] = useState<CargoContext | null>(null);
  const [initData, setInitData] = useState('');
  const [scheme, setScheme] = useState<Scheme>(systemScheme);
  const [header, setHeader] = useState<HeaderValues>(EMPTY_HEADER);
  const [manual, setManual] = useState<ManualFlags>(NO_MANUAL);
  const [contractId, setContractId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);
  // Boshlang'ich forma va solishtirish bazasi BIR snapshot'dan: aks holda tasodifiy uid'lar farq qilib, bo'sh tovar "o'chirilgan" deb yuboriladi
  const initialSnapshot = useMemo(() => snapshotFromDraft(null), []);
  const [items, setItems] = useState<ItemState[]>(() => initialSnapshot.items.map(itemStateOf));
  /** Serverdagi saqlangan ariza (yangi bo'lsa null) va uning formadagi ko'rinishi — o'zgarishni solishtirish uchun */
  const [draft, setDraft] = useState<DraftView | null>(null);
  const [base, setBase] = useState<FormSnapshot>(initialSnapshot);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [plateCyrillicWarning, setPlateCyrillicWarning] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  /** "Boshqa — o'zim yozaman" tanlangan tovarlar (uid) */
  const [otherProducts, setOtherProducts] = useState<ReadonlySet<string>>(() => new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  /** Oxirgisi birinchi qaytariladi; saqlangach tozalanadi */
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  /** Formaga qaytganda ko'rsatiladigan maydon (data-field) */
  const pendingAnchorRef = useRef<string | null>(null);

  /** Saqlangan holatni (server javobini) formaga to'ldiradi va solishtirish bazasini yangilaydi */
  const adoptDraft = useCallback((view: DraftView, contracts: ContractInfo[]) => {
    const snapshot = snapshotFromDraft(view);
    setBase(snapshot);
    setDraft(view);
    setHeader(snapshot.header);
    setContractId(snapshot.contractId);
    setBranchId(snapshot.branchId);
    setManual(deriveManualFlags(snapshot.header, contracts.find((c) => c.id === snapshot.contractId) ?? null));
    setItems(snapshot.items.map(itemStateOf));
    setUndoStack([]);
  }, []);

  useEffect(() => {
    loadFont();
    let cancelled = false;
    let detach: (() => void) | undefined;
    (async () => {
      await loadTelegramSdk();
      if (cancelled) return;
      const webApp = window.Telegram?.WebApp;
      webApp?.ready();
      webApp?.expand();
      if (webApp) {
        const sync = () => setScheme(webApp.colorScheme ?? systemScheme());
        sync();
        webApp.onEvent?.('themeChanged', sync);
        detach = () => webApp.offEvent?.('themeChanged', sync);
      }
      const data = readInitData();
      if (!data) {
        setFatalError("Bu forma Telegram ichida ochiladi. Guruhda /yangi yozing va «Formani ochish» tugmasini bosing.");
        setPhase('fatal');
        return;
      }
      setInitData(data);
      try {
        const ctx = await tgFetch<CargoContext>('/context', data);
        if (cancelled) return;
        setContext({ ...ctx, branches: ctx.branches ?? [], products: ctx.products ?? [], packagingTypes: ctx.packagingTypes ?? [] });
        const draftId = ctx.launch?.draft;
        if (typeof draftId === 'number') {
          const view = await tgFetch<DraftView>(`/drafts/${draftId}`, data);
          if (cancelled) return;
          adoptDraft(view, ctx.contracts);
          setPhase(CLOSED_STATUSES.has(view.status) ? 'closed' : 'ready');
        } else {
          setPhase('ready');
        }
      } catch (e) {
        if (cancelled) return;
        setFatalError(e instanceof Error ? e.message : "Yuklab bo'lmadi");
        setPhase('fatal');
      }
    })();
    return () => {
      cancelled = true;
      detach?.();
    };
  }, [adoptDraft, loadAttempt]);

  const retryLoad = () => {
    setPhase('loading');
    setLoadAttempt((n) => n + 1);
  };

  // Telegram'ning yuqori paneli va overscroll foni sahifa rangiga mos bo'lsin
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    try {
      webApp?.setHeaderColor?.(SCHEME_COLORS[scheme]);
      webApp?.setBackgroundColor?.(SCHEME_COLORS[scheme]);
    } catch {
      // eski Telegram versiyalarida mavjud emas — ko'rinishga ta'sir qilmaydi
    }
  }, [scheme]);

  // Sahifa yorug'/tungi rejimni o'zi boshqarishini e'lon qilamiz: aks holda Telegram Android'ning avtomatik
  // "force dark"i ranglarni qisman almashtiradi (fokus olgan maydonda matn oqarib, yorliqlar yo'qolib qoladi).
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.colorScheme;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'color-scheme';
      document.head.appendChild(meta);
    }
    const previousContent = meta.content;
    meta.content = 'light dark';
    root.style.colorScheme = scheme;
    return () => {
      root.style.colorScheme = previous;
      if (created) meta.remove();
      else meta.content = previousContent;
    };
  }, [scheme]);

  // Ekran klaviaturasi ochilganda sahifa ko'rinadigan maydonga moslashsin (Telegram ba'zan oynani o'zi qisqartiradi,
  // ba'zan faqat visualViewport o'zgaradi)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      rootRef.current?.style.setProperty('--tgc-vh', `${vv.height}px`);
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.matches('input, select, textarea')) {
        active.scrollIntoView({ block: 'center' });
      }
    };
    vv.addEventListener('resize', sync);
    return () => vv.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    const anchor = pendingAnchorRef.current;
    if (phase !== 'ready' || !anchor) return;
    pendingAnchorRef.current = null;
    const target = rootRef.current?.querySelector<HTMLElement>(`[data-field="${anchor}"]`);
    if (!target) return;
    target.scrollIntoView({ block: 'center' });
    target.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true });
    target.classList.add('tgc-flash');
    window.setTimeout(() => target.classList.remove('tgc-flash'), FLASH_MS);
  }, [phase]);

  const contract = useMemo(() => context?.contracts.find((c) => c.id === contractId) ?? null, [context, contractId]);
  const branch = useMemo(() => context?.branches.find((b) => b.id === branchId) ?? null, [context, branchId]);

  const clearError = (key: string) => setFieldErrors((prev) => ({ ...prev, [key]: undefined }));

  const setHeaderValue = (key: HeaderField, value: string) => {
    setHeader((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };
  /** Avto raqami faqat lotin alifbosida (dasturdagidek): kirill harflari o'chiriladi va ogohlantirish chiqadi */
  const setVehicleNumber = (raw: string) => {
    const { value, stripped } = stripCyrillic(raw);
    setPlateCyrillicWarning(stripped);
    setHeaderValue('vehicleNumber', value);
  };
  /** Qo'lda yozish rejimini almashtirganda eski tanlov/matn tozalanadi */
  const setManualFlag = (key: ManualKey, flag: boolean) => {
    setManual((prev) => ({ ...prev, [key]: flag }));
    setHeaderValue(key, '');
  };
  const pickHeader = (key: ManualKey, value: string) => {
    setManual((prev) => ({ ...prev, [key]: false }));
    setHeaderValue(key, value);
  };

  const changeContract = (id: number) => {
    if (id === contractId) return;
    if (CONTRACT_FIELDS.some((key) => header[key].trim() !== '')) {
      const terms = { deliveryTerms: header.deliveryTerms, customsPlace: header.customsPlace, destination: header.destination };
      setUndoStack((prev) => [...prev, { kind: 'contract', contractId, terms, manual }]);
    }
    setContractId(id);
    // Shartnoma o'zgarsa, unga bog'liq tanlovlar eskirgan bo'ladi
    setHeader((prev) => ({ ...prev, deliveryTerms: '', customsPlace: '', destination: '' }));
    setManual(NO_MANUAL);
  };

  const pickDeliveryTerms = (value: string) => {
    pickHeader('deliveryTerms', value);
    // Shartnomada shartga bog'langan Место там. очистки bo'lsa, shuni oldindan tanlab qo'yamiz (o'zgartirish mumkin)
    const paired = contract?.cities.find((c) => c.text === value)?.pairedCustoms;
    if (paired) pickHeader('customsPlace', paired);
  };

  const customsOptions = useMemo(() => {
    if (!contract) return [];
    const paired = contract.cities.find((c) => c.text === header.deliveryTerms)?.pairedCustoms;
    return paired ? [paired, ...contract.customs.filter((c) => c !== paired)] : contract.customs;
  }, [contract, header.deliveryTerms]);

  const updateItem = (uid: string, patch: Partial<ItemState>, errorKey?: string) => {
    setItems((prev) => prev.map((it) => (it.uid === uid ? { ...it, ...patch } : it)));
    if (errorKey) clearError(errorKey);
  };
  const setProductOther = (uid: string, other: boolean) => {
    setOtherProducts((prev) => {
      const next = new Set(prev);
      if (other) next.add(uid);
      else next.delete(uid);
      return next;
    });
  };
  const addItem = () => {
    setItems((prev) => (prev.length >= MAX_ITEMS ? prev : [...prev, newItem(makeUid())]));
  };
  const removeItem = (uid: string) => {
    const index = items.findIndex((it) => it.uid === uid);
    if (index === -1 || items.length <= 1) return;
    const item = items[index];
    if (!isUntouched(item)) setUndoStack((prev) => [...prev, { kind: 'item', item, index }]);
    setItems((prev) => prev.filter((it) => it.uid !== uid));
    // Xato kaliti tovar uid'iga bog'langan: o'chirilgan tovarning xatolari tushib qoladi
    setFieldErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`items.${uid}.`))));
  };

  const lastUndo = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
  // Tovarlar soni chegaraga yetgan bo'lsa o'chirilgan tovarni qaytarib bo'lmaydi
  const undo = lastUndo?.kind === 'item' && items.length >= MAX_ITEMS ? null : lastUndo;
  const applyUndo = () => {
    if (!undo) return;
    setUndoStack((prev) => prev.slice(0, -1));
    if (undo.kind === 'item') {
      setItems((prev) => [...prev.slice(0, undo.index), undo.item, ...prev.slice(undo.index)]);
      return;
    }
    setContractId(undo.contractId);
    setHeader((prev) => ({ ...prev, ...undo.terms }));
    setManual(undo.manual);
    CONTRACT_FIELDS.forEach(clearError);
  };

  const preview = useMemo(() => buildPreview(header, contract, branch ? (branch.place ?? branch.name) : '', items), [header, contract, branch, items]);
  const filledCount = previewCount(preview);

  /** Formadagi hozirgi qiymatlar serverdagi ko'rinishda (Brutto — hisoblangan yoki qo'lda yozilgani) */
  const currentSnapshot = (): FormSnapshot => ({
    contractId,
    branchId,
    header,
    items: items.map((it) => ({
      uid: it.uid,
      fields: {
        product: it.product,
        boxCount: it.boxCount,
        boxWeight: it.boxWeight,
        packagingType: it.packagingType,
        palletCount: it.palletCount,
        palletWeight: it.palletWeight,
        netto: it.netto,
        brutto: bruttoOf(it),
        price: it.price,
      },
      bruttoManual: it.bruttoOverride !== null,
    })),
  });

  // Saqlanmagan o'zgarish bor paytda Mini App tasodifan yopilib, kiritilganlar yo'qolmasin
  const dirty = buildPatch(base, currentSnapshot()) !== null;
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    try {
      if (dirty) webApp?.enableClosingConfirmation?.();
      else webApp?.disableClosingConfirmation?.();
    } catch {
      // eski Telegram versiyalarida mavjud emas
    }
  }, [dirty]);

  const showError = (e: unknown, fallback: string) => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    if (e instanceof ApiError) setFieldErrors(e.fieldErrors ?? {});
    const message = e instanceof Error ? e.message : fallback;
    setFormError(e instanceof OfflineError ? `${message} Kiritganlaringiz saqlanib turibdi.` : message);
    setPhase('ready');
    // Birinchi xatoli maydonga o'tamiz
    window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.scrollIntoView({ block: 'center' }), 100);
  };

  /** 409: ariza boshqa joyda yopilgan bo'lishi mumkin — shunda forma o'rniga "yopilgan" ekrani; aks holda kiritilganlar saqlanib qoladi */
  const handleConflict = async (e: unknown, fallback: string) => {
    if (draft) {
      try {
        const latest = await tgFetch<DraftView>(`/drafts/${draft.id}`, initData);
        if (CLOSED_STATUSES.has(latest.status)) {
          adoptDraft(latest, context?.contracts ?? []);
          setPhase('closed');
          return;
        }
      } catch {
        // yuklab bo'lmadi — oddiy xato sifatida ko'rsatiladi
      }
    }
    showError(e, fallback);
  };

  const save = async () => {
    setFormError('');
    setFieldErrors({});
    setPhase('sending');
    try {
      const patch = buildPatch(base, currentSnapshot());
      let view: DraftView;
      if (draft === null) {
        if (!patch) throw new Error("Hech narsa kiritilmadi. Kamida bitta maydonni to'ldiring");
        view = await tgFetch<DraftView>('/drafts', initData, patch);
      } else if (patch) {
        view = await tgFetch<DraftView>(`/drafts/${draft.id}`, initData, patch, 'PATCH');
      } else {
        view = draft; // o'zgarish yo'q — so'rov kerak emas, holatni (yetishmayotganlar/Yakunlash) ko'rsatamiz
      }
      adoptDraft(view, context?.contracts ?? []);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setPhase('saved');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) await handleConflict(e, 'Saqlab bo\'lmadi');
      else showError(e, "Saqlab bo'lmadi");
    }
  };

  const complete = async () => {
    if (!draft) return;
    setFormError('');
    setPhase('sending');
    try {
      const view = await tgFetch<DraftView>(`/drafts/${draft.id}/complete`, initData, {});
      adoptDraft(view, context?.contracts ?? []);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setPhase('completed');
      window.setTimeout(() => window.Telegram?.WebApp?.close(), CLOSE_DELAY_MS);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) await handleConflict(e, "Yakunlab bo'lmadi");
      else showError(e, "Yakunlab bo'lmadi");
    }
  };

  const jumpToField = (path: string) => {
    pendingAnchorRef.current = fieldAnchor(path, items[0]?.uid ?? '');
    setPhase('ready');
  };

  const isEditable = (el: EventTarget) => el instanceof HTMLElement && el.matches('input, select, textarea');
  const shell = (children: ReactNode) => (
    <div
      ref={rootRef}
      className="tgc"
      lang="uz"
      data-theme={scheme}
      onFocusCapture={(e) => {
        if (!isEditable(e.target)) return;
        // Saqlash tugmasi doim ko'rinadi; yozilayotgan maydon uning ostida qolib ketmasin
        const el = e.target as HTMLElement;
        window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320);
      }}
    >
      {children}
    </div>
  );

  if (phase === 'loading') {
    return shell(
      <div className="tgc-center" role="status">
        <div className="tgc-spinner" aria-hidden="true" />
        <p>Forma yuklanmoqda</p>
      </div>
    );
  }
  if (phase === 'fatal') {
    return shell(
      <div className="tgc-center">
        <h2>Formani ochib bo'lmadi</h2>
        <p>{fatalError}</p>
        {/* initData bo'lmasa (Telegram'dan tashqarida) qayta urinish foyda bermaydi */}
        {initData && <button type="button" className="tgc-ghost" onClick={retryLoad}>Qayta urinish</button>}
      </div>
    );
  }
  if (phase === 'closed') {
    return shell(
      <div className="tgc-center">
        <h2>Ariza yopilgan</h2>
        <p>Bu ariza yakunlangan yoki bekor qilingan, uni o'zgartirib bo'lmaydi. Yangi yuk uchun guruhda /yangi yozing.</p>
        <button type="button" className="tgc-ghost" onClick={() => window.Telegram?.WebApp?.close()}>Yopish</button>
      </div>
    );
  }
  if (phase === 'completed') {
    return shell(
      <div className="tgc-center">
        <svg className="tgc-check" viewBox="0 0 84 84" aria-hidden="true">
          <circle cx="42" cy="42" r="42" />
          <path d="M26 43l11 11 21-23" />
        </svg>
        <h2>Yakunlandi</h2>
        <p>Yuk ma'lumotlari to'liq, guruhdagi xabar yangilandi.</p>
        <button type="button" className="tgc-ghost" onClick={() => window.Telegram?.WebApp?.close()}>Yopish</button>
      </div>
    );
  }
  if (phase === 'saved' && draft) {
    return shell(
      <div className="tgc-center">
        <svg className="tgc-check" viewBox="0 0 84 84" aria-hidden="true">
          <circle cx="42" cy="42" r="42" />
          <path d="M26 43l11 11 21-23" />
        </svg>
        <h2>Saqlandi</h2>
        {draft.complete ? (
          <p>Hamma majburiy maydonlar to'ldirilgan. Yakunlangach arizani o'zgartirib bo'lmaydi: vazifa va invoys yaratiladi.</p>
        ) : (
          <>
            <p>Guruhdagi xabar yangilandi. Qolganini to'ldirish uchun qatorni bosing:</p>
            <ul className="tgc-missing">
              {draft.missing.map((m) => (
                <li key={m.path}>
                  <button type="button" className="tgc-picker" onClick={() => jumpToField(m.path)}>
                    <span className="tgc-option-text">
                      <span className="tgc-picker-value" lang="ru">{m.label}</span>
                      <small>{missingPlace(m)}</small>
                    </span>
                    <span className="tgc-pill">To'ldirish<Icon name="next" /></span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {formError && <div className="tgc-banner" role="alert">{formError}</div>}
        {draft.complete && (
          <button type="button" className="tgc-send" onClick={complete}>Yakunlash</button>
        )}
        <button type="button" className="tgc-ghost" onClick={() => setPhase('ready')}>Formaga qaytish</button>
        <button type="button" className="tgc-link" onClick={() => window.Telegram?.WebApp?.close()}>Yopish</button>
      </div>
    );
  }

  const sending = phase === 'sending';
  const c = context!;
  const currencySuffix = contract?.currency ?? null;
  const packagingTypes = c.packagingTypes ?? [];
  /** Sozlamalardagi Qadoq turlari; arizada saqlangan qiymat ro'yxatdan o'chirilgan bo'lsa ham ko'rinib tursin */
  const packagingOptionsFor = (current: string): string[] => (current && !packagingTypes.includes(current) ? [...packagingTypes, current] : packagingTypes);
  // Shartnoma tanlanmaguncha qolgan maydonlar ko'rinmaydi. Mijozda shartnoma bo'lmasa tanlash imkoni yo'q, forma ochiq.
  const contractChosen = contractId !== null || c.contracts.length === 0;
  const progress = requiredProgress(currentSnapshot(), c.branches.length > 0, c.contracts.length > 0);
  const remaining = progress.total - progress.done;
  const barText = !contractChosen
    ? 'Boshlash uchun shartnomani tanlang'
    : filledCount === 0
      ? "Kamida bitta maydonni to'ldiring"
      : remaining > 0
        ? `Yana ${remaining} ta majburiy maydon · saqlab qo'yish mumkin`
        : "Majburiy maydonlar to'ldirildi";

  const contractOptions: ChoiceOption[] = c.contracts.map((x) => ({
    value: String(x.id),
    text: x.contractNumber,
    sub: x.currency ? `${x.buyerName} · ${x.currency}` : x.buyerName,
  }));
  const textOptions = (values: string[]): ChoiceOption[] => values.map((v) => ({ value: v, text: v }));
  /** Shartnomadan keladigan variantli sarlavha maydoni */
  const headerChoice = (key: ManualKey, id: string, values: string[], placeholder: string, required: boolean, onPick: (value: string) => void) => (
    <ChoiceField
      id={id}
      anchor={`header.${key}`}
      label={HEADER_LABELS[key]}
      options={textOptions(values)}
      value={header[key]}
      required={required}
      error={fieldErrors[key]}
      onSelect={(v) => onPick(v ?? '')}
      manual={{
        active: manual[key],
        placeholder,
        onToggle: () => setManualFlag(key, !manual[key]),
        onType: (v) => setHeaderValue(key, v),
      }}
    />
  );

  return shell(
    <>
      <div className="tgc-wrap">
        <header className="tgc-top">
          <span className="tgc-logo"><img src="/logo.png" alt="Prodeklarant" /></span>
          <div>
            <h1 className="tgc-title">Yuk ma'lumoti</h1>
            <p className="tgc-client">{draft ? `${c.clientName} · Ariza № ${draft.id}` : c.clientName}</p>
          </div>
          <div className="tgc-progress">
            <div className="tgc-progress-text">
              <span>Majburiy maydonlar</span>
              <span>{progress.done} / {progress.total}</span>
            </div>
            <div className="tgc-progress-track" role="progressbar" aria-label="Majburiy maydonlar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
              <div style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          </div>
        </header>

        <Section step={1} title="Shartnoma" done={contractId !== null}>
          {c.contracts.length > 0 ? (
            <ChoiceField
              id="tgc-contract"
              anchor="contractId"
              label={HEADER_LABELS.contract}
              options={contractOptions}
              value={contractId === null ? '' : String(contractId)}
              required
              // Tanlangan shartnomani qayta bosish tanlovni bekor qilmaydi: aks holda to'ldirilgan maydonlar o'chib ketardi
              onSelect={(v) => {
                if (v !== null) changeContract(Number(v));
              }}
            />
          ) : (
            <p className="tgc-help">Mijozda shartnoma yo'q</p>
          )}
        </Section>

        {!contractChosen && (
          <div className="tgc-locked">
            <Icon name="lock" />
            <span>Avval yuqoridan shartnomani bosing. Keyingi qadamlar shundan so'ng ochiladi.</span>
          </div>
        )}

        {contractChosen && (
          <>
            <Section step={2} title="Hujjat va yo'nalish" done={header.deliveryTerms.trim() !== '' && header.customsPlace.trim() !== ''}>
              <TextField
                id="tgc-invoice"
                anchor="header.invoiceNumber"
                label={HEADER_LABELS.invoiceNumber}
                value={header.invoiceNumber}
                placeholder="Raqamni yozing"
                maxLength={50}
                error={fieldErrors.invoiceNumber}
                onChange={(v) => setHeaderValue('invoiceNumber', v)}
                hint={
                  contract && (
                    <p className="tgc-help">
                      {contract.lastInvoice ? (
                        <>
                          Oxirgi invoys: <b>№ {contract.lastInvoice.number}</b>
                          {formatDate(contract.lastInvoice.date) && ` (${formatDate(contract.lastInvoice.date)})`}
                        </>
                      ) : (
                        "Bu shartnoma bo'yicha hali invoys yo'q"
                      )}
                    </p>
                  )
                }
              />
              {headerChoice('deliveryTerms', 'tgc-terms', contract?.cities.map((x) => x.text) ?? [], 'DAP г. Москва', true, pickDeliveryTerms)}
              {headerChoice('customsPlace', 'tgc-customs', customsOptions, 'Manzilni yozing', true, (v) => pickHeader('customsPlace', v))}
              {headerChoice('destination', 'tgc-destination', contract?.destinations ?? [], 'Yuk tushirish joyini yozing', false, (v) => pickHeader('destination', v))}
            </Section>

            <Section step={3} title="Transport va jo'natish" done={branchId !== null}>
              <TextField
                id="tgc-plate"
                anchor="header.vehicleNumber"
                label={HEADER_LABELS.vehicleNumber}
                value={header.vehicleNumber}
                placeholder="40232BAA/402332BA"
                maxLength={40}
                plate
                error={fieldErrors.vehicleNumber}
                onChange={setVehicleNumber}
                onBlur={() => setPlateCyrillicWarning(false)}
                hint={
                  plateCyrillicWarning ? (
                    <p className="tgc-help tgc-help-warn" role="alert">Faqat lotin alifbosida yozing — kirill harflari qabul qilinmaydi</p>
                  ) : (
                    <p className="tgc-help">Faqat lotin harflarida</p>
                  )
                }
              />
              {c.branches.length > 0 && (
                <ChoiceField
                  id="tgc-branch"
                  anchor="branchId"
                  label={HEADER_LABELS.shipmentPlace}
                  options={c.branches.map((b) => ({ value: String(b.id), text: branchLabel(b.name), sub: b.place && b.place !== b.name ? branchLabel(b.place) : undefined, lang: 'uz' as const }))}
                  value={branchId === null ? '' : String(branchId)}
                  required
                  onSelect={(v) => setBranchId(v === null ? null : Number(v))}
                />
              )}
              <TextField id="tgc-order" anchor="header.orderNumber" label={HEADER_LABELS.orderNumber} value={header.orderNumber} placeholder="Bo'lsa yozing" maxLength={50} error={fieldErrors.orderNumber} onChange={(v) => setHeaderValue('orderNumber', v)} />
              <TextField id="tgc-temperature" anchor="header.temperature" label={HEADER_LABELS.temperature} value={header.temperature} placeholder="+2 C" maxLength={20} error={fieldErrors.temperature} onChange={(v) => setHeaderValue('temperature', v)} />
              <TextField id="tgc-sensor" anchor="header.sensorSerial" label={HEADER_LABELS.sensorSerial} value={header.sensorSerial} placeholder="Datchik raqami" maxLength={60} error={fieldErrors.sensorSerial} onChange={(v) => setHeaderValue('sensorSerial', v)} />
            </Section>

            {items.map((item, index) => {
              const errorKey = (field: ItemField | 'brutto') => `items.${item.uid}.${field}`;
              const inputId = (field: string) => `tgc-i${item.uid}-${field}`;
              const brutto = bruttoOf(item);
              const productOther = otherProducts.has(item.uid) || (item.product !== '' && !c.products.includes(item.product));
              /** Raqamli katak: id, belgi va xato kaliti tovar maydonidan hosil bo'ladi */
              const cell = (field: Exclude<ItemField, 'product' | 'packagingType'>, decimal: boolean, unit?: string) => ({
                id: inputId(field),
                required: REQUIRED_ITEM_FIELDS.includes(field),
                anchor: errorKey(field),
                label: ITEM_LABELS[field],
                value: item[field],
                decimal,
                unit,
                error: fieldErrors[errorKey(field)],
                onChange: (v: string) => updateItem(item.uid, { [field]: v }, errorKey(field)),
              });
              return (
                <Section
                  key={item.uid}
                  step={4 + index}
                  title={`Товар ${index + 1}`}
                  titleLang="ru"
                  done={item.product.trim() !== '' && item.boxCount !== '' && item.netto !== '' && brutto !== ''}
                  action={
                    items.length > 1 ? (
                      <button type="button" className="tgc-remove" onClick={() => removeItem(item.uid)}>
                        <Icon name="trash" />O'chirish
                      </button>
                    ) : null
                  }
                >
                  <ChoiceField
                    id={inputId('product')}
                    anchor={errorKey('product')}
                    label={ITEM_LABELS.product}
                    options={textOptions(c.products)}
                    value={item.product}
                    required
                    columns={2}
                    error={fieldErrors[errorKey('product')]}
                    onSelect={(v) => {
                      setProductOther(item.uid, false);
                      updateItem(item.uid, { product: v ?? '' }, errorKey('product'));
                    }}
                    manual={{
                      active: productOther,
                      placeholder: 'Masalan: Xurmo',
                      onToggle: () => {
                        setProductOther(item.uid, !productOther);
                        updateItem(item.uid, { product: '' }, errorKey('product'));
                      },
                      onType: (v) => {
                        // Yozilayotgan matn variant bilan mos kelib qolsa ham katak yopilib ketmasin
                        setProductOther(item.uid, true);
                        updateItem(item.uid, { product: v }, errorKey('product'));
                      },
                    }}
                  />
                  <NumberGroup id={inputId('boxes')} title="Ящики" cells={[cell('boxCount', false, 'шт.'), cell('boxWeight', true, 'кг')]} />
                  {packagingTypes.length > 0 && (
                    <ChoiceField
                      id={inputId('packaging')}
                      anchor={errorKey('packagingType')}
                      label={ITEM_LABELS.packagingType}
                      options={textOptions(packagingOptionsFor(item.packagingType))}
                      value={item.packagingType}
                      picker
                      error={fieldErrors[errorKey('packagingType')]}
                      onSelect={(v) => updateItem(item.uid, { packagingType: v ?? '' }, errorKey('packagingType'))}
                    />
                  )}
                  <NumberGroup id={inputId('pallets')} title="Поддоны" cells={[cell('palletCount', false, 'шт.'), cell('palletWeight', true, 'кг')]} />
                  <NumberGroup id={inputId('weight')} title="Вес и цена" cells={[cell('netto', true, 'кг'), cell('price', true, currencySuffix ?? undefined)]} />
                  <div className="tgc-field" data-field={errorKey('brutto')} data-invalid={!!fieldErrors[errorKey('brutto')]}>
                    <FieldHead
                      id={inputId('brutto')}
                      htmlFor={inputId('brutto')}
                      label={ITEM_LABELS.brutto}
                      required
                      filled={brutto !== ''}
                      help={item.bruttoOverride === null ? "O'zi hisoblanadi: Нетто + вес ящиков + вес поддонов" : "Qo'lda o'zgartirildi"}
                    />
                    <NumberBox id={inputId('brutto')} required decimal unit="кг" value={brutto} error={fieldErrors[errorKey('brutto')]} onChange={(v) => updateItem(item.uid, { bruttoOverride: v }, errorKey('brutto'))} />
                    {item.bruttoOverride !== null && (
                      <button type="button" className="tgc-secondary" onClick={() => updateItem(item.uid, { bruttoOverride: null }, errorKey('brutto'))}>
                        Qayta hisoblash
                      </button>
                    )}
                    <ErrorText error={fieldErrors[errorKey('brutto')]} />
                  </div>
                </Section>
              );
            })}

            {items.length < MAX_ITEMS && (
              <button type="button" className="tgc-add" onClick={addItem}>
                <Icon name="plus" />Yana tovar qo'shish
              </button>
            )}

            <div className="tgc-preview">
              <button type="button" className="tgc-toggle" aria-expanded={previewOpen} onClick={() => setPreviewOpen((v) => !v)}>
                <span>Guruhga ketadigan xabar</span>
                <span className="tgc-toggle-action">{previewOpen ? 'Yashirish' : "Ko'rish"}</span>
              </button>
              {previewOpen && <PreviewBubble model={preview} empty="Maydonlarni to'ldirsangiz, xabar shu yerda ko'rinadi." />}
            </div>
          </>
        )}
      </div>

      <div className="tgc-bar">
        <div className="tgc-bar-inner">
          {formError && <div className="tgc-banner" role="alert">{formError}</div>}
          {undo && (
            <div className="tgc-undo">
              <span role="status">{undo.kind === 'item' ? `Товар ${undo.index + 1} o'chirildi` : "Shartnoma almashdi, yo'nalish tozalandi"}</span>
              <button type="button" className="tgc-secondary" onClick={applyUndo}>Qaytarish</button>
            </div>
          )}
          <p className="tgc-bar-status" role="status">{barText}</p>
          <button type="button" className="tgc-send" disabled={sending || !contractChosen || filledCount === 0} onClick={save}>
            {sending ? 'Saqlanmoqda' : 'Saqlash'}
          </button>
        </div>
      </div>
    </>
  );
}
