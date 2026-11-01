import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { API_BASE_URL } from '../lib/api';
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
}

interface CargoContext {
  clientName: string;
  contracts: ContractInfo[];
  products: string[];
}

type FieldKey =
  | 'vehicleNumber'
  | 'city'
  | 'product'
  | 'boxCount'
  | 'boxWeight'
  | 'palletCount'
  | 'palletWeight'
  | 'netto'
  | 'price'
  | 'customs'
  | 'unloading';

type FormValues = Record<FieldKey, string>;
type ManualKey = 'city' | 'product' | 'customs' | 'unloading';
type ManualFlags = Record<ManualKey, boolean>;
type Scheme = 'light' | 'dark';

const EMPTY_VALUES: FormValues = {
  vehicleNumber: '',
  city: '',
  product: '',
  boxCount: '',
  boxWeight: '',
  palletCount: '',
  palletWeight: '',
  netto: '',
  price: '',
  customs: '',
  unloading: '',
};
const NO_MANUAL: ManualFlags = { city: false, product: false, customs: false, unloading: false };

const TELEGRAM_SDK_URL = 'https://telegram.org/js/telegram-web-app.js';
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap';
const CLOSE_DELAY_MS = 2200;
/** Sotib oluvchilar shundan ko'p bo'lsa chip o'rniga ro'yxat (select) ko'rsatiladi */
const MAX_BUYER_CHIPS = 8;
const SCHEME_COLORS: Record<Scheme, string> = { light: '#f0f5fb', dark: '#121212' };

/** Guruh xabaridagi tartib va nomlar (backend `client-cargo-form.ts` dagi CARGO_STEPS bilan bir xil bo'lishi kerak) */
type PreviewKey = FieldKey | 'buyer' | 'brutto';

const PREVIEW_ORDER: ReadonlyArray<{ key: PreviewKey; label: string }> = [
  { key: 'vehicleNumber', label: 'Avto nomer' },
  { key: 'buyer', label: 'Sotib oluvchi' },
  { key: 'city', label: 'Shahar' },
  { key: 'product', label: 'Mahsulot' },
  { key: 'boxCount', label: 'Yashik soni' },
  { key: 'boxWeight', label: "Yashiklar jami og'irligi" },
  { key: 'palletCount', label: 'Poddon soni' },
  { key: 'palletWeight', label: "Poddon jami og'irligi" },
  { key: 'netto', label: 'Netto' },
  { key: 'brutto', label: 'Brutto' },
  { key: 'price', label: 'Narxi' },
  { key: 'customs', label: 'Таможня' },
  { key: 'unloading', label: 'Выгрузка' },
];

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
const computeBrutto = (v: FormValues): string => {
  const parts = [v.netto, v.boxWeight, v.palletWeight];
  if (parts.every((p) => p.trim() === '')) return '';
  const sum = parts.reduce((acc, p) => acc + toNumber(p), 0);
  return String(Math.round(sum * 1000) / 1000);
};

/** Backend xabarga qanday yozsa, shunday ko'rsatamiz (avto nomer katta harfda, vergul nuqta bo'ladi) */
const previewValue = (key: PreviewKey, raw: string, currency: string | null): string => {
  const value = raw.trim();
  if (!value) return '';
  if (key === 'vehicleNumber') return value.replace(/\s+/g, '').toUpperCase();
  if (key === 'boxWeight' || key === 'palletWeight' || key === 'netto' || key === 'brutto') return value.replace(',', '.');
  if (key === 'price') return `${value.replace(',', '.')}${currency ? ` ${currency}` : ''}`;
  return value;
};

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

