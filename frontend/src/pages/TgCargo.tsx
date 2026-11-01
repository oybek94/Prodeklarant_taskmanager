import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { API_BASE_URL } from '../lib/api';
import { buildPatch, deriveManualFlags, makeUid, snapshotFromDraft, stripCyrillic, totalsLine, type DraftView, type FormSnapshot, type SnapshotItem } from './tgCargoDraft';
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
const CLOSE_DELAY_MS = 2200;
/** Shartnomalar shundan ko'p bo'lsa chip o'rniga ro'yxat (select) ko'rsatiladi */
const MAX_CONTRACT_CHIPS = 8;
const MAX_ITEMS = 20;
const SCHEME_COLORS: Record<Scheme, string> = { light: '#f0f5fb', dark: '#121212' };

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

const sanitizeCount = (v: string) => v.replace(/\D/g, '');
/** Faqat raqam va bitta ajratuvchi (nuqta yoki vergul) */
const sanitizeDecimal = (v: string) => {
  const cleaned = v.replace(/[^\d.,]/g, '');
  const sepIndex = cleaned.search(/[.,]/);
  if (sepIndex === -1) return cleaned;
  return cleaned.slice(0, sepIndex + 1) + cleaned.slice(sepIndex + 1).replace(/[.,]/g, '');
};

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

/** 2026-10-12T... → 12.10.2026 */
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const contractLabel = (c: ContractInfo) => `${c.contractNumber} · ${c.buyerName}`;

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

