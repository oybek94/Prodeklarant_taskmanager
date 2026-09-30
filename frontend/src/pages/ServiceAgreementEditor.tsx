import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import { createAgreement, getAgreement, getNextNumber, terminateAgreement, updateAgreement } from '../features/serviceAgreement/api';
import { downloadAgreementPdf } from '../features/serviceAgreement/downloadAgreementPdf';
import ClientPicker, { type ClientOption } from '../features/serviceAgreement/ClientPicker';
import { CURRENT_TEMPLATE_VERSION } from '../features/serviceAgreement/templates';
import { withMainTariff } from '../features/serviceAgreement/tariffs';
import {
  PAYMENT_MODEL_LABEL,
  PRICING_MODE_LABEL,
  STATUS_LABEL,
  type AgreementStatus,
  type PaymentModel,
  type PricingMode,
  type ServiceAgreement,
} from '../features/serviceAgreement/types';

/**
 * Sana UTC bo'yicha saqlanadi: PDF ham shunday chizadi (`tokens.ts` —
 * `formatDate` UTC komponentlarini oladi). Mahalliy vaqt saqlansa Toshkent
 * (+5) uchun ISO'ga o'tkazishda sana bir kun orqaga siljib ketardi.
 */
function todayIsoDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00:00.000Z`;
}

/** ISO → `yyyy-mm-dd` (`input[type="date"]` uchun) */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** `yyyy-mm-dd` → UTC yarim tunidagi ISO; maydon tozalansa bo'sh matn */
const fromDateInput = (value: string): string => (value ? `${value}T00:00:00.000Z` : '');

const EMPTY: ServiceAgreement = {
  id: 0, clientId: 0, agreementNumber: '', agreementDate: todayIsoDate(),
  templateVersion: CURRENT_TEMPLATE_VERSION, status: 'DRAFT', terminatedAt: null, terminationReason: null,
  customerName: '', customerInn: null, customerAddress: null, customerDirector: null,
  customerDirectorBasis: 'Устав', customerBankName: null, customerBankAccount: null,
  customerMfo: null, customerOked: null, customerPhone: null, customerEmail: null,
  customerRequisites: null,
  executorName: '', executorInn: null, executorAddress: null, executorDirector: null,
  executorBankName: null, executorBankAccount: null, executorMfo: null, executorOked: null,
  executorPhone: null, executorEmail: null,
  paymentModel: 'PREPAID', monthlyDueDay: null, perCountThreshold: null, perCountDueDays: null,
  perAmountThreshold: null, perAmountDueDays: null, creditLimit: null, prepaidRevertDays: 10,
  pricingMode: 'BHM', mainTariffBhm: '2', mainTariffUzs: null,
  tariffs: [{ name: 'Электрон БЮД расмийлаштириш', unit: '1 БЮД', bhm: 2 }],
  vatPayer: false, jurisdictionCourt: null, brokerRegistryNumber: null,
  signingPlace: 'Олтиариқ тумани', includeSeal: true,
};

/** `GET /company-settings/requisites` — Bajaruvchi (PRODEKLARANT) rekvizitlari */
interface ExecutorRequisites {
  name: string;
  inn: string | null;
  director: string | null;
  legalAddress: string | null;
  bankName: string | null;
  bankAccount: string | null;
  mfo: string | null;
  phone: string | null;
  email: string | null;
}

/** `GET /clients/:id/requisites` */
interface ClientRequisites {
  id: number;
  name: string;
  inn: string | null;
  address: string | null;
  bankName: string | null;
  bankAccount: string | null;
  email: string | null;
  phone: string | null;
  director: string | null;
  mfo: string | null;
  oked: string | null;
}

const INPUT_CLASS =
  'w-full h-10 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm ' +
  'text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none transition ' +
  'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 dark:disabled:bg-slate-900 disabled:text-gray-500';

const TEXTAREA_CLASS = INPUT_CLASS.replace('h-10 ', '') + ' py-2';

/** Yorliq + maydon. Placeholder yolg'iz qolganda to'ldirilgan maydon nomsiz ko'rinadi. */
function Field({ label, hint, className = '', children }: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">{hint}</span>}
    </label>
  );
}

function Section({ id, step, title, subtitle, children }: {
  id: string;
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
      <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-gray-100 dark:border-slate-700/60">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40 text-xs font-semibold text-blue-600 dark:text-blue-300 mt-0.5">
          {step}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Variant kartochkalari (to'lov modeli, narx turi) — tugmalar qatori o'rniga */
function OptionCard({ active, title, description, badge, onClick }: {
  active: boolean;
  title: string;
  description?: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed ${
        active
          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20 ring-1 ring-blue-500'
          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
      }`}
    >
      {badge && (
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
          active ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
        }`}>
          {badge}
        </span>
      )}
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>{title}</span>
        {description && <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</span>}
      </span>
    </button>
  );
}

const PAYMENT_MODEL_HINT: Record<PaymentModel, string> = {
  PREPAID: "Mijoz xizmatdan oldin to'laydi",
  MONTHLY: 'Oyning belgilangan kunida',
  PER_COUNT: "N ta ishdan keyin to'lanadi",
  PER_AMOUNT: 'Qarz summaga yetganda',
};

const STATUS_BADGE: Record<AgreementStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  DRAFT: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  TERMINATED: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-slate-700/50 dark:text-gray-300 dark:ring-slate-600',
};

/**
 * Mijoz kartochkasidagi maydonlardan rekvizitlar matnini yig'adi. Bo'sh
 * maydonlar tushib qoladi — shartnomada `Банк: —` kabi qatorlar qolmasin.
 */
function composeRequisites(c: ClientRequisites): string {
  return [
    ['Манзил', c.address],
    ['Банк', c.bankName],
    ['Ҳ/р', c.bankAccount],
    ['МФО', c.mfo],
    ['Тел', c.phone],
    ['E-mail', c.email],
  ]
    .filter(([, value]) => value?.trim())
    .map(([label, value]) => `${label}: ${value?.trim()}`)
    .join('\n');
}

/** Bo'sh maydongina Sozlamalardagi qiymat bilan to'ldiriladi */
const orSetting = (current: string | null, value: string | null | undefined): string | null =>
  current?.trim() ? current : value?.trim() || null;

/**
 * Bajaruvchi (PRODEKLARANT) rekvizitlarini Sozlamalardan to'ldiradi.
 *
 * Yangi shartnomada barcha maydon shu yerdan keladi. Saqlangan shartnomada
 * esa faqat BO'SH qolgan maydonlar to'ldiriladi: imzolangan hujjatdagi
 * snapshot o'zgarmasligi kerak, lekin ilgari umuman yozilmagan qatorlar
 * (masalan МФО) PDFda `—` bo'lib qolmasligi ham kerak.
 */
function withExecutor(a: ServiceAgreement, c: ExecutorRequisites): ServiceAgreement {
  return {
    ...a,
    executorName: a.executorName.trim() || c.name || '',
    executorInn: orSetting(a.executorInn, c.inn),
    executorDirector: orSetting(a.executorDirector, c.director),
    executorAddress: orSetting(a.executorAddress, c.legalAddress),
    executorBankName: orSetting(a.executorBankName, c.bankName),
    executorBankAccount: orSetting(a.executorBankAccount, c.bankAccount),
    executorMfo: orSetting(a.executorMfo, c.mfo),
    executorPhone: orSetting(a.executorPhone, c.phone),
    executorEmail: orSetting(a.executorEmail, c.email),
  };
}

/** Shartnomaning 13-bo'limida chiqadigan Bajaruvchi qatorlari — nazorat uchun */
const EXECUTOR_ROWS: [string, keyof ServiceAgreement][] = [
  ['Номи', 'executorName'],
  ['Директор', 'executorDirector'],
  ['Манзил', 'executorAddress'],
  ['СТИР', 'executorInn'],
  ['Банк', 'executorBankName'],
  ['Ҳ/р', 'executorBankAccount'],
  ['МФО', 'executorMfo'],
  ['Тел', 'executorPhone'],
];


/** Saqlanmagan o'zgarishlarni aniqlash uchun formaning barqaror ko'rinishi */
const snapshot = (a: ServiceAgreement): string => JSON.stringify(a);

/** Sozlamalar so'rovi sahifa ochilganda bir marta yuboriladi, har `id` o'zgarishida emas */
const fetchExecutorSettings = () =>
  apiClient
    .get<ExecutorRequisites | null>('/company-settings/requisites')
    .then(({ data }) => data)
    // Sozlama yo'q yoki so'rov yiqildi — maydonlar bo'sh qoladi, qolgan forma ishlaydi
    .catch(() => null);

export default function ServiceAgreementEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<ServiceAgreement>(EMPTY);
  const [baseline, setBaseline] = useState(() => snapshot(EMPTY));
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientLoading, setClientLoading] = useState(false);
  const [bhmUzs, setBhmUzs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  // Yangi shartnomada raqam serverdan keladi — kelguncha maydon bo'sh turadi
  const [numberLoading, setNumberLoading] = useState(!id);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [terminating, setTerminating] = useState(false);

  const settingsRef = useRef<Promise<ExecutorRequisites | null> | null>(null);
  // Yangi shartnoma saqlangach URL `/shartnomalar/:id` ga o'tadi — javob allaqachon qo'lda, qayta so'ralmaydi
  const justSavedRef = useRef<ServiceAgreement | null>(null);

  // Bekor qilingan shartnoma faqat o'qish uchun — matni o'zgarmasligi kerak
  const isTerminated = form.status === 'TERMINATED';
  const isDirty = loaded && snapshot(form) !== baseline;

  const set = <K extends keyof ServiceAgreement>(key: K, value: ServiceAgreement[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /**
   * BYuD tarifi shartnomada ikki joyda chiqadi — 4.2-band matnida va tarif
   * jadvalining birinchi qatorida. Ikkalasi ham shu yerdan yangilanadi, aks
   * holda hujjatda ikki xil narx paydo bo'ladi.
   */
  const setMainTariff = (value: string) =>
    setForm((prev) =>
      prev.pricingMode === 'FIXED'
        ? { ...prev, mainTariffUzs: value, tariffs: withMainTariff(prev.tariffs, value, 'FIXED') }
        : { ...prev, mainTariffBhm: value, tariffs: withMainTariff(prev.tariffs, value, 'BHM') },
    );

  /**
   * Narx turi almashtirilganda jadvalning birinchi qatori YANGI rejim
   * qiymatiga qayta bog'lanadi — aks holda jadvalda eski rejimdagi narx qolib,
   * hujjat matni bilan ziddiyat chiqardi.
   */
  const setPricingMode = (mode: PricingMode) =>
    setForm((prev) => ({
      ...prev,
      pricingMode: mode,
      tariffs: withMainTariff(
        prev.tariffs,
        mode === 'FIXED' ? prev.mainTariffUzs ?? '' : prev.mainTariffBhm,
        mode,
      ),
    }));

  // Ma'lumotnomalar (BHM, mijozlar ro'yxati, Bajaruvchi sozlamalari) — sahifa ochilganda bir marta
  useEffect(() => {
    if (!settingsRef.current) settingsRef.current = fetchExecutorSettings();
    apiClient.get('/bxm/current').then(({ data }) => setBhmUzs(Number(data.amountUzs) || 0)).catch(() => setBhmUzs(0));
    apiClient.get<ClientOption[]>('/clients', { params: { selectList: true } })
      .then(({ data }) => setClients(data))
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!settingsRef.current) settingsRef.current = fetchExecutorSettings();
    const settings = settingsRef.current;

    void (async () => {
      let next: ServiceAgreement;
      if (id) {
        const cached = justSavedRef.current;
        justSavedRef.current = null;
        if (cached && cached.id === Number(id)) {
          next = cached;
        } else {
          setLoaded(false);
          setNotFound(false);
          try {
            next = await getAgreement(Number(id));
          } catch {
            if (!cancelled) setNotFound(true);
            return;
          }
        }
      } else {
        next = { ...EMPTY, agreementDate: todayIsoDate() };
        setLoaded(false);
        setNumberLoading(true);
        try {
          next.agreementNumber = await getNextNumber(new Date().getFullYear());
        } catch {
          toast.error('Shartnoma raqamini olib bo\'lmadi — raqamni qo\'lda kiriting');
        } finally {
          if (!cancelled) setNumberLoading(false);
        }
      }

      // Sozlama shartnoma yuklangandan KEYIN qo'llanadi: aks holda butun
      // holatni almashtiruvchi `setForm(agreement)` uni bosib ketardi
      const company = await settings;
      if (cancelled) return;
      if (company) next = withExecutor(next, company);
      setForm(next);
      setBaseline(snapshot(next));
      setNotFound(false);
      setLoaded(true);
    })();

    return () => { cancelled = true; };
  }, [id]);

  // Saqlanmagan o'zgarish bilan sahifani yopish/yangilashdan oldin brauzer so'raydi
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const goBack = () => {
    if (isDirty && !window.confirm('Saqlanmagan o\'zgarishlar bor. Chiqib ketasizmi?')) return;
    navigate('/shartnomalar');
  };

  /** Mijoz tanlanganda rekvizitlar ko'chiriladi — keyin ular mustaqil tahrirlanadi (snapshot) */
  const pickClient = async (clientId: number) => {
    if (!clientId) return;
    setClientLoading(true);
    try {
      const { data: c } = await apiClient.get<ClientRequisites>(`/clients/${clientId}/requisites`);
      setForm((prev) => ({
        ...prev,
        clientId: c.id,
        customerName: c.name,
        customerInn: c.inn,
        customerDirector: c.director,
        // Alohida ustunlar ham to'ldiriladi: ular shartnoma matnining boshqa
        // bandlarida ishlatiladi va rekvizitlar matni tozalansa zaxira bo'ladi.
        customerAddress: c.address,
        customerBankName: c.bankName,
        customerBankAccount: c.bankAccount,
        customerPhone: c.phone,
        customerEmail: c.email,
        customerMfo: c.mfo,
        customerOked: c.oked,
        // Qo'lda yozilgan matn ustidan yozilmaydi
        customerRequisites: prev.customerRequisites?.trim() ? prev.customerRequisites : composeRequisites(c),
      }));
    } catch {
      toast.error('Mijoz rekvizitlarini olib bo\'lmadi');
    } finally {
      setClientLoading(false);
    }
  };

  /** Bekor qilish — sabab majburiy (backend `terminateSchema`: `min(1)`) */
  const terminate = async () => {
    const reason = terminationReason.trim();
    if (!reason) return toast.error('Bekor qilish sababini yozing');
    if (!id) return;

    setTerminating(true);
    try {
      const saved = await terminateAgreement(Number(id), reason);
      setForm(saved);
      setBaseline(snapshot(saved));
      setTerminateOpen(false);
      setTerminationReason('');
      toast.success('Shartnoma bekor qilindi');
    } catch {
      toast.error('Bekor qilishda xatolik');
    } finally {
      setTerminating(false);
    }
  };

  const save = useCallback(async () => {
    if (saving) return;
    if (isTerminated) return toast.error('Bekor qilingan shartnoma tahrirlanmaydi');
    if (!form.agreementNumber.trim()) return toast.error('Shartnoma raqamini kiriting');
    if (!form.agreementDate) return toast.error('Shartnoma sanasini kiriting');
    if (!form.clientId) return toast.error('Mijozni tanlang');
    if (!form.customerName.trim()) return toast.error('Korxona nomi kerak');
    if (form.paymentModel === 'MONTHLY' && !form.monthlyDueDay) return toast.error('Oyning sanasini kiriting');
    if (form.paymentModel === 'PER_COUNT' && (!form.perCountThreshold || !form.perCountDueDays))
      return toast.error('Ish soni va to\'lov muddatini kiriting');
    if (form.paymentModel === 'PER_AMOUNT' && (!form.perAmountThreshold || !form.perAmountDueDays))
      return toast.error('Summa va to\'lov muddatini kiriting');
    if (form.pricingMode === 'FIXED' && !Number(form.mainTariffUzs))
      return toast.error('BYuD uchun qat\'iy narxni kiriting');

    setSaving(true);
    try {
      const payload = {
        ...form,
        mainTariffBhm: Number(form.mainTariffBhm),
        mainTariffUzs: form.pricingMode === 'FIXED' ? Number(form.mainTariffUzs) : undefined,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
        perAmountThreshold: form.perAmountThreshold ? Number(form.perAmountThreshold) : undefined,
      };
      const saved = id
        ? await updateAgreement(Number(id), payload)
        : await createAgreement(payload);

      setForm(saved);
      setBaseline(snapshot(saved));
      toast.success('Saqlandi');
      if (!id) {
        justSavedRef.current = saved;
        navigate(`/shartnomalar/${saved.id}`, { replace: true });
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } }).response?.status;
      toast.error(status === 409 ? 'Bu shartnoma raqami allaqachon band' : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  }, [form, id, isTerminated, navigate, saving]);

  // Ctrl+S / Cmd+S — saqlash
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (loaded && !isTerminated) void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, loaded, isTerminated]);

  useEffect(() => {
    if (!terminateOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !terminating) setTerminateOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [terminateOpen, terminating]);

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadAgreementPdf(form, bhmUzs);
    } finally {
      setPdfLoading(false);
    }
  };

  // BHM rejimida — taxminiy so'm ekvivalenti, FIXED rejimida — kiritilgan
  // summaning uch xonalab ajratilgan ko'rinishi. Ikkalasi ham faqat ko'rsatma.
  const tariffHint =
    form.pricingMode === 'FIXED'
      ? Number(form.mainTariffUzs)
        ? `${Number(form.mainTariffUzs).toLocaleString('ru-RU')} so'm`
        : undefined
      : bhmUzs && Number(form.mainTariffBhm)
        ? `≈ ${(Number(form.mainTariffBhm) * bhmUzs).toLocaleString('ru-RU')} so'm`
        : undefined;

  const missingExecutor = EXECUTOR_ROWS.filter(([, key]) => !(form[key] as string | null)?.trim());
  const saveLabel = saving ? 'Saqlanmoqda…' : id && !isDirty ? 'Saqlangan' : 'Saqlash';
  const saveDisabled = saving || isTerminated || (!!id && !isDirty);

  if (notFound) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <Icon icon="solar:document-bold-duotone" className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <h1 className="font-semibold text-gray-900 dark:text-gray-100">Shartnoma topilmadi</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">U o'chirilgan yoki havola noto'g'ri bo'lishi mumkin.</p>
        <button onClick={() => navigate('/shartnomalar')} className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Shartnomalar ro'yxatiga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 pb-28 sm:p-6 lg:pb-6">
      {/* Sarlavha */}
      <div className="mb-5">
        <button
          onClick={goBack}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <Icon icon="solar:alt-arrow-left-linear" className="w-4 h-4" />
          Shartnomalar
        </button>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {id ? (loaded ? `Shartnoma № ${form.agreementNumber}` : 'Shartnoma') : 'Yangi shartnoma'}
          </h1>
          {id && loaded && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE[form.status]}`}>
              {STATUS_LABEL[form.status]}
            </span>
          )}
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Saqlanmagan o'zgarishlar
            </span>
          )}
        </div>
      </div>

      {!loaded ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {[160, 320, 260].map((h) => (
              <div key={h} className="rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" style={{ height: h }} />
            ))}
          </div>
          <div className="hidden lg:block h-72 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <fieldset disabled={isTerminated} className="min-w-0 space-y-5">
            {isTerminated && (
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 flex gap-3">
                <Icon icon="solar:lock-keyhole-bold-duotone" className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Shartnoma bekor qilingan — faqat o'qish uchun</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {form.terminatedAt && `${new Date(form.terminatedAt).toLocaleDateString('ru-RU')} · `}
                    Sabab: {form.terminationReason || '—'}
                  </div>
                </div>
              </div>
            )}

            <Section
              id="sa-number"
              step={1}
              title="Shartnoma raqami va sanasi"
              subtitle="Raqam avtomatik beriladi, sana bugungi kun bilan to'ldiriladi — kerak bo'lsa o'zgartiring"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Shartnoma raqami" hint={numberLoading ? 'Raqam olinmoqda…' : undefined}>
                  <input
                    value={form.agreementNumber}
                    onChange={(e) => set('agreementNumber', e.target.value)}
                    placeholder={`${new Date().getFullYear()}/001`}
                    className={`${INPUT_CLASS} tabular-nums`}
                  />
                </Field>
                <Field label="Shartnoma sanasi">
                  <input
                    type="date"
                    value={toDateInput(form.agreementDate)}
                    onChange={(e) => set('agreementDate', fromDateInput(e.target.value))}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
            </Section>

            <Section
              id="sa-customer"
              step={2}
              title="Mijoz va rekvizitlar"
              subtitle="Shartnomaga nusxa olinadi — keyin mijoz kartochkasi o'zgarsa ham bu yerdagi matn o'zgarmaydi"
            >
              <Field label="Mijoz" className="mb-4" hint={clientLoading ? 'Rekvizitlar olinmoqda…' : undefined}>
                <ClientPicker
                  clients={clients}
                  value={form.clientId}
                  fallbackName={form.customerName}
                  loading={clientsLoading}
                  disabled={isTerminated || clientLoading}
                  onChange={pickClient}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Korxona nomi">
                  <input value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="MChJ «…»" className={INPUT_CLASS} />
                </Field>
                <Field label="INN (СТИР)">
                  <input value={form.customerInn ?? ''} onChange={(e) => set('customerInn', e.target.value)} placeholder="123456789" inputMode="numeric" className={`${INPUT_CLASS} tabular-nums`} />
                </Field>
                <Field
                  label="Direktor F.I.Sh."
                  className="sm:col-span-2"
                  hint="To'liq yozing — shartnomada avtomat qisqaradi (Турсунбоев Ойбек Улуғбек ўғли → Турсунбоев О.У.)"
                >
                  <input value={form.customerDirector ?? ''} onChange={(e) => set('customerDirector', e.target.value)} placeholder="Каримов Азиз Бахтиёрович" className={INPUT_CLASS} />
                </Field>
              </div>

              <Field
                label="Rekvizitlar"
                className="mt-4"
                hint="Shartnomaning oxirgi bo'limiga aynan shu ko'rinishda tushadi. Har qator — alohida rekvizit."
              >
                <textarea
                  value={form.customerRequisites ?? ''}
                  onChange={(e) => set('customerRequisites', e.target.value)}
                  rows={7}
                  placeholder={'Манзил: Тошкент ш., Чилонзор т., 14-уй\nБанк: АТБ «Ипотека банк»\nҲ/р: 20208000000000000000\nМФО: 00491\nТел: +998 90 123-45-67\nE-mail: info@example.uz'}
                  className={`${TEXTAREA_CLASS} resize-y font-mono text-[13px] leading-relaxed`}
                />
              </Field>
            </Section>

            <Section id="sa-payment" step={3} title="To'lov shartlari">
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(PAYMENT_MODEL_LABEL) as PaymentModel[]).map((model) => {
                  const [letter, title] = PAYMENT_MODEL_LABEL[model].split(' — ');
                  return (
                    <OptionCard
                      key={model}
                      active={form.paymentModel === model}
                      badge={letter}
                      title={title ?? PAYMENT_MODEL_LABEL[model]}
                      description={PAYMENT_MODEL_HINT[model]}
                      onClick={() => set('paymentModel', model)}
                    />
                  );
                })}
              </div>

              {form.paymentModel === 'MONTHLY' && (
                <Field label="Oyning sanasi" className="mt-4 sm:w-1/2">
                  <input type="number" min={1} max={28} value={form.monthlyDueDay ?? ''} onChange={(e) => set('monthlyDueDay', Number(e.target.value) || null)} placeholder="1–28" className={INPUT_CLASS} />
                </Field>
              )}
              {form.paymentModel === 'PER_COUNT' && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Necha ta ishda">
                    <input type="number" min={1} value={form.perCountThreshold ?? ''} onChange={(e) => set('perCountThreshold', Number(e.target.value) || null)} className={INPUT_CLASS} />
                  </Field>
                  <Field label="Necha bank kuni ichida">
                    <input type="number" min={1} value={form.perCountDueDays ?? ''} onChange={(e) => set('perCountDueDays', Number(e.target.value) || null)} className={INPUT_CLASS} />
                  </Field>
                </div>
              )}
              {form.paymentModel === 'PER_AMOUNT' && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Qaysi summada (so'm)"
                    hint={Number(form.perAmountThreshold) ? `${Number(form.perAmountThreshold).toLocaleString('ru-RU')} so'm` : undefined}
                  >
                    <input type="number" min={0} value={form.perAmountThreshold ?? ''} onChange={(e) => set('perAmountThreshold', e.target.value || null)} className={INPUT_CLASS} />
                  </Field>
                  <Field label="Necha bank kuni ichida">
                    <input type="number" min={1} value={form.perAmountDueDays ?? ''} onChange={(e) => set('perAmountDueDays', Number(e.target.value) || null)} className={INPUT_CLASS} />
                  </Field>
                </div>
              )}
              {form.paymentModel !== 'PREPAID' && (
                <Field
                  label="Kredit limiti (so'm)"
                  className="mt-4 sm:w-1/2"
                  hint={Number(form.creditLimit) ? `${Number(form.creditLimit).toLocaleString('ru-RU')} so'm` : undefined}
                >
                  <input type="number" min={0} value={form.creditLimit ?? ''} onChange={(e) => set('creditLimit', e.target.value || null)} className={INPUT_CLASS} />
                </Field>
              )}
            </Section>

            <Section id="sa-pricing" step={4} title="Narx">
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(PRICING_MODE_LABEL) as PricingMode[]).map((mode) => (
                  <OptionCard
                    key={mode}
                    active={form.pricingMode === mode}
                    title={PRICING_MODE_LABEL[mode]}
                    description={mode === 'FIXED'
                      ? 'So\'mda qotiriladi — BHM o\'zgarishi ta\'sir qilmaydi'
                      : 'BHM o\'zgarganda avtomatik qayta hisoblanadi'}
                    onClick={() => setPricingMode(mode)}
                  />
                ))}
              </div>

              <div className="mt-4 sm:w-1/2">
                {form.pricingMode === 'FIXED' ? (
                  <Field label="BYuD narxi (so'm)" hint={tariffHint}>
                    <input
                      type="number"
                      min={0}
                      value={form.mainTariffUzs ?? ''}
                      onChange={(e) => setMainTariff(e.target.value)}
                      placeholder="1000000"
                      className={`${INPUT_CLASS} tabular-nums`}
                    />
                  </Field>
                ) : (
                  <Field label="BYuD tarifi (BHM)" hint={tariffHint}>
                    <input
                      value={form.mainTariffBhm}
                      onChange={(e) => setMainTariff(e.target.value)}
                      inputMode="decimal"
                      className={`${INPUT_CLASS} tabular-nums`}
                    />
                  </Field>
                )}
              </div>
            </Section>
          </fieldset>

          {/* Yon panel: xulosa, holat, amallar, Bajaruvchi tekshiruvi */}
          <aside className="space-y-4 lg:sticky lg:top-4">
            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
              <dl className="space-y-2.5 text-sm">
                <SummaryRow label="Mijoz" value={form.customerName || '—'} />
                <SummaryRow label="Sana" value={form.agreementDate ? new Date(form.agreementDate).toLocaleDateString('ru-RU') : '—'} />
                <SummaryRow label="To'lov" value={PAYMENT_MODEL_LABEL[form.paymentModel]} />
                <SummaryRow
                  label="BYuD narxi"
                  value={form.pricingMode === 'FIXED'
                    ? (Number(form.mainTariffUzs) ? `${Number(form.mainTariffUzs).toLocaleString('ru-RU')} so'm` : '—')
                    : `${form.mainTariffBhm || 0} BHM`}
                  sub={form.pricingMode === 'BHM' ? tariffHint : undefined}
                />
              </dl>

              {id && !isTerminated && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700/60">
                  <span className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">Holat</span>
                  {/* Holat oddiy `Saqlash` bilan yoziladi; bekor qilish alohida endpoint */}
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 dark:bg-slate-900 p-1">
                    {(['DRAFT', 'ACTIVE'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set('status', s)}
                        className={`h-8 rounded-md text-sm font-medium transition ${
                          form.status === s
                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {!isTerminated && (
                  <button
                    onClick={save}
                    disabled={saveDisabled}
                    className="hidden lg:flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    title="Ctrl+S"
                  >
                    {saveLabel}
                    {!saveDisabled && <kbd className="text-[10px] font-normal opacity-70">Ctrl+S</kbd>}
                  </button>
                )}
                {id && (
                  <button
                    onClick={downloadPdf}
                    disabled={pdfLoading}
                    className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-60"
                    title={isDirty ? 'PDF joriy (saqlanmagan) holatdan yasaladi' : undefined}
                  >
                    <Icon
                      icon={pdfLoading ? 'solar:refresh-bold-duotone' : 'solar:file-download-bold-duotone'}
                      className={`w-5 h-5 text-blue-600 dark:text-blue-400 ${pdfLoading ? 'animate-spin' : ''}`}
                    />
                    PDF yuklab olish
                  </button>
                )}
                {id && !isTerminated && (
                  <button
                    onClick={() => setTerminateOpen(true)}
                    className="w-full h-9 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Shartnomani bekor qilish
                  </button>
                )}
              </div>
            </div>

            {/* Bajaruvchi ustuni qo'lda tahrirlanmaydi — manba Sozlamalar bo'limi */}
            <details
              className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60"
              open={missingExecutor.length > 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bajaruvchi rekvizitlari</span>
                {missingExecutor.length > 0 ? (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{missingExecutor.length} ta bo'sh</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Icon icon="solar:check-circle-bold-duotone" className="w-4 h-4" />
                    To'liq
                  </span>
                )}
              </summary>
              <div className="px-4 pb-4">
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                  Sozlamalar → Umumiy ma'lumotlardan olinadi, shartnomaning 13-bo'limida chiqadi.
                </p>
                <dl className="space-y-1.5 text-xs">
                  {EXECUTOR_ROWS.map(([label, key]) => {
                    const value = (form[key] as string | null)?.trim();
                    return (
                      <div key={key} className="flex gap-2">
                        <dt className="w-16 shrink-0 text-gray-500 dark:text-gray-400">{label}</dt>
                        <dd className={`min-w-0 break-words ${value ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}`}>
                          {value || 'kiritilmagan'}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
                {missingExecutor.length > 0 && (
                  <p className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    Bo'sh qatorlar shartnomada «—» bo'lib chiqadi. Ularni Sozlamalarda to'ldiring, so'ng sahifani yangilang.
                  </p>
                )}
              </div>
            </details>
          </aside>
        </div>
      )}

      {/* Mobil: saqlash tugmasi doim ko'rinib tursin (desktopda yon panelda) */}
      {loaded && !isTerminated && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 backdrop-blur lg:hidden">
          <button
            onClick={save}
            disabled={saveDisabled}
            className="w-full h-11 rounded-lg bg-blue-600 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saveLabel}
          </button>
        </div>
      )}

      {terminateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !terminating) setTerminateOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-transparent dark:border-slate-700 p-5 shadow-2xl">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Shartnomani bekor qilish</h3>
            <p className="mt-1 mb-3 text-sm text-gray-600 dark:text-gray-400">
              № {form.agreementNumber} — {form.customerName}. Bekor qilingandan keyin shartnoma tahrirlanmaydi.
            </p>
            {isDirty && (
              <p className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                Saqlanmagan o'zgarishlar bekor qilish bilan birga yo'qoladi.
              </p>
            )}
            <textarea
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Bekor qilish sababi"
              className={TEXTAREA_CLASS}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setTerminateOpen(false)}
                disabled={terminating}
                className="h-9 rounded-lg bg-gray-100 dark:bg-slate-800 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                Yopish
              </button>
              <button
                onClick={terminate}
                disabled={terminating || !terminationReason.trim()}
                className="h-9 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {terminating ? 'Bajarilmoqda…' : 'Bekor qilish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500 dark:text-gray-400 shrink-0">{label}</dt>
      <dd className="text-right min-w-0">
        <div className="font-medium text-gray-900 dark:text-gray-100 truncate" title={value}>{value}</div>
        {sub && <div className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{sub}</div>}
      </dd>
    </div>
  );
}
