import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { API_BASE_URL } from '../lib/api';

// Telegram Mini App: yuk ma'lumotlari formasi. Guruhdagi "Formani ochish" tugmasi orqali ochiladi.
// Auth: Telegram initData (Authorization: tma ...) — backend imzoni va guruh a'zoligini tekshiradi.
// Bu sahifa asosiy ilovaning login/Layout tizimidan tashqarida; shuning uchun lib/api (JWT) ishlatilmaydi.

interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  close: () => void;
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
type ManualFlags = Record<'city' | 'product' | 'customs' | 'unloading', boolean>;

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
const MANUAL = '__manual__';

const TELEGRAM_SDK_URL = 'https://telegram.org/js/telegram-web-app.js';
const CLOSE_DELAY_MS = 1200;

const sanitizeCount = (v: string) => v.replace(/\D/g, '');
/** Faqat raqam va bitta ajratuvchi (nuqta yoki vergul) */
const sanitizeDecimal = (v: string) => {
  const cleaned = v.replace(/[^\d.,]/g, '');
  const sepIndex = cleaned.search(/[.,]/);
  if (sepIndex === -1) return cleaned;
  return cleaned.slice(0, sepIndex + 1) + cleaned.slice(sepIndex + 1).replace(/[.,]/g, '');
};

/** SDK yuklanmagan bo'lsa initData Telegram bergan URL hash'idan olinadi */
const readInitData = (): string => {
  const fromSdk = window.Telegram?.WebApp?.initData;
  if (fromSdk) return fromSdk;
  return new URLSearchParams(window.location.hash.slice(1)).get('tgWebAppData') ?? '';
};

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

const TH = {
  bg: 'var(--tg-theme-bg-color, #ffffff)',
  text: 'var(--tg-theme-text-color, #111827)',
  hint: 'var(--tg-theme-hint-color, #6b7280)',
  field: 'var(--tg-theme-secondary-bg-color, #f3f4f6)',
  button: 'var(--tg-theme-button-color, #2481cc)',
  buttonText: 'var(--tg-theme-button-text-color, #ffffff)',
  danger: '#dc2626',
};

const inputStyle = { background: TH.field, color: TH.text } as const;
const inputClass = 'w-full h-12 rounded-xl px-3.5 text-base outline-none border border-transparent focus:border-[var(--tg-theme-button-color,#2481cc)]';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium" style={{ color: TH.hint }}>{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px]" style={{ color: TH.danger }}>{error}</span>}
    </label>
  );
}

interface ChoiceFieldProps {
  label: string;
  options: string[];
  value: string;
  manual: boolean;
  placeholder: string;
  error?: string;
  onSelect: (value: string) => void;
  /** "Boshqa" tanlanganda (true) yoki ro'yxatdan variant tanlanganda (false) chaqiriladi */
  onManualChange: (manual: boolean) => void;
}