class ApiError extends Error {
  fieldErrors?: Partial<Record<string, string>>;
  constructor(message: string, fieldErrors?: Partial<Record<string, string>>) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

async function tgFetch<T>(path: string, initData: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/tg-cargo${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `tma ${initData}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string; errors?: Partial<Record<string, string>> } & T;
  if (!response.ok) throw new ApiError(json.error ?? 'Xatolik yuz berdi', json.errors);
  return json;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="tgc-section">
      <h2 className="tgc-section-title">{title}</h2>
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

function PreviewBubble({ rows, empty }: { rows: Array<{ label: string; value: string }>; empty: string }) {
  if (rows.length === 0) return <div className="tgc-bubble"><p className="tgc-bubble-empty">{empty}</p></div>;
  return (
    <div className="tgc-bubble">
      <div className="tgc-bubble-head">🚛 Yuk ma'lumoti</div>
      {rows.map((row) => (
        <div key={row.label}>
          {row.label}: <b>{row.value}</b>
        </div>
      ))}
    </div>
  );
}

type Phase = 'loading' | 'ready' | 'sending' | 'done' | 'fatal';

export default function TgCargo() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [fatalError, setFatalError] = useState('');
  const [context, setContext] = useState<CargoContext | null>(null);
  const [initData, setInitData] = useState('');
  const [scheme, setScheme] = useState<Scheme>(systemScheme);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [manual, setManual] = useState<ManualFlags>(NO_MANUAL);
  const [contractId, setContractId] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState('');
  const [bruttoOverride, setBruttoOverride] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [sentRows, setSentRows] = useState<Array<{ label: string; value: string }>>([]);

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
        setContext(ctx);
        setPhase('ready');
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
  }, []);

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

  const buyerLabel = useCallback(
    (c: ContractInfo) => {
      const sameName = context?.contracts.filter((x) => x.buyerName === c.buyerName).length ?? 0;
      return sameName > 1 ? `${c.buyerName} · №${c.contractNumber}` : c.buyerName;
    },
    [context]
  );

  const setValue = (key: FieldKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  /** Qo'lda yozish rejimini almashtirganda eski tanlov/matn tozalanadi */
  const setManualFlag = (key: ManualKey, flag: boolean) => {
    setManual((prev) => ({ ...prev, [key]: flag }));
    setValue(key, '');
  };
  const pick = (key: ManualKey, value: string) => {
    setManual((prev) => ({ ...prev, [key]: false }));
    setValue(key, value);
  };

  const changeBuyer = (id: number | null) => {
    setContractId(id);
    // Sotib oluvchi o'zgarsa, shartnomaga bog'liq tanlovlar eskirgan bo'ladi
    setValues((prev) => ({ ...prev, city: '', customs: '', unloading: '' }));
    setManual((prev) => ({ ...prev, city: false, customs: false, unloading: false }));
  };

  const pickCity = (city: string) => {
    pick('city', city);
    // Shartnomada shaharga bog'langan bojxona bo'lsa, shuni oldindan tanlab qo'yamiz (o'zgartirish mumkin)
    const paired = contract?.cities.find((c) => c.text === city)?.pairedCustoms;
    if (paired) pick('customs', paired);
  };

  const brutto = bruttoOverride ?? computeBrutto(values);

  const customsOptions = useMemo(() => {
    if (!contract) return [];
    const paired = contract.cities.find((c) => c.text === values.city)?.pairedCustoms;
    return paired ? [paired, ...contract.customs.filter((c) => c !== paired)] : contract.customs;
  }, [contract, values.city]);

  const previewRows = useMemo(
    () =>
      PREVIEW_ORDER.flatMap(({ key, label }) => {
        const raw = key === 'buyer' ? (contract?.buyerName ?? '') : key === 'brutto' ? brutto : values[key];
        const value = previewValue(key, raw, contract?.currency ?? null);
        return value ? [{ label, value }] : [];
      }),
    [values, brutto, contract]
  );

  const submit = async () => {
    setFormError('');
    setFieldErrors({});
    setPhase('sending');
    try {
      await tgFetch<{ ok: true }>('/submit', initData, { ...values, brutto, contractId });
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setSentRows(previewRows);
      setPhase('done');
      window.setTimeout(() => window.Telegram?.WebApp?.close(), CLOSE_DELAY_MS);
    } catch (e) {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors ?? {});
      setFormError(e instanceof Error ? e.message : "Yuborib bo'lmadi");
      setPhase('ready');
    }
  };

  const reset = () => {
    setValues(EMPTY_VALUES);
    setManual(NO_MANUAL);
    setContractId(null);
    setBruttoOverride(null);
    setFieldErrors({});
    setFormError('');
    setPhase('ready');
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
  if (phase === 'done') {
    return shell(
      <div className="tgc-center">
        <svg className="tgc-check" viewBox="0 0 84 84" aria-hidden="true">
          <circle cx="42" cy="42" r="42" />
          <path d="M26 43l11 11 21-23" />
        </svg>
        <h2>Guruhga yuborildi</h2>
        <div className="tgc-sent">
          <PreviewBubble rows={sentRows} empty="" />
        </div>
        <button type="button" className="tgc-ghost" onClick={reset}>Yana bitta kiritish</button>
      </div>
    );
  }

  const sending = phase === 'sending';
  const c = context!;
  const currencySuffix = contract?.currency ?? null;
  // Sotib oluvchi tanlanmaguncha qolgan maydonlar ko'rinmaydi. Mijozda shartnoma bo'lmasa tanlash imkoni yo'q, forma ochiq.
  const buyerChosen = contractId !== null || c.contracts.length === 0;

  return shell(
    <>
      <div className="tgc-wrap">
        <h1 className="tgc-title">Yuk ma'lumoti</h1>
        <p className="tgc-client">{c.clientName}</p>

        <Section title="Sotib oluvchi">
          {c.contracts.length > MAX_BUYER_CHIPS ? (
            <select
              className="tgc-input tgc-select"
              aria-label="Sotib oluvchi"
              value={contractId ?? ''}
              onChange={(e) => changeBuyer(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sotib oluvchini tanlang</option>
              {c.contracts.map((x) => (
                <option key={x.id} value={x.id}>{buyerLabel(x)}</option>
              ))}
            </select>
          ) : (
            <div className="tgc-chips" role="group" aria-label="Sotib oluvchi">
              {c.contracts.length === 0 && <span className="tgc-bubble-empty">Mijozda shartnoma yo'q</span>}
              {c.contracts.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className="tgc-chip"
                  aria-pressed={contractId === x.id}
                  onClick={() => changeBuyer(x.id)}
                >
                  {buyerLabel(x)}
                </button>
              ))}
            </div>
          )}
          {!buyerChosen && <p className="tgc-hint">Qolgan maydonlar sotib oluvchini tanlagandan keyin ochiladi.</p>}
        </Section>

        {buyerChosen && (
          <>
            <Section title="Mashina va yo'nalish">
              <Field label="Avto nomer" htmlFor="tgc-plate" error={fieldErrors.vehicleNumber}>
                <input
                  id="tgc-plate"
                  className="tgc-input tgc-plate"
                  type="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={40}
                  value={values.vehicleNumber}
                  placeholder="40232BAA/402332BA"
                  aria-invalid={!!fieldErrors.vehicleNumber}
                  onChange={(e) => setValue('vehicleNumber', e.target.value)}
                />
              </Field>

              <ChoiceField
                id="tgc-city"
                label="Qaysi shahar"
                options={contract?.cities.map((x) => x.text) ?? []}
                value={values.city}
                manual={manual.city}
                placeholder="Shahar nomini yozing"
                error={fieldErrors.city}
                onPick={pickCity}
                onType={(v) => setValue('city', v)}
                onManual={(flag) => setManualFlag('city', flag)}
              />
            </Section>

            <Section title="Mahsulot">
              <ChoiceField
                id="tgc-product"
                label="Mahsulot nomi"
                options={c.products}
                value={values.product}
                manual={manual.product}
                alwaysInput
                placeholder="Masalan: Xurmo"
                error={fieldErrors.product}
                onPick={(v) => pick('product', v)}
                onType={(v) => setValue('product', v)}
                onManual={(flag) => setManualFlag('product', flag)}
              />
            </Section>

            <Section title="Yuk hajmi">
              <div className="tgc-grid">
                <NumberField id="tgc-box-count" label="Yashik soni" value={values.boxCount} error={fieldErrors.boxCount} onChange={(v) => setValue('boxCount', v)} />
                <NumberField id="tgc-box-weight" label="Yashiklar jami og'irligi" decimal value={values.boxWeight} error={fieldErrors.boxWeight} onChange={(v) => setValue('boxWeight', v)} />
                <NumberField id="tgc-pallet-count" label="Poddon soni" value={values.palletCount} error={fieldErrors.palletCount} onChange={(v) => setValue('palletCount', v)} />
                <NumberField id="tgc-pallet-weight" label="Poddon jami og'irligi" decimal value={values.palletWeight} error={fieldErrors.palletWeight} onChange={(v) => setValue('palletWeight', v)} />
                <NumberField id="tgc-netto" label="Netto" decimal value={values.netto} error={fieldErrors.netto} onChange={(v) => setValue('netto', v)} />
                <NumberField id="tgc-price" label="Narxi" decimal suffix={currencySuffix} value={values.price} error={fieldErrors.price} onChange={(v) => setValue('price', v)} />
                <div className="tgc-span2">
                  <NumberField
                    id="tgc-brutto"
                    label="Brutto"
                    decimal
                    value={brutto}
                    error={fieldErrors.brutto}
                    onChange={(v) => {
                      setBruttoOverride(v === '' ? null : v);
                      setFieldErrors((prev) => ({ ...prev, brutto: undefined }));
                    }}
                    hint={
                      <p className="tgc-hint">
                        {bruttoOverride === null ? "Netto + yashiklar + poddon og'irligi. Kerak bo'lsa o'zgartiring." : "Qo'lda o'zgartirildi. "}
                        {bruttoOverride !== null && (
                          <button type="button" className="tgc-link" onClick={() => setBruttoOverride(null)}>
                            Qayta hisoblash
                          </button>
                        )}
                      </p>
                    }
                  />
                </div>
              </div>
            </Section>

            <Section title="Bojxona va tushirish">
              <ChoiceField
                id="tgc-customs"
                label="Таможня"
                options={customsOptions}
                value={values.customs}
                manual={manual.customs}
                placeholder="Таможня manzilini yozing"
                error={fieldErrors.customs}
                onPick={(v) => pick('customs', v)}
                onType={(v) => setValue('customs', v)}
                onManual={(flag) => setManualFlag('customs', flag)}
              />
              <ChoiceField
                id="tgc-unloading"
                label="Выгрузка"
                options={contract?.destinations ?? []}
                value={values.unloading}
                manual={manual.unloading}
                placeholder="Yuk tushirish joyini yozing"
                error={fieldErrors.unloading}
                onPick={(v) => pick('unloading', v)}
                onType={(v) => setValue('unloading', v)}
                onManual={(flag) => setManualFlag('unloading', flag)}
              />
            </Section>

            <section className="tgc-section" aria-live="polite">
              <h2 className="tgc-section-title">Guruhga shunday ketadi</h2>
              <PreviewBubble rows={previewRows} empty="Maydonlarni to'ldirsangiz, xabar shu yerda ko'rinadi." />
            </section>
          </>
        )}
      </div>

      {buyerChosen && (
        <div className={keyboardOpen ? 'tgc-bar tgc-bar-hidden' : 'tgc-bar'}>
          <div className="tgc-bar-inner">
            {formError && <div className="tgc-banner" role="alert">{formError}</div>}
            <button type="button" className="tgc-send" disabled={sending || previewRows.length === 0} onClick={submit}>
              {sending ? 'Yuborilmoqda' : 'Guruhga yuborish'}
              {!sending && previewRows.length > 0 && <span className="tgc-count">{previewRows.length}</span>}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