async function tgFetch<T>(path: string, initData: string, body?: unknown, method?: 'POST' | 'PATCH'): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/tg-cargo${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { Authorization: `tma ${initData}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string; errors?: FieldErrors } & T;
  if (!response.ok) throw new ApiError(json.error ?? 'Xatolik yuz berdi', json.errors, response.status);
  return json;
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="tgc-section">
      <div className="tgc-section-head">
        <h2 className="tgc-section-title">{title}</h2>
        {action}
      </div>
      <div className="tgc-group">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="tgc-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <p className="tgc-error" role="alert">{error}</p>}
    </div>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  maxLength?: number;
  plate?: boolean;
  hint?: ReactNode;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

function TextField({ id, label, value, placeholder, error, maxLength = 200, plate, hint, onChange, onBlur }: TextFieldProps) {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <input
        id={id}
        className={plate ? 'tgc-input tgc-plate' : 'tgc-input'}
        type="text"
        autoCapitalize={plate ? 'characters' : 'sentences'}
        autoComplete="off"
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {hint}
    </Field>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  decimal?: boolean;
  suffix?: string | null;
  hint?: ReactNode;
  onChange: (value: string) => void;
}

function NumberField({ id, label, value, error, decimal, suffix, hint, onChange }: NumberFieldProps) {
  const input = (
    <input
      id={id}
      className="tgc-input tgc-num"
      inputMode={decimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={value}
      aria-invalid={!!error}
      onChange={(e) => onChange(decimal ? sanitizeDecimal(e.target.value) : sanitizeCount(e.target.value))}
    />
  );
  return (
    <Field label={label} htmlFor={id} error={error}>
      {suffix ? (
        <div className="tgc-suffixed">
          {input}
          <span className="tgc-suffix">{suffix}</span>
        </div>
      ) : (
        input
      )}
      {hint}
    </Field>
  );
}

interface ChipGroupProps {
  id: string;
  label: string;
  options: Array<{ value: string; text: string }>;
  selected: string | null;
  /** Qayta bosilganda tanlov bekor bo'ladi */
  onSelect: (value: string | null) => void;
}

function ChipGroup({ id, label, options, selected, onSelect }: ChipGroupProps) {
  return (
    <div role="group" aria-labelledby={`${id}-label`}>
      <span className="tgc-label" id={`${id}-label`}>{label}</span>
      <div className="tgc-chips">
        {options.map((o) => (
          <button key={o.value} type="button" className="tgc-chip" aria-pressed={selected === o.value} onClick={() => onSelect(selected === o.value ? null : o.value)}>
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ChoiceFieldProps {
  id: string;
  label: string;
  options: string[];
  value: string;
  manual: boolean;
  placeholder: string;
  error?: string;
  /** Mahsulot kabi maydonlarda yozish maydoni doim ko'rinadi, variantlar esa tezkor tanlov */
  alwaysInput?: boolean;
  onPick: (value: string) => void;
  onType: (value: string) => void;
  onManual: (manual: boolean) => void;
}

/** Variantlar bir bosishda tanlanadi (chip); ro'yxatda yo'q bo'lsa "Boshqa" orqali yoziladi */
function ChoiceField({ id, label, options, value, manual, placeholder, error, alwaysInput, onPick, onType, onManual }: ChoiceFieldProps) {
  const showInput = alwaysInput || manual || options.length === 0;
  return (
    <div role="group" aria-labelledby={`${id}-label`}>
      <span className="tgc-label" id={`${id}-label`}>{label}</span>
      {options.length > 0 && (
        <div className="tgc-chips">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="tgc-chip"
              aria-pressed={!manual && value === option}
              onClick={() => onPick(!manual && value === option ? '' : option)}
            >
              {option}
            </button>
          ))}
          {!alwaysInput && (
            <button type="button" className="tgc-chip tgc-chip-other" aria-pressed={manual} onClick={() => onManual(!manual)}>
              Boshqa
            </button>
          )}
        </div>
      )}
      {showInput && (
        <input
          id={id}
          className="tgc-input"
          type="text"
          autoComplete="off"
          maxLength={200}
          value={value}
          placeholder={placeholder}
          aria-labelledby={`${id}-label`}
          aria-invalid={!!error}
          onChange={(e) => onType(e.target.value)}
        />
      )}
      {error && <p className="tgc-error" role="alert">{error}</p>}
    </div>
  );
}

function PreviewBubble({ model, empty }: { model: PreviewModel; empty: string }) {
  if (previewCount(model) === 0) return <div className="tgc-bubble"><p className="tgc-bubble-empty">{empty}</p></div>;
  return (
    <div className="tgc-bubble">
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

export default function TgCargo() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [fatalError, setFatalError] = useState('');
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
  const baseRef = useRef<FormSnapshot>(initialSnapshot);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [plateCyrillicWarning, setPlateCyrillicWarning] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /** Saqlangan holatni (server javobini) formaga to'ldiradi va solishtirish bazasini yangilaydi */
  const adoptDraft = useCallback((view: DraftView, contracts: ContractInfo[]) => {
    const snapshot = snapshotFromDraft(view);
    baseRef.current = snapshot;
    setDraft(view);
    setHeader(snapshot.header);
    setContractId(snapshot.contractId);
    setBranchId(snapshot.branchId);
    setManual(deriveManualFlags(snapshot.header, contracts.find((c) => c.id === snapshot.contractId) ?? null));
    setItems(snapshot.items.map(itemStateOf));
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
  }, [adoptDraft]);

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

  const changeContract = (id: number | null) => {
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
  const addItem = () => {
    setItems((prev) => (prev.length >= MAX_ITEMS ? prev : [...prev, newItem(makeUid())]));
  };
  const removeItem = (uid: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.uid !== uid) : prev));
    // Xato kaliti tovar uid'iga bog'langan: o'chirilgan tovarning xatolari tushib qoladi
    setFieldErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`items.${uid}.`))));
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

  const showError = (e: unknown, fallback: string) => {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    if (e instanceof ApiError) setFieldErrors(e.fieldErrors ?? {});
    setFormError(e instanceof Error ? e.message : fallback);
    setPhase('ready');
    // Birinchi xatoli maydonga o'tamiz
    window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.scrollIntoView({ block: 'center' }), 100);
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
      const patch = buildPatch(baseRef.current, currentSnapshot());
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


  const isEditable = (el: EventTarget) => el instanceof HTMLElement && el.matches('input, select, textarea');
  const shell = (children: ReactNode) => (
    <div
      ref={rootRef}
      className="tgc"
      data-theme={scheme}
      onFocusCapture={(e) => {
        if (!isEditable(e.target)) return;
        // Klaviatura ochilganda pastdagi tugma yozilayotgan maydonni yopib qo'ymasin
        setKeyboardOpen(true);
        const el = e.target as HTMLElement;
        window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320);
      }}
      onBlurCapture={() => {
        window.setTimeout(() => {
          if (!isEditable(document.activeElement ?? document.body)) setKeyboardOpen(false);
        }, 150);
      }}
    >
      {children}
    </div>
  );

  const contractOptions = useCallback(
    () => (context?.contracts ?? []).map((c) => ({ value: String(c.id), text: contractLabel(c) })),
    [context]
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
          <p>Hamma majburiy maydonlar to'ldirilgan. Yakunlaysizmi?</p>
        ) : (
          <>
            <p>Guruhdagi xabar yangilandi. Majburiy maydonlardan hali to'ldirilmaganlari:</p>
            <ul className="tgc-missing">
              {draft.missing.map((m) => (
                <li key={m.path}>{m.itemNumber === null ? m.label : `Товар ${m.itemNumber}: ${m.label}`}</li>
              ))}
            </ul>
          </>
        )}
        {formError && <div className="tgc-banner" role="alert">{formError}</div>}
        {draft.complete && (
          <button type="button" className="tgc-send" onClick={complete}>✅ Yakunlash</button>
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

  return shell(
    <>
      <div className="tgc-wrap">
        <img className="tgc-logo" src="/logo.png" alt="Prodeklarant" />
        <h1 className="tgc-title">Yuk ma'lumoti</h1>
        <p className="tgc-client">{c.clientName}</p>
        {draft && draft.missing.length > 0 && (
          <p className="tgc-hint" role="status">
            Ariza № {draft.id}: majburiy maydonlardan {draft.missing.length} tasi hali to'ldirilmagan.
          </p>
        )}

        <Section title="Shartnoma">
          {c.contracts.length > MAX_CONTRACT_CHIPS ? (
            <select
              className="tgc-input tgc-select"
              aria-label="Shartnoma"
              value={contractId ?? ''}
              onChange={(e) => changeContract(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Shartnomani tanlang</option>
              {c.contracts.map((x) => (
                <option key={x.id} value={x.id}>{contractLabel(x)}</option>
              ))}
            </select>
          ) : c.contracts.length > 0 ? (
            <ChipGroup
              id="tgc-contract"
              label="Контракт"
              options={contractOptions()}
              selected={contractId === null ? null : String(contractId)}
              onSelect={(v) => changeContract(v === null ? null : Number(v))}
            />
          ) : (
            <p className="tgc-hint">Mijozda shartnoma yo'q</p>
          )}
          {!contractChosen && <p className="tgc-hint">Qolgan maydonlar shartnomani tanlagandan keyin ochiladi.</p>}
        </Section>

        {contractChosen && (
          <>
            <Section title="Hujjat va yo'nalish">
              <TextField
                id="tgc-invoice"
                label={HEADER_LABELS.invoiceNumber}
                value={header.invoiceNumber}
                maxLength={50}
                error={fieldErrors.invoiceNumber}
                onChange={(v) => setHeaderValue('invoiceNumber', v)}
                hint={
                  contract && (
                    <p className="tgc-hint">
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
              <ChoiceField
                id="tgc-terms"
                label={HEADER_LABELS.deliveryTerms}
                options={contract?.cities.map((x) => x.text) ?? []}
                value={header.deliveryTerms}
                manual={manual.deliveryTerms}
                placeholder="DAP г. Москва"
                error={fieldErrors.deliveryTerms}
                onPick={pickDeliveryTerms}
                onType={(v) => setHeaderValue('deliveryTerms', v)}
                onManual={(flag) => setManualFlag('deliveryTerms', flag)}
              />
              <ChoiceField
                id="tgc-customs"
                label={HEADER_LABELS.customsPlace}
                options={customsOptions}
                value={header.customsPlace}
                manual={manual.customsPlace}
                placeholder="Manzilni yozing"
                error={fieldErrors.customsPlace}
                onPick={(v) => pickHeader('customsPlace', v)}
                onType={(v) => setHeaderValue('customsPlace', v)}
                onManual={(flag) => setManualFlag('customsPlace', flag)}
              />
              <ChoiceField
                id="tgc-destination"
                label={HEADER_LABELS.destination}
                options={contract?.destinations ?? []}
                value={header.destination}
                manual={manual.destination}
                placeholder="Yuk tushirish joyini yozing"
                error={fieldErrors.destination}
                onPick={(v) => pickHeader('destination', v)}
                onType={(v) => setHeaderValue('destination', v)}
                onManual={(flag) => setManualFlag('destination', flag)}
              />
            </Section>

            <Section title="Transport va jo'natish">
              <TextField
                id="tgc-plate"
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
                    <p className="tgc-hint tgc-hint-warn" role="alert">Faqat lotin alifbosida yozing — kirill harflari qabul qilinmaydi</p>
                  ) : (
                    <p className="tgc-hint">Faqat lotin harflarida</p>
                  )
                }
              />
              {c.branches.length > 0 && (
                <ChipGroup
                  id="tgc-branch"
                  label={HEADER_LABELS.shipmentPlace}
                  options={c.branches.map((b) => ({ value: String(b.id), text: b.name }))}
                  selected={branchId === null ? null : String(branchId)}
                  onSelect={(v) => setBranchId(v === null ? null : Number(v))}
                />
              )}
              <TextField
                id="tgc-order"
                label={HEADER_LABELS.orderNumber}
                value={header.orderNumber}
                maxLength={50}
                error={fieldErrors.orderNumber}
                onChange={(v) => setHeaderValue('orderNumber', v)}
              />
              <TextField
                id="tgc-temperature"
                label={HEADER_LABELS.temperature}
                value={header.temperature}
                placeholder="+2 C"
                maxLength={20}
                error={fieldErrors.temperature}
                onChange={(v) => setHeaderValue('temperature', v)}
              />
              <TextField
                id="tgc-sensor"
                label={HEADER_LABELS.sensorSerial}
                value={header.sensorSerial}
                maxLength={60}
                error={fieldErrors.sensorSerial}
                onChange={(v) => setHeaderValue('sensorSerial', v)}
              />
            </Section>

            {items.map((item, index) => {
              const errorKey = (field: string) => `items.${item.uid}.${field}`;
              const brutto = bruttoOf(item);
              return (
                <Section
                  key={item.uid}
                  title={`Товар ${index + 1}`}
                  action={
                    items.length > 1 ? (
                      <button type="button" className="tgc-remove" onClick={() => removeItem(item.uid)}>
                        Olib tashlash
                      </button>
                    ) : null
                  }
                >
                  <ChoiceField
                    id={`tgc-i${item.uid}-product`}
                    label={ITEM_LABELS.product}
                    options={c.products}
                    value={item.product}
                    manual={false}
                    alwaysInput
                    placeholder="Masalan: Xurmo"
                    error={fieldErrors[errorKey('product')]}
                    onPick={(v) => updateItem(item.uid, { product: v }, errorKey('product'))}
                    onType={(v) => updateItem(item.uid, { product: v }, errorKey('product'))}
                    onManual={() => undefined}
                  />
                  <div className="tgc-grid">
                    <NumberField id={`tgc-i${item.uid}-box-count`} label={ITEM_LABELS.boxCount} value={item.boxCount} error={fieldErrors[errorKey('boxCount')]} onChange={(v) => updateItem(item.uid, { boxCount: v }, errorKey('boxCount'))} />
                    <NumberField id={`tgc-i${item.uid}-box-weight`} label={ITEM_LABELS.boxWeight} decimal value={item.boxWeight} error={fieldErrors[errorKey('boxWeight')]} onChange={(v) => updateItem(item.uid, { boxWeight: v }, errorKey('boxWeight'))} />
                    {packagingTypes.length > 0 && (
                      <div className="tgc-span2">
                        {packagingOptionsFor(item.packagingType).length > MAX_CONTRACT_CHIPS ? (
                          <Field label={ITEM_LABELS.packagingType} htmlFor={`tgc-i${item.uid}-packaging`} error={fieldErrors[errorKey('packagingType')]}>
                            <select
                              id={`tgc-i${item.uid}-packaging`}
                              className="tgc-input tgc-select"
                              value={item.packagingType}
                              onChange={(e) => updateItem(item.uid, { packagingType: e.target.value }, errorKey('packagingType'))}
                            >
                              <option value="">Tanlang</option>
                              {packagingOptionsFor(item.packagingType).map((name) => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </Field>
                        ) : (
                          <ChipGroup
                            id={`tgc-i${item.uid}-packaging`}
                            label={ITEM_LABELS.packagingType}
                            options={packagingOptionsFor(item.packagingType).map((name) => ({ value: name, text: name }))}
                            selected={item.packagingType || null}
                            onSelect={(v) => updateItem(item.uid, { packagingType: v ?? '' }, errorKey('packagingType'))}
                          />
                        )}
                      </div>
                    )}
                    <NumberField id={`tgc-i${item.uid}-pallet-count`} label={ITEM_LABELS.palletCount} value={item.palletCount} error={fieldErrors[errorKey('palletCount')]} onChange={(v) => updateItem(item.uid, { palletCount: v }, errorKey('palletCount'))} />
                    <NumberField id={`tgc-i${item.uid}-pallet-weight`} label={ITEM_LABELS.palletWeight} decimal value={item.palletWeight} error={fieldErrors[errorKey('palletWeight')]} onChange={(v) => updateItem(item.uid, { palletWeight: v }, errorKey('palletWeight'))} />
                    <NumberField id={`tgc-i${item.uid}-netto`} label={ITEM_LABELS.netto} decimal value={item.netto} error={fieldErrors[errorKey('netto')]} onChange={(v) => updateItem(item.uid, { netto: v }, errorKey('netto'))} />
                    <NumberField id={`tgc-i${item.uid}-price`} label={ITEM_LABELS.price} decimal suffix={currencySuffix} value={item.price} error={fieldErrors[errorKey('price')]} onChange={(v) => updateItem(item.uid, { price: v }, errorKey('price'))} />
                    <div className="tgc-span2">
                      <NumberField
                        id={`tgc-i${item.uid}-brutto`}
                        label={ITEM_LABELS.brutto}
                        decimal
                        value={brutto}
                        error={fieldErrors[errorKey('brutto')]}
                        onChange={(v) => updateItem(item.uid, { bruttoOverride: v }, errorKey('brutto'))}
                        hint={
                          <p className="tgc-hint">
                            {item.bruttoOverride === null ? "Нетто + вес ящиков + вес поддонов. Kerak bo'lsa o'zgartiring." : "Qo'lda o'zgartirildi. "}
                            {item.bruttoOverride !== null && (
                              <button type="button" className="tgc-link" onClick={() => updateItem(item.uid, { bruttoOverride: null })}>
                                Qayta hisoblash
                              </button>
                            )}
                          </p>
                        }
                      />
                    </div>
                  </div>
                </Section>
              );
            })}

            {items.length < MAX_ITEMS && (
              <button type="button" className="tgc-add" onClick={addItem}>
                + Tovar qo'shish
              </button>
            )}

            <section className="tgc-section" aria-live="polite">
              <h2 className="tgc-section-title">Guruhga shunday ketadi</h2>
              <PreviewBubble model={preview} empty="Maydonlarni to'ldirsangiz, xabar shu yerda ko'rinadi." />
            </section>
          </>
        )}
      </div>

      {contractChosen && (
        <div className={keyboardOpen ? 'tgc-bar tgc-bar-hidden' : 'tgc-bar'}>
          <div className="tgc-bar-inner">
            {formError && <div className="tgc-banner" role="alert">{formError}</div>}
            <button type="button" className="tgc-send" disabled={sending || filledCount === 0} onClick={save}>
              {sending ? 'Saqlanmoqda' : 'Saqlash'}
              {!sending && filledCount > 0 && <span className="tgc-count">{filledCount}</span>}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