/** Ro'yxatdan tanlash yoki o'zi yozish. Variantlar bo'lmasa to'g'ridan-to'g'ri matn maydoni. */
function ChoiceField({ label, options, value, manual, placeholder, error, onSelect, onManualChange }: ChoiceFieldProps) {
  const hasOptions = options.length > 0;
  const showInput = !hasOptions || manual;
  return (
    <Field label={label} error={error}>
      <div className="space-y-2">
        {hasOptions && (
          <select
            className={inputClass}
            style={inputStyle}
            value={manual ? MANUAL : value}
            onChange={(e) => {
              if (e.target.value === MANUAL) {
                onManualChange(true);
                return;
              }
              if (manual) onManualChange(false);
              onSelect(e.target.value);
            }}
          >
            <option value="">— tanlanmagan —</option>
            {options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
            <option value={MANUAL}>✏️ Boshqa (o'zim yozaman)</option>
          </select>
        )}
        {showInput && (
          <input
            className={inputClass}
            style={inputStyle}
            type="text"
            value={value}
            maxLength={200}
            placeholder={placeholder}
            onChange={(e) => onSelect(e.target.value)}
          />
        )}
      </div>
    </Field>
  );
}

type Phase = 'loading' | 'ready' | 'sending' | 'done' | 'fatal';

export default function TgCargo() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [fatalError, setFatalError] = useState('');
  const [context, setContext] = useState<CargoContext | null>(null);
  const [initData, setInitData] = useState('');
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [manual, setManual] = useState<ManualFlags>(NO_MANUAL);
  const [contractId, setContractId] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadTelegramSdk();
      if (cancelled) return;
      const webApp = window.Telegram?.WebApp;
      webApp?.ready();
      webApp?.expand();
      const data = readInitData();
      if (!data) {
        setFatalError('Bu forma Telegram ichida, guruhdagi «Formani ochish» tugmasi orqali ochiladi.');
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
        setFatalError(e instanceof Error ? e.message : 'Yuklab bo\'lmadi');
        setPhase('fatal');
      }
    })();
    return () => {
      cancelled = true;
    };
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
  /** Qo'lda yozish rejimiga o'tganda eski tanlov tozalanadi */
  const setManualFlag = (key: keyof ManualFlags, flag: boolean) => {
    setManual((prev) => ({ ...prev, [key]: flag }));
    if (flag) setValue(key, '');
  };

  const changeBuyer = (rawId: string) => {
    const id = rawId ? Number(rawId) : null;
    setContractId(id);
    // Sotib oluvchi o'zgarsa, shartnomaga bog'liq tanlovlar eskirgan bo'ladi
    setValues((prev) => ({ ...prev, city: '', customs: '', unloading: '' }));
    setManual((prev) => ({ ...prev, city: false, customs: false, unloading: false }));
  };

  const changeCity = (city: string) => {
    setValue('city', city);
    // Shartnomada shaharga bog'langan bojxona bo'lsa, shuni oldindan tanlab qo'yamiz (o'zgartirish mumkin)
    const paired = contract?.cities.find((c) => c.text === city)?.pairedCustoms;
    if (paired) {
      setManual((prev) => ({ ...prev, customs: false }));
      setValue('customs', paired);
    }
  };

  const customsOptions = useMemo(() => {
    if (!contract) return [];
    const paired = contract.cities.find((c) => c.text === values.city)?.pairedCustoms;
    return paired ? [paired, ...contract.customs.filter((c) => c !== paired)] : contract.customs;
  }, [contract, values.city]);

  const filledCount = Object.values(values).filter((v) => v.trim() !== '').length + (contractId ? 1 : 0);

  const submit = async () => {
    setFormError('');
    setFieldErrors({});
    setPhase('sending');
    try {
      await tgFetch<{ ok: true }>('/submit', initData, { ...values, contractId });
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setPhase('done');
      window.setTimeout(() => window.Telegram?.WebApp?.close(), CLOSE_DELAY_MS);
    } catch (e) {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors ?? {});
      setFormError(e instanceof Error ? e.message : 'Yuborib bo\'lmadi');
      setPhase('ready');
    }
  };

  const reset = () => {
    setValues(EMPTY_VALUES);
    setManual(NO_MANUAL);
    setContractId(null);
    setFieldErrors({});
    setFormError('');
    setPhase('ready');
  };

  const page = (children: ReactNode) => (
    <div className="min-h-screen" style={{ background: TH.bg, color: TH.text }}>{children}</div>
  );

  if (phase === 'loading') {
    return page(<div className="flex min-h-screen items-center justify-center text-sm" style={{ color: TH.hint }}>Yuklanmoqda...</div>);
  }
  if (phase === 'fatal') {
    return page(<div className="flex min-h-screen items-center justify-center px-6 text-center text-base">{fatalError}</div>);
  }
  if (phase === 'done') {
    return page(
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">✅</div>
        <div className="text-lg font-semibold">Guruhga yuborildi</div>
        <button
          type="button"
          onClick={reset}
          className="h-12 rounded-xl px-6 text-base font-semibold"
          style={{ background: TH.button, color: TH.buttonText }}
        >
          Yana bitta kiritish
        </button>
      </div>
    );
  }

  const sending = phase === 'sending';
  const c = context!;

  return page(
    <div className="mx-auto max-w-lg px-4 pb-28 pt-4">
      <h1 className="text-xl font-bold">Yuk ma'lumoti</h1>
      <p className="mb-5 mt-0.5 text-sm" style={{ color: TH.hint }}>{c.clientName}. Hamma maydon ixtiyoriy, bilganlaringizni to'ldiring.</p>

      <div className="space-y-4">
        <Field label="Avto nomer" error={fieldErrors.vehicleNumber}>
          <input
            className={`${inputClass} uppercase`}
            style={inputStyle}
            type="text"
            autoCapitalize="characters"
            value={values.vehicleNumber}
            maxLength={40}
            placeholder="40232BAA/402332BA"
            onChange={(e) => setValue('vehicleNumber', e.target.value)}
          />
        </Field>

        <Field label="Sotib oluvchi">
          <select className={inputClass} style={inputStyle} value={contractId ?? ''} onChange={(e) => changeBuyer(e.target.value)}>
            <option value="">— tanlanmagan —</option>
            {c.contracts.map((x) => (
              <option key={x.id} value={x.id}>{buyerLabel(x)}</option>
            ))}
          </select>
        </Field>

        <ChoiceField
          label="Qaysi shahar"
          options={contract?.cities.map((x) => x.text) ?? []}
          value={values.city}
          manual={manual.city}
          placeholder="Shahar nomini yozing"
          error={fieldErrors.city}
          onSelect={changeCity}
          onManualChange={(flag) => setManualFlag('city', flag)}
        />

        <ChoiceField
          label="Mahsulot nomi"
          options={c.products}
          value={values.product}
          manual={manual.product}
          placeholder="Mahsulot nomini yozing"
          error={fieldErrors.product}
          onSelect={(v) => setValue('product', v)}
          onManualChange={(flag) => setManualFlag('product', flag)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Yashik soni" error={fieldErrors.boxCount}>
            <input className={inputClass} style={inputStyle} inputMode="numeric" value={values.boxCount} onChange={(e) => setValue('boxCount', sanitizeCount(e.target.value))} />
          </Field>
          <Field label="Yashiklar jami og'irligi" error={fieldErrors.boxWeight}>
            <input className={inputClass} style={inputStyle} inputMode="decimal" value={values.boxWeight} onChange={(e) => setValue('boxWeight', sanitizeDecimal(e.target.value))} />
          </Field>
          <Field label="Poddon soni" error={fieldErrors.palletCount}>
            <input className={inputClass} style={inputStyle} inputMode="numeric" value={values.palletCount} onChange={(e) => setValue('palletCount', sanitizeCount(e.target.value))} />
          </Field>
          <Field label="Poddon jami og'irligi" error={fieldErrors.palletWeight}>
            <input className={inputClass} style={inputStyle} inputMode="decimal" value={values.palletWeight} onChange={(e) => setValue('palletWeight', sanitizeDecimal(e.target.value))} />
          </Field>
          <Field label="Netto" error={fieldErrors.netto}>
            <input className={inputClass} style={inputStyle} inputMode="decimal" value={values.netto} onChange={(e) => setValue('netto', sanitizeDecimal(e.target.value))} />
          </Field>
          <Field label={contract?.currency ? `Narxi (${contract.currency})` : 'Narxi'} error={fieldErrors.price}>
            <input className={inputClass} style={inputStyle} inputMode="decimal" value={values.price} onChange={(e) => setValue('price', sanitizeDecimal(e.target.value))} />
          </Field>
        </div>

        <ChoiceField
          label="Таможня"
          options={customsOptions}
          value={values.customs}
          manual={manual.customs}
          placeholder="Таможня manzilini yozing"
          error={fieldErrors.customs}
          onSelect={(v) => setValue('customs', v)}
          onManualChange={(flag) => setManualFlag('customs', flag)}
        />

        <ChoiceField
          label="Выгрузка"
          options={contract?.destinations ?? []}
          value={values.unloading}
          manual={manual.unloading}
          placeholder="Yuk tushirish joyini yozing"
          error={fieldErrors.unloading}
          onSelect={(v) => setValue('unloading', v)}
          onManualChange={(flag) => setManualFlag('unloading', flag)}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 px-4 pb-4 pt-3" style={{ background: TH.bg }}>
        <div className="mx-auto max-w-lg">
          {formError && <div className="mb-2 text-center text-[13px]" style={{ color: TH.danger }}>{formError}</div>}
          <button
            type="button"
            disabled={sending || filledCount === 0}
            onClick={submit}
            className="h-12 w-full rounded-xl text-base font-semibold disabled:opacity-50"
            style={{ background: TH.button, color: TH.buttonText }}
          >
            {sending ? 'Yuborilmoqda...' : 'Guruhga yuborish'}
          </button>
        </div>
      </div>
    </div>
  );
}
