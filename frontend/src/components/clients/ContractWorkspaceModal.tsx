import { useState } from 'react';
import { Icon } from '@iconify/react';
import DateInput from '../DateInput';
import ContractFieldHint from '../contracts/ContractFieldHint';
import type { ContractFieldHintKey } from '../../constants/contractFieldHints';

// --- Tiplar ---------------------------------------------------------------

export type SpecRow = {
  productName: string;
  botanicalName?: string;
  tnvedCode?: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  specNumber?: string;
  productNumber?: string;
};

export type ContractFileItem = {
  name: string;
  fileUrl: string;
};

export type ContractFormState = {
  contractNumber: string;
  contractDate: string;
  contractCurrency: string;
  emails: string;
  sellerName: string;
  sellerInn: string;
  sellerLegalAddress: string;
  sellerDetails: string;
  gln: string;
  buyerName: string;
  buyerInn: string;
  buyerAddress: string;
  destinationCountry: string;
  buyerDetails: string;
  deliveryTerms: string[];
  customsAddress: string[];
  shipperName: string;
  shipperInn: string;
  shipperAddress: string;
  shipperDetails: string;
  consigneeName: string;
  consigneeInn: string;
  consigneeAddress: string;
  consigneeDetails: string;
  supplierDirector: string;
  buyerDirector: string;
  consigneeDirector: string;
  goodsReleasedBy: string;
  signatureUrl: string;
  sealUrl: string;
  sellerSignatureUrl: string;
  sellerSealUrl: string;
  buyerSignatureUrl: string;
  buyerSealUrl: string;
  consigneeSignatureUrl: string;
  consigneeSealUrl: string;
  companyLogoUrl: string;
  specification: SpecRow[];
  files?: ContractFileItem[];
};

export type ContractImageField =
  | 'signatureUrl'
  | 'sealUrl'
  | 'sellerSignatureUrl'
  | 'sellerSealUrl'
  | 'buyerSignatureUrl'
  | 'buyerSealUrl'
  | 'consigneeSignatureUrl'
  | 'consigneeSealUrl'
  | 'companyLogoUrl';

type StepId = 1 | 2 | 3 | 4 | 5;

interface ContractWorkspaceModalProps {
  clientName: string;
  isEditing: boolean;
  form: ContractFormState;
  setForm: (update: React.SetStateAction<ContractFormState>) => void;
  hasShipper: boolean;
  setHasShipper: (value: boolean) => void;
  hasConsignee: boolean;
  setHasConsignee: (value: boolean) => void;
  saving: boolean;
  countries: readonly string[];
  resolveUrl: (url?: string | null) => string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onUploadImage: (file: File, field: ContractImageField) => Promise<void>;
  onUploadFiles: (e: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  /** Spetsifikatsiya qadamiga o'tilganda TNVED mahsulotlarini yuklaydi/birlashtiradi */
  onEnterSpecStep: () => Promise<void>;
}

// --- Uslub tokenlari ------------------------------------------------------

const FLD =
  'w-full h-11 px-3.5 rounded-xl border-[1.5px] border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800/70 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 transition';
const AREA =
  'w-full px-3.5 py-3 rounded-xl border-[1.5px] border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800/70 text-sm font-medium leading-snug text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 transition resize-y block';
const LBL = 'flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5';
const CARD = 'rounded-2xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-5 sm:p-6';
const MONO_LABEL = 'font-mono text-[11px] font-semibold uppercase tracking-[0.14em]';
const ADD_BTN =
  'w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-gray-300 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 transition-colors';
const ICON_BTN =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors';
const ICON_BTN_DEL =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 transition-colors';

const SPEC_GRID =
  'grid grid-cols-[36px_84px_76px_128px_minmax(0,1.3fr)_minmax(0,1.1fr)_108px_40px] items-center gap-1 px-3';
const TH = 'px-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-600 dark:text-gray-400 whitespace-nowrap';
const CELL =
  'w-full h-9 px-2 rounded-lg border-[1.5px] border-transparent bg-transparent text-[13.5px] font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none transition group-hover:border-gray-200 dark:group-hover:border-slate-700 hover:!border-gray-300 dark:hover:!border-slate-600 focus:!border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-[3px] focus:ring-indigo-500/15';

const STEPS: { id: StepId; label: string; hint: string; title: string; lead: string }[] = [
  {
    id: 1,
    label: "Asosiy ma'lumotlar",
    hint: 'Raqam, sana, valyuta, aloqa',
    title: 'Shartnoma asoslari',
    lead: "Raqam, sana va valyutani belgilang — qolganlarini keyingi qadamlarda to'ldirasiz.",
  },
  {
    id: 2,
    label: 'Tomonlar',
    hint: 'Sotuvchi, importyor, yuk',
    title: 'Shartnoma tomonlari',
    lead: "Eksportyor va importyor rekvizitlari. Yuk jo'natuvchi yoki qabul qiluvchi alohida bo'lsa, ularni yoqing.",
  },
  {
    id: 3,
    label: 'Spetsifikatsiya',
    hint: 'Mahsulot va narxlar',
    title: 'Spetsifikatsiya',
    lead: "Har bir mahsulot — alohida qator: TNVED kodi, nomi, botanik nomi va narxi.",
  },
  {
    id: 4,
    label: 'Yetkazish va bojxona',
    hint: 'Условия поставки / Rastamojka',
    title: 'Yetkazish va bojxona',
    lead: "Yetkazib berish shartlari va ularga mos rastamojka manzillari juft bo'lib kiritiladi.",
  },
  {
    id: 5,
    label: 'Fayllar va logotip',
    hint: 'Ixtiyoriy',
    title: 'Fayllar va logotip',
    lead: "Logotip va shartnoma bilan birga saqlanadigan hujjatlar. Bu qadam ixtiyoriy.",
  },
];

const CURRENCIES = ['USD', 'UZS', 'RUB', 'EUR'] as const;

const has = (value: string | undefined | null) => !!value && value.trim() !== '';

// --- Kichik komponentlar --------------------------------------------------

function Field({
  label,
  required,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ContractFieldHintKey;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className={LBL}>
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-orange-700 dark:text-orange-400"> *</span>}
        </label>
        {hint && <ContractFieldHint field={hint} />}
      </div>
      {children}
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 ${
        on ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`}
      />
    </button>
  );
}

function ImageTile({
  label,
  field,
  hint,
  form,
  tall,
  onUpload,
  onClear,
  resolveUrl,
}: {
  label: string;
  field: ContractImageField;
  hint: ContractFieldHintKey;
  form: ContractFormState;
  tall?: boolean;
  onUpload: (file: File, field: ContractImageField) => Promise<void>;
  onClear: (field: ContractImageField) => void;
  resolveUrl: (url?: string | null) => string;
}) {
  const url = form[field];
  return (
    <div>
      <div className={LBL}>
        <span>{label}</span>
        <ContractFieldHint field={hint} />
      </div>
      {url ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-2">
          <img
            src={resolveUrl(url)}
            alt={label}
            className={`${tall ? 'h-16' : 'h-14'} w-auto max-w-[55%] rounded-lg bg-white object-contain border border-gray-200 dark:border-slate-700`}
          />
          <div className="ml-auto flex items-center">
            <a
              href={resolveUrl(url)}
              target="_blank"
              rel="noopener noreferrer"
              className={ICON_BTN}
              title="Rasmni yuklab olish"
              aria-label="Rasmni yuklab olish"
            >
              <Icon icon="solar:download-bold-duotone" className="w-5 h-5" />
            </a>
            <button type="button" onClick={() => onClear(field)} className={ICON_BTN_DEL} title="O'chirish" aria-label="O'chirish">
              <Icon icon="solar:trash-bin-trash-bold-duotone" className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <label
          className={`flex ${tall ? 'h-[104px]' : 'h-[92px]'} cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/40 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 transition-colors hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/15`}
        >
          <Icon icon="solar:upload-bold-duotone" className="w-5 h-5" />
          {label} yuklash
          <span className="font-normal text-gray-500 dark:text-gray-400">PNG / JPG</span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              const inputEl = e.currentTarget;
              if (!file) return;
              try {
                await onUpload(file, field);
              } catch (err) {
                console.error(err);
                alert(`${label}ni yuklashda xatolik`);
              }
              inputEl.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
}

// --- Asosiy komponent -----------------------------------------------------

export default function ContractWorkspaceModal({
  clientName,
  isEditing,
  form,
  setForm,
  hasShipper,
  setHasShipper,
  hasConsignee,
  setHasConsignee,
  saving,
  countries,
  resolveUrl,
  onSubmit,
  onClose,
  onUploadImage,
  onUploadFiles,
  onEnterSpecStep,
}: ContractWorkspaceModalProps) {
  const [step, setStep] = useState<StepId>(1);
  const [emailDraft, setEmailDraft] = useState('');

  const patch = (values: Partial<ContractFormState>) => setForm((prev) => ({ ...prev, ...values }));
  const clearImage = (field: ContractImageField) => patch({ [field]: '' } as Partial<ContractFormState>);

  // --- Tayyorlik hisobi ---
  const requiredFilled = [
    form.contractNumber,
    form.contractDate,
    form.supplierDirector,
    form.sellerName,
    form.sellerLegalAddress,
    form.buyerName,
    form.destinationCountry,
    form.buyerAddress,
  ].filter(has).length;
  const requiredTotal = 8;
  const pct = Math.round((requiredFilled / requiredTotal) * 100);
  const RING = 163.36;

  const stepDone: Record<StepId, boolean> = {
    1: has(form.contractNumber) && has(form.contractDate) && has(form.supplierDirector),
    2:
      has(form.sellerName) &&
      has(form.sellerLegalAddress) &&
      has(form.buyerName) &&
      has(form.destinationCountry) &&
      has(form.buyerAddress),
    3: (form.specification || []).some((row) => has(row.productName)),
    4: form.deliveryTerms.some(has),
    5: (form.files || []).length > 0,
  };

  const goStep = (next: StepId) => {
    setStep(next);
    if (next === 3) void onEnterSpecStep();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    // Majburiy maydon yetishmasa — foydalanuvchini o'sha qadamga olib o'tamiz,
    // xabarni esa baribir onSubmit (validatsiya) beradi.
    if (!stepDone[1]) setStep(1);
    else if (!stepDone[2]) setStep(2);
    onSubmit(e);
  };

  // --- Email yorliqlari ---
  const emailList = form.emails
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const commitEmail = () => {
    const value = emailDraft.trim().replace(/,+$/, '');
    if (!value) return;
    patch({ emails: [...emailList, value].join(', ') });
    setEmailDraft('');
  };
  const removeEmail = (index: number) => patch({ emails: emailList.filter((_, i) => i !== index).join(', ') });

  // --- Spetsifikatsiya ---
  const updateSpec = (idx: number, values: Partial<SpecRow>) =>
    setForm((prev) => {
      const next = [...(prev.specification || [])];
      next[idx] = { ...next[idx], ...values };
      return { ...prev, specification: next };
    });
  const removeSpec = (idx: number) =>
    setForm((prev) => ({ ...prev, specification: (prev.specification || []).filter((_, i) => i !== idx) }));
  const addSpec = () =>
    setForm((prev) => ({
      ...prev,
      specification: [
        ...(prev.specification || []),
        {
          productName: '',
          botanicalName: '',
          tnvedCode: '',
          quantity: 0,
          unit: 'кг',
          unitPrice: 0,
          totalPrice: 0,
          specNumber: '',
          productNumber: '',
        },
      ],
    }));

  // --- Yetkazish shartlari / rastamojka juftliklari ---
  const padTo = (values: string[], len: number) => {
    const out = [...values];
    while (out.length < len) out.push('');
    return out;
  };
  const termsLen = Math.max(form.deliveryTerms.length, form.customsAddress.length, 1);
  const deliveryRows = padTo(form.deliveryTerms, termsLen);
  const customsRows = padTo(form.customsAddress, termsLen);
  const updateTerm = (index: number, key: 'deliveryTerms' | 'customsAddress', value: string) =>
    setForm((prev) => {
      const len = Math.max(prev.deliveryTerms.length, prev.customsAddress.length, 1);
      const delivery = padTo(prev.deliveryTerms, len);
      const customs = padTo(prev.customsAddress, len);
      if (key === 'deliveryTerms') delivery[index] = value;
      else customs[index] = value;
      return { ...prev, deliveryTerms: delivery, customsAddress: customs };
    });
  const removeTerm = (index: number) =>
    setForm((prev) => {
      const len = Math.max(prev.deliveryTerms.length, prev.customsAddress.length, 1);
      const delivery = padTo(prev.deliveryTerms, len).filter((_, i) => i !== index);
      const customs = padTo(prev.customsAddress, len).filter((_, i) => i !== index);
      return {
        ...prev,
        deliveryTerms: delivery.length ? delivery : [''],
        customsAddress: customs.length ? customs : [''],
      };
    });
  const addTerm = () =>
    setForm((prev) => {
      const len = Math.max(prev.deliveryTerms.length, prev.customsAddress.length, 1);
      return {
        ...prev,
        deliveryTerms: [...padTo(prev.deliveryTerms, len), ''],
        customsAddress: [...padTo(prev.customsAddress, len), ''],
      };
    });

  const current = STEPS[step - 1];
  const currency = form.contractCurrency || 'USD';
  const title = isEditing ? 'Shartnomani tahrirlash' : 'Yangi shartnoma';

  const countryMissingInList =
    !!form.destinationCountry && !(countries as readonly string[]).includes(form.destinationCountry);

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm lg:p-5"
      style={{ animation: 'backdropFadeIn 0.3s ease-out' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleFormSubmit}
        className="relative mx-auto flex h-full w-full max-w-[1440px] flex-col overflow-hidden bg-[#eef0f6] dark:bg-slate-950 shadow-2xl lg:flex-row lg:rounded-3xl"
        style={{ animation: 'modalFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* ============ Chap: qadamlar paneli (katta ekran) ============ */}
        <aside className="hidden lg:flex w-72 shrink-0 flex-col bg-[#14162a] px-6 pb-6 pt-7 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <Icon icon="solar:document-text-bold-duotone" className="h-5 w-5" />
            </span>
            <span className="text-[15px] font-bold tracking-wide">Prodeklarant</span>
          </div>

          <div className={`${MONO_LABEL} mt-9 text-[#9aa0c3]`}>{isEditing ? 'SHARTNOMANI TAHRIRLASH' : 'YANGI SHARTNOMA'}</div>
          <div className="mt-2.5 text-[22px] font-extrabold leading-tight break-words">{clientName}</div>
          <div className="mt-1.5 text-[13px] text-[#a3a8c9]">Mijoz · 5 ta qadamda to'ldiring</div>

          <nav aria-label="Qadamlar" className="mt-8 flex flex-col">
            {STEPS.map((s) => {
              const isCurrent = s.id === step;
              const isDone = stepDone[s.id] && !isCurrent;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goStep(s.id)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className="group flex gap-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded-lg"
                >
                  <span className="flex w-[34px] shrink-0 flex-col items-center">
                    <span
                      className={`flex h-[34px] w-[34px] items-center justify-center rounded-full font-mono text-[13px] font-semibold ${
                        isCurrent
                          ? 'bg-white text-[#14162a] ring-[5px] ring-white/15'
                          : isDone
                            ? 'bg-[#8f95ff] text-[#14162a]'
                            : 'border-[1.5px] border-[#4a4f86] text-[#c9cdea]'
                      }`}
                    >
                      {isDone ? <Icon icon="solar:check-read-linear" className="h-[18px] w-[18px]" /> : s.id}
                    </span>
                    {s.id < 5 && (
                      <span className={`my-1 min-h-[22px] w-0.5 flex-1 rounded ${stepDone[s.id] ? 'bg-[#8f95ff]' : 'bg-[#33376a]'}`} />
                    )}
                  </span>
                  <span className="min-w-0 pb-5 pt-1">
                    <span className={`block text-[14.5px] leading-tight ${isCurrent ? 'font-extrabold text-white' : 'font-semibold text-[#d6d9f0] group-hover:text-white'}`}>
                      {s.label}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-[#a3a8c9]">{s.hint}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto flex items-center gap-3.5 rounded-2xl bg-[#1e2140] p-4">
            <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`Tayyorlik ${pct} foiz`} className="shrink-0">
              <circle cx="32" cy="32" r="26" fill="none" stroke="#33376a" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="#8f95ff"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={RING * (1 - requiredFilled / requiredTotal)}
                transform="rotate(-90 32 32)"
              />
              <text x="32" y="37" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="14" fill="#fff">
                {pct}%
              </text>
            </svg>
            <div>
              <div className="text-sm font-bold">Majburiy maydonlar</div>
              <div className="mt-1 text-[13px] text-[#a3a8c9]">
                {requiredFilled} / {requiredTotal} to'ldirildi
              </div>
            </div>
          </div>
        </aside>

        {/* ============ Kichik ekran: ixcham qadamlar ============ */}
        <div className="lg:hidden shrink-0 bg-[#14162a] px-4 pb-3 pt-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className={`${MONO_LABEL} text-[#9aa0c3]`}>{isEditing ? 'TAHRIRLASH' : 'YANGI SHARTNOMA'}</div>
              <div className="truncate text-base font-bold">{clientName}</div>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-[#c9cdea] hover:bg-white/10" aria-label="Yopish">
              <Icon icon="solar:close-circle-bold-duotone" className="h-6 w-6" />
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {STEPS.map((s) => {
              const isCurrent = s.id === step;
              const isDone = stepDone[s.id] && !isCurrent;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goStep(s.id)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold ${
                    isCurrent ? 'bg-white text-[#14162a]' : isDone ? 'bg-[#8f95ff] text-[#14162a]' : 'bg-white/10 text-[#d6d9f0]'
                  }`}
                >
                  <span className="font-mono text-xs">{s.id}</span>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============ O'ng: ish maydoni ============ */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Yuqori panel */}
          <header className="hidden lg:flex h-[68px] shrink-0 items-center justify-between border-b border-gray-300/70 dark:border-slate-800 px-8">
            <div className="flex items-center gap-2 text-[13.5px] text-gray-600 dark:text-gray-400">
              <span>Mijozlar</span>
              <span aria-hidden="true" className="text-gray-400">/</span>
              <span className="max-w-[240px] truncate">{clientName}</span>
              <span aria-hidden="true" className="text-gray-400">/</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{title}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl border-[1.5px] border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-[18px] text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Icon icon={saving ? 'solar:refresh-bold-duotone' : 'solar:diskette-bold-duotone'} className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            {/* Forma ustuni */}
            <section className="flex min-w-0 flex-1 flex-col">
              <div className="shrink-0 px-5 pb-5 pt-5 sm:px-12 sm:pt-7">
                <div className={`${MONO_LABEL} text-indigo-600 dark:text-indigo-300`}>QADAM {step} / 5</div>
                <h3 className="mt-2.5 text-[26px] font-extrabold leading-tight tracking-tight text-gray-900 dark:text-gray-50">{current.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{current.lead}</p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-7 pt-0.5 sm:px-12">
                {/* ===== 1: Asosiy ===== */}
                {step === 1 && (
                  <>
                    <div className={`${CARD} space-y-5`}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Shartnoma raqami" required hint="contractNumber" htmlFor="cw-number">
                          <input
                            id="cw-number"
                            type="text"
                            value={form.contractNumber}
                            onChange={(e) => patch({ contractNumber: e.target.value })}
                            className={`${FLD} font-mono`}
                            required
                          />
                        </Field>
                        <Field label="Shartnoma sanasi" required hint="contractDate">
                          <DateInput
                            value={form.contractDate}
                            onChange={(value) => patch({ contractDate: value })}
                            className={`${FLD} font-mono`}
                            required
                          />
                        </Field>
                      </div>

                      <div>
                        <div className={LBL}>
                          <span>Shartnoma valyutasi</span>
                          <ContractFieldHint field="contractCurrency" />
                        </div>
                        <div role="group" aria-label="Valyuta" className="inline-flex gap-1 rounded-2xl bg-gray-100 dark:bg-slate-800 p-1">
                          {CURRENCIES.map((code) => {
                            const on = currency === code;
                            return (
                              <button
                                key={code}
                                type="button"
                                aria-pressed={on}
                                onClick={() => patch({ contractCurrency: code })}
                                className={`h-11 rounded-xl px-[18px] font-mono text-[13px] font-bold transition-colors ${
                                  on ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700'
                                }`}
                              >
                                {code}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className={LBL}>
                          <span>Email manzillar</span>
                          <ContractFieldHint field="emails" />
                        </div>
                        {emailList.length > 0 && (
                          <div className="mb-2.5 flex flex-wrap gap-2">
                            {emailList.map((email, index) => (
                              <span
                                key={`${email}-${index}`}
                                className="inline-flex h-[34px] items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 pl-3 pr-1 font-mono text-[13px] font-medium text-indigo-900 dark:text-indigo-200"
                              >
                                {email}
                                <button
                                  type="button"
                                  onClick={() => removeEmail(index)}
                                  aria-label="Emailni o'chirish"
                                  className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/25"
                                >
                                  <Icon icon="solar:close-circle-bold-duotone" className="h-4 w-4" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2.5">
                          <input
                            type="text"
                            aria-label="Yangi email"
                            value={emailDraft}
                            onChange={(e) => setEmailDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitEmail();
                              }
                            }}
                            onBlur={commitEmail}
                            placeholder="email@example.com"
                            className={FLD}
                          />
                          <button
                            type="button"
                            onClick={commitEmail}
                            className="h-11 shrink-0 rounded-xl border-[1.5px] border-gray-300 dark:border-slate-600 px-[18px] text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            Qo'shish
                          </button>
                        </div>
                        <p className="mt-2 text-[12.5px] text-gray-500 dark:text-gray-400">
                          Bir nechta email qo'shish mumkin — har biri alohida yorliq bo'lib turadi.
                        </p>
                      </div>
                    </div>

                    <div className={`${CARD} grid grid-cols-1 gap-4 sm:grid-cols-2`}>
                      <div className="text-[15px] font-bold text-gray-900 dark:text-gray-100 sm:col-span-2">Imzolovchi shaxslar</div>
                      <Field label="Direktor F.I.O." required hint="supplierDirector" htmlFor="cw-director">
                        <input
                          id="cw-director"
                          type="text"
                          value={form.supplierDirector}
                          onChange={(e) => patch({ supplierDirector: e.target.value })}
                          className={FLD}
                          required
                        />
                      </Field>
                      <Field label="Товар отпустил" hint="goodsReleasedBy" htmlFor="cw-released">
                        <input
                          id="cw-released"
                          type="text"
                          value={form.goodsReleasedBy}
                          onChange={(e) => patch({ goodsReleasedBy: e.target.value })}
                          className={FLD}
                          placeholder="Товар отпустил"
                        />
                      </Field>
                    </div>
                  </>
                )}

                {/* ===== 2: Tomonlar ===== */}
                {step === 2 && (
                  <>
                    <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Sotuvchi */}
                      <div className={`${CARD} space-y-3.5 border-t-4 border-t-indigo-600`}>
                        <div className={`${MONO_LABEL} text-indigo-600 dark:text-indigo-300`}>Sotuvchi · eksportyor</div>
                        <Field label="Korxona nomi" required hint="sellerName" htmlFor="cw-s-name">
                          <input
                            id="cw-s-name"
                            type="text"
                            value={form.sellerName}
                            onChange={(e) => patch({ sellerName: e.target.value })}
                            className={FLD}
                            required
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="INN" hint="sellerInn" htmlFor="cw-s-inn">
                            <input
                              id="cw-s-inn"
                              type="text"
                              value={form.sellerInn}
                              onChange={(e) => patch({ sellerInn: e.target.value })}
                              className={`${FLD} font-mono`}
                              placeholder="INN"
                            />
                          </Field>
                          <Field label="GLN kod" hint="gln" htmlFor="cw-s-gln">
                            <input
                              id="cw-s-gln"
                              type="text"
                              value={form.gln}
                              onChange={(e) => patch({ gln: e.target.value })}
                              className={`${FLD} font-mono`}
                              placeholder="GLN"
                            />
                          </Field>
                        </div>
                        <Field label="Yuridik manzili" required hint="sellerLegalAddress" htmlFor="cw-s-addr">
                          <textarea
                            id="cw-s-addr"
                            rows={2}
                            value={form.sellerLegalAddress}
                            onChange={(e) => patch({ sellerLegalAddress: e.target.value })}
                            className={AREA}
                            required
                          />
                        </Field>
                        <Field label="Qolgan rekvizitlar" hint="sellerDetails" htmlFor="cw-s-det">
                          <textarea
                            id="cw-s-det"
                            rows={3}
                            value={form.sellerDetails}
                            onChange={(e) => patch({ sellerDetails: e.target.value })}
                            className={AREA}
                            placeholder="INN, MFO, bank, hisob raqam va h.k."
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <ImageTile label="Imzo" field="sellerSignatureUrl" hint="sellerSignatureUrl" form={form} onUpload={onUploadImage} onClear={clearImage} resolveUrl={resolveUrl} />
                          <ImageTile label="Muhr" field="sellerSealUrl" hint="sellerSealUrl" form={form} onUpload={onUploadImage} onClear={clearImage} resolveUrl={resolveUrl} />
                        </div>
                      </div>

                      {/* Sotib oluvchi */}
                      <div className={`${CARD} space-y-3.5 border-t-4 border-t-teal-600`}>
                        <div className={`${MONO_LABEL} text-teal-700 dark:text-teal-300`}>Sotib oluvchi · importyor</div>
                        <Field label="Korxona nomi" required hint="buyerName" htmlFor="cw-b-name">
                          <input
                            id="cw-b-name"
                            type="text"
                            value={form.buyerName}
                            onChange={(e) => patch({ buyerName: e.target.value })}
                            className={FLD}
                            required
                          />
                        </Field>
                        <Field label="Davlati" required hint="destinationCountry" htmlFor="cw-b-country">
                          <select
                            id="cw-b-country"
                            value={form.destinationCountry}
                            onChange={(e) => patch({ destinationCountry: e.target.value })}
                            className={FLD}
                            required
                          >
                            <option value="">Tanlang...</option>
                            {/* Eski shartnomalarda ro'yxatdan tashqari qiymat bo'lishi
                                mumkin (masalan lotincha "Russia"). Uni jimgina
                                yo'qotmaymiz — ko'rinib tursin va tuzatilsin. */}
                            {countryMissingInList && (
                              <option value={form.destinationCountry}>
                                {form.destinationCountry} — ro'yxatda yo'q, tuzating
                              </option>
                            )}
                            {countries.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Yuridik manzili" required hint="buyerAddress" htmlFor="cw-b-addr">
                          <textarea
                            id="cw-b-addr"
                            rows={2}
                            value={form.buyerAddress}
                            onChange={(e) => patch({ buyerAddress: e.target.value })}
                            className={AREA}
                            required
                          />
                        </Field>
                        <Field label="Qolgan rekvizitlar" hint="buyerDetails" htmlFor="cw-b-det">
                          <textarea
                            id="cw-b-det"
                            rows={3}
                            value={form.buyerDetails}
                            onChange={(e) => patch({ buyerDetails: e.target.value })}
                            className={AREA}
                            placeholder="INN, MFO, bank, hisob raqam va h.k."
                          />
                        </Field>
                        <Field label="Директор" hint="buyerDirector" htmlFor="cw-b-dir">
                          <input
                            id="cw-b-dir"
                            type="text"
                            value={form.buyerDirector}
                            onChange={(e) => patch({ buyerDirector: e.target.value })}
                            className={FLD}
                            placeholder="Ism familyasi"
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <ImageTile label="Imzo" field="buyerSignatureUrl" hint="buyerSignatureUrl" form={form} onUpload={onUploadImage} onClear={clearImage} resolveUrl={resolveUrl} />
                          <ImageTile label="Muhr" field="buyerSealUrl" hint="buyerSealUrl" form={form} onUpload={onUploadImage} onClear={clearImage} resolveUrl={resolveUrl} />
                        </div>
                      </div>

                      <div
                        aria-hidden="true"
                        className="absolute left-1/2 top-6 hidden h-[34px] w-[34px] -translate-x-1/2 items-center justify-center rounded-full bg-[#14162a] text-white ring-[5px] ring-[#eef0f6] dark:ring-slate-950 md:flex"
                      >
                        <Icon icon="solar:arrow-right-bold-duotone" className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Yuk jo'natuvchi */}
                    <div className={`${CARD} space-y-4`}>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-[15px] font-bold text-gray-900 dark:text-gray-100">Yuk jo'natuvchi</div>
                          <div className="mt-0.5 text-[13px] text-gray-600 dark:text-gray-400">
                            Sotuvchidan boshqa korxona yukni jo'natsa yoqing
                          </div>
                        </div>
                        <Switch on={hasShipper} onChange={setHasShipper} label="Yuk jo'natuvchi mavjud" />
                      </div>
                      {hasShipper && (
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[2fr_1fr]">
                          <Field label="Korxona nomi" hint="shipperName" htmlFor="cw-sh-name">
                            <input
                              id="cw-sh-name"
                              type="text"
                              value={form.shipperName}
                              onChange={(e) => patch({ shipperName: e.target.value })}
                              className={FLD}
                            />
                          </Field>
                          <Field label="INN" hint="shipperInn" htmlFor="cw-sh-inn">
                            <input
                              id="cw-sh-inn"
                              type="text"
                              value={form.shipperInn}
                              onChange={(e) => patch({ shipperInn: e.target.value })}
                              className={`${FLD} font-mono`}
                              placeholder="INN"
                            />
                          </Field>
                          <Field label="Yuridik manzili" hint="shipperAddress" htmlFor="cw-sh-addr" className="sm:col-span-2">
                            <textarea
                              id="cw-sh-addr"
                              rows={2}
                              value={form.shipperAddress}
                              onChange={(e) => patch({ shipperAddress: e.target.value })}
                              className={AREA}
                            />
                          </Field>
                          <Field label="Qolgan rekvizitlar" hint="shipperDetails" htmlFor="cw-sh-det" className="sm:col-span-2">
                            <textarea
                              id="cw-sh-det"
                              rows={3}
                              value={form.shipperDetails}
                              onChange={(e) => patch({ shipperDetails: e.target.value })}
                              className={AREA}
                              placeholder="INN, MFO, bank, hisob raqam va h.k."
                            />
                          </Field>
                        </div>
                      )}
                    </div>

                    {/* Yuk qabul qiluvchi */}
                    <div className={`${CARD} space-y-4`}>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-[15px] font-bold text-gray-900 dark:text-gray-100">Yuk qabul qiluvchi</div>
                          <div className="mt-0.5 text-[13px] text-gray-600 dark:text-gray-400">
                            Importyordan boshqa korxona yukni qabul qilsa yoqing
                          </div>
                        </div>
                        <Switch on={hasConsignee} onChange={setHasConsignee} label="Yuk qabul qiluvchi mavjud" />
                      </div>
                      {hasConsignee && (
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <Field label="Korxona nomi" hint="consigneeName" htmlFor="cw-c-name">
                            <input
                              id="cw-c-name"
                              type="text"
                              value={form.consigneeName}
                              onChange={(e) => patch({ consigneeName: e.target.value })}
                              className={FLD}
                            />
                          </Field>
                          <Field label="Директор" hint="consigneeDirector" htmlFor="cw-c-dir">
                            <input
                              id="cw-c-dir"
                              type="text"
                              value={form.consigneeDirector}
                              onChange={(e) => patch({ consigneeDirector: e.target.value })}
                              className={FLD}
                              placeholder="Ism familyasi"
                            />
                          </Field>
                          <Field label="Yuridik manzili" hint="consigneeAddress" htmlFor="cw-c-addr" className="sm:col-span-2">
                            <textarea
                              id="cw-c-addr"
                              rows={2}
                              value={form.consigneeAddress}
                              onChange={(e) => patch({ consigneeAddress: e.target.value })}
                              className={AREA}
                            />
                          </Field>
                          <Field label="Qolgan rekvizitlar" hint="consigneeDetails" htmlFor="cw-c-det" className="sm:col-span-2">
                            <textarea
                              id="cw-c-det"
                              rows={3}
                              value={form.consigneeDetails}
                              onChange={(e) => patch({ consigneeDetails: e.target.value })}
                              className={AREA}
                              placeholder="INN, MFO, bank, hisob raqam va h.k."
                            />
                          </Field>
                          <ImageTile label="Imzo" field="consigneeSignatureUrl" hint="consigneeSignatureUrl" form={form} onUpload={onUploadImage} onClear={clearImage} resolveUrl={resolveUrl} />
                          <ImageTile label="Muhr" field="consigneeSealUrl" hint="consigneeSealUrl" form={form} onUpload={onUploadImage} onClear={clearImage} resolveUrl={resolveUrl} />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ===== 3: Spetsifikatsiya ===== */}
                {step === 3 && (
                  <>
                    {/* Keng ekranda jadval forma ustuni bilan birga aylanadi (sarlavha sticky);
                        torroq ekranda gorizontal scroll kerak bo'lgani uchun jadvalning o'z scrolli bor. */}
                    <div className="max-h-[calc(100vh-340px)] min-h-[220px] overflow-auto rounded-2xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 xl:max-h-none xl:min-h-0 xl:overflow-clip">
                      <div role="table" aria-label="Spetsifikatsiya" className="min-w-[840px]">
                        <div role="row" className={`${SPEC_GRID} sticky top-0 z-10 h-[42px] border-b border-gray-200 dark:border-slate-700/80 bg-gray-100 dark:bg-slate-800`}>
                          <span role="columnheader" className={TH}>№</span>
                          <span role="columnheader" className={`${TH} inline-flex items-center gap-1`}>Спец. №<ContractFieldHint field="specNumber" /></span>
                          <span role="columnheader" className={`${TH} inline-flex items-center gap-1`}>Товар №<ContractFieldHint field="productNumber" /></span>
                          <span role="columnheader" className={`${TH} inline-flex items-center gap-1`}>TNVED<ContractFieldHint field="tnvedCode" /></span>
                          <span role="columnheader" className={`${TH} inline-flex items-center gap-1`}>Mahsulot nomi<ContractFieldHint field="productName" /></span>
                          <span role="columnheader" className={`${TH} inline-flex items-center gap-1`}>Botanik nomi<ContractFieldHint field="botanicalName" /></span>
                          <span role="columnheader" className={`${TH} inline-flex items-center justify-end gap-1`}>ЦЕНА · {currency}<ContractFieldHint field="unitPrice" /></span>
                          <span />
                        </div>
                        {(form.specification || []).map((row, idx) => (
                          <div key={idx} role="row" className={`${SPEC_GRID} group h-[46px] border-b border-gray-100 dark:border-slate-800`}>
                            <span role="cell" className="text-center font-mono text-xs text-gray-500 dark:text-gray-400">{idx + 1}</span>
                            <input
                              role="cell"
                              type="text"
                              aria-label="Спецификация №"
                              value={row.specNumber ?? ''}
                              onChange={(e) => updateSpec(idx, { specNumber: e.target.value })}
                              className={`${CELL} font-mono`}
                            />
                            <input
                              role="cell"
                              type="text"
                              aria-label="Товар №"
                              value={row.productNumber ?? ''}
                              onChange={(e) => updateSpec(idx, { productNumber: e.target.value })}
                              className={`${CELL} font-mono`}
                            />
                            <input
                              role="cell"
                              type="text"
                              aria-label="TNVED kod"
                              value={row.tnvedCode ?? ''}
                              onChange={(e) => updateSpec(idx, { tnvedCode: e.target.value })}
                              className={`${CELL} font-mono`}
                            />
                            <input
                              role="cell"
                              type="text"
                              aria-label="Mahsulot nomi"
                              value={row.productName}
                              onChange={(e) => updateSpec(idx, { productName: e.target.value })}
                              className={CELL}
                              placeholder="Mahsulot nomi"
                            />
                            <input
                              role="cell"
                              type="text"
                              aria-label="Botanik nomi"
                              value={row.botanicalName ?? ''}
                              onChange={(e) => updateSpec(idx, { botanicalName: e.target.value })}
                              className={`${CELL} italic`}
                              placeholder="Botanik nomi"
                            />
                            <input
                              role="cell"
                              type="number"
                              min={0}
                              step="any"
                              aria-label="Narx"
                              value={row.unitPrice !== undefined && row.unitPrice !== null ? row.unitPrice : ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const parsed = raw === '' ? 0 : parseFloat(raw);
                                const num = Number.isNaN(parsed) ? 0 : parsed;
                                setForm((prev) => {
                                  const next = [...(prev.specification || [])];
                                  next[idx] = { ...next[idx], unitPrice: num, totalPrice: (next[idx].quantity || 0) * num };
                                  return { ...prev, specification: next };
                                });
                              }}
                              className={`${CELL} text-right font-mono`}
                              placeholder="0"
                            />
                            <button
                              role="cell"
                              type="button"
                              onClick={() => removeSpec(idx)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 transition-colors"
                              title="O'chirish"
                              aria-label="Qatorni o'chirish"
                            >
                              <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-[18px] w-[18px]" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addSpec}
                          className="flex h-[46px] w-full items-center justify-center gap-2 bg-gray-50 dark:bg-slate-800/50 text-[13.5px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 transition-colors"
                        >
                          <Icon icon="solar:add-circle-bold-duotone" className="h-4 w-4" />
                          Qator qo'shish
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ===== 4: Yetkazish va bojxona ===== */}
                {step === 4 && (
                  <>
                    <div className={`${CARD} space-y-3.5`}>
                      <div className="hidden items-center gap-2.5 sm:grid sm:grid-cols-[1fr_28px_1.5fr_40px]">
                        <span className={`${MONO_LABEL} inline-flex items-center gap-1.5 !tracking-[0.1em] text-gray-600 dark:text-gray-400`}>
                          Условия поставки
                          <ContractFieldHint field="deliveryTerms" />
                        </span>
                        <span />
                        <span className={`${MONO_LABEL} inline-flex items-center gap-1.5 !tracking-[0.1em] text-gray-600 dark:text-gray-400`}>
                          Rastamojka · адрес растаможки
                          <ContractFieldHint field="customsAddress" />
                        </span>
                        <span />
                      </div>
                      {deliveryRows.map((delivery, index) => (
                        <div key={`terms-row-${index}`} className="flex flex-col gap-2.5 sm:grid sm:grid-cols-[1fr_28px_1.5fr_40px] sm:items-center">
                          <input
                            type="text"
                            aria-label="Условия поставки"
                            value={delivery}
                            onChange={(e) => updateTerm(index, 'deliveryTerms', e.target.value)}
                            className={FLD}
                            placeholder="Условия поставки"
                          />
                          <span aria-hidden="true" className="hidden h-11 items-center justify-center text-gray-400 sm:flex">
                            <Icon icon="solar:link-bold-duotone" className="h-[18px] w-[18px]" />
                          </span>
                          <input
                            type="text"
                            aria-label="Rastamojka"
                            value={customsRows[index] ?? ''}
                            onChange={(e) => updateTerm(index, 'customsAddress', e.target.value)}
                            className={FLD}
                            placeholder="Rastamojka"
                          />
                          <button type="button" onClick={() => removeTerm(index)} className={`${ICON_BTN_DEL} self-end sm:self-auto`} title="O'chirish" aria-label="Juftlikni o'chirish">
                            <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={addTerm} className={ADD_BTN}>
                        <Icon icon="solar:add-circle-bold-duotone" className="h-[18px] w-[18px]" />
                        Juftlik qo'shish
                      </button>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 px-4 py-3.5 text-[13.5px] leading-relaxed text-indigo-950 dark:text-indigo-200">
                      <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 h-[18px] w-[18px] shrink-0" />
                      <span>
                        Har bir qatorda chap tomon — shartnoma bo'yicha yetkazib berish sharti, o'ng tomon — shu shartga bog'langan rastamojka
                        manzili. Ikkalasi ham shartnoma PDF'ida birga chiqadi.
                      </span>
                    </div>
                  </>
                )}

                {/* ===== 5: Fayllar va logotip ===== */}
                {step === 5 && (
                  <>
                    <div className={`${CARD} grid grid-cols-1 items-center gap-5 sm:grid-cols-[220px_1fr]`}>
                      <ImageTile label="Logotip" field="companyLogoUrl" hint="companyLogoUrl" form={form} tall onUpload={onUploadImage} onClear={clearImage} resolveUrl={resolveUrl} />
                      <div>
                        <div className="text-[15px] font-bold text-gray-900 dark:text-gray-100">Kompaniya logotipi</div>
                        <div className="mt-1.5 text-[13.5px] leading-relaxed text-gray-600 dark:text-gray-400">
                          Shartnoma sarlavhasida va bosma hujjatlarda ko'rinadi. Shaffof fonli PNG eng yaxshi natija beradi.
                        </div>
                      </div>
                    </div>

                    <div className={`${CARD} space-y-3.5`}>
                      <div className={LBL}>
                        <span className="text-[15px] font-bold text-gray-900 dark:text-gray-100">Shartnoma fayllari</span>
                        <ContractFieldHint field="files" />
                      </div>
                      <label className="flex h-[110px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/40 text-center text-[13px] font-semibold text-gray-600 dark:text-gray-300 transition-colors hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/15">
                        <Icon icon="solar:upload-bold-duotone" className="h-6 w-6" />
                        Fayllarni tanlang
                        <span className="font-normal text-gray-500 dark:text-gray-400">Bir nechta fayl yuklash mumkin</span>
                        <input type="file" multiple className="sr-only" onChange={onUploadFiles} />
                      </label>
                      {(form.files || []).map((file, index) => (
                        <div
                          key={file.fileUrl || file.name}
                          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 py-2.5 pl-3.5 pr-2.5"
                        >
                          <Icon icon="solar:file-bold-duotone" className="h-[22px] w-[22px] shrink-0 text-gray-500 dark:text-gray-400" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100" title={file.name}>
                            {file.name}
                          </span>
                          <a href={resolveUrl(file.fileUrl)} target="_blank" rel="noopener noreferrer" className={ICON_BTN} title="Ko'rish" aria-label="Ko'rish">
                            <Icon icon="solar:eye-bold-duotone" className="h-5 w-5" />
                          </a>
                          <a href={resolveUrl(file.fileUrl)} download={file.name || 'document'} className={ICON_BTN} title="Ko'chirib olish" aria-label="Ko'chirib olish">
                            <Icon icon="solar:download-bold-duotone" className="h-5 w-5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, files: (prev.files || []).filter((_, i) => i !== index) }))}
                            className={ICON_BTN_DEL}
                            title="O'chirish"
                            aria-label="O'chirish"
                          >
                            <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Pastki harakatlar */}
              <footer className="flex h-[76px] shrink-0 items-center justify-between gap-3 border-t border-gray-300/70 dark:border-slate-800 bg-[#f6f7fb] dark:bg-slate-900 px-5 sm:px-12">
                <button
                  type="button"
                  onClick={() => goStep((step - 1) as StepId)}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-[18px] text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
                    step === 1 ? 'invisible' : ''
                  }`}
                >
                  <Icon icon="solar:arrow-left-bold-duotone" className="h-4 w-4" />
                  Orqaga
                </button>
                {step < 5 ? (
                  <button
                    type="button"
                    onClick={() => goStep((step + 1) as StepId)}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Keyingi: {STEPS[step].label}
                    <Icon icon="solar:arrow-right-bold-duotone" className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <Icon icon={saving ? 'solar:refresh-bold-duotone' : 'solar:diskette-bold-duotone'} className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                    {saving ? 'Saqlanmoqda...' : 'Shartnomani saqlash'}
                  </button>
                )}
              </footer>
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
