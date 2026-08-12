import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { createAgreement, getAgreement, getNextNumber, terminateAgreement, updateAgreement } from '../features/serviceAgreement/api';
import { downloadAgreementPdf } from '../features/serviceAgreement/downloadAgreementPdf';
import { CURRENT_TEMPLATE_VERSION } from '../features/serviceAgreement/templates';
import { withMainTariff } from '../features/serviceAgreement/tariffs';
import {
  PAYMENT_MODEL_LABEL,
  STATUS_LABEL,
  type AgreementStatus,
  type PaymentModel,
  type ServiceAgreement,
} from '../features/serviceAgreement/types';

const EMPTY: ServiceAgreement = {
  id: 0, clientId: 0, agreementNumber: '', agreementDate: new Date().toISOString(),
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
  mainTariffBhm: '3', tariffs: [{ name: 'Электрон БЮД расмийлаштириш', unit: '1 БЮД', bhm: 3 }],
  vatPayer: false, jurisdictionCourt: null, brokerRegistryNumber: null,
  signingPlace: 'Олтиариқ тумани', includeSeal: true,
};

/** `GET /clients?selectList=true` — faqat id va nom */
interface ClientOption {
  id: number;
  name: string;
}

/** `GET /clients/:id` dan kerak bo'ladigan rekvizitlar */
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
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition ' +
  'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

/** Yorliq + maydon. Placeholder yolg'iz qolganda to'ldirilgan maydon nomsiz ko'rinadi. */
function Field({ label, hint, className = '', children }: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

function Section({ step, title, subtitle, children }: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
          {step}
        </span>
        <div>
          <h2 className="font-semibold leading-7 text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Mijoz kartochkasidagi maydonlardan rekvizitlar matnini yig'adi. Bo'sh
 * maydonlar tushib qoladi — shartnomada `Банк: —` kabi qatorlar qolmasin.
 */
function composeRequisites(c: ClientRequisites): string {
  return [
    ['Манзил', c.address],
    ['ИФУТ (ОКЭД)', c.oked],
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

export default function ServiceAgreementEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<ServiceAgreement>(EMPTY);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [bhmUzs, setBhmUzs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [syncToClient, setSyncToClient] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [terminating, setTerminating] = useState(false);

  // Mijoz kartochkasini yangilash faqat ADMIN uchun ochiq (PATCH /clients/:id)
  const canSyncToClient = user?.role === 'ADMIN';

  // Bekor qilingan shartnoma faqat o'qish uchun — matni o'zgarmasligi kerak
  const isTerminated = form.status === 'TERMINATED';

  const set = <K extends keyof ServiceAgreement>(key: K, value: ServiceAgreement[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /**
   * BYuD tarifi shartnomada ikki joyda chiqadi — 4.2-band matnida va tarif
   * jadvalining birinchi qatorida. Ikkalasi ham shu yerdan yangilanadi, aks
   * holda hujjatda ikki xil narx paydo bo'ladi.
   */
  const setMainTariff = (value: string) =>
    setForm((prev) => ({ ...prev, mainTariffBhm: value, tariffs: withMainTariff(prev.tariffs, value) }));

  useEffect(() => {
    apiClient.get('/bxm/current').then(({ data }) => setBhmUzs(Number(data.amountUzs) || 0)).catch(() => setBhmUzs(0));
    apiClient.get<ClientOption[]>('/clients', { params: { selectList: true } })
      .then(({ data }) => setClients(data))
      .catch(() => setClients([]));

    if (id) {
      getAgreement(Number(id)).then(setForm).catch(() => toast.error('Shartnoma topilmadi'));
      return;
    }

    getNextNumber(new Date().getFullYear())
      .then((agreementNumber) => setForm((prev) => ({ ...prev, agreementNumber })))
      .catch(() => toast.error('Shartnoma raqamini olib bo\'lmadi'));

    // Bajaruvchi rekvizitlari — alohida so'rov: `/company-settings` faqat ADMIN
    // uchun ochiq va bo'sh (null) qaytishi mumkin. Muvaffaqiyatsiz bo'lsa
    // maydonlar bo'sh qoladi, shartnoma raqami esa baribir olinadi.
    apiClient.get('/company-settings')
      .then(({ data: company }) => {
        if (!company) return;
        setForm((prev) => ({
          ...prev,
          executorName: company.name ?? '',
          executorInn: company.inn ?? null,
          executorAddress: company.legalAddress ?? null,
          executorBankName: company.bankName ?? null,
          executorBankAccount: company.bankAccount ?? null,
          executorPhone: company.phone ?? null,
          executorEmail: company.email ?? null,
        }));
      })
      .catch(() => { /* ADMIN emas yoki sozlama yo'q — maydonlar qo'lda to'ldiriladi */ });
  }, [id]);

  /** Mijoz tanlanganda rekvizitlar ko'chiriladi — keyin ular mustaqil tahrirlanadi (snapshot) */
  const pickClient = async (clientId: number) => {
    if (!clientId) return;
    try {
      const { data: c } = await apiClient.get<ClientRequisites>(`/clients/${clientId}`);
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
    }
  };

  /** Bekor qilish — sabab majburiy (backend `terminateSchema`: `min(1)`) */
  const terminate = async () => {
    const reason = terminationReason.trim();
    if (!reason) return toast.error('Bekor qilish sababini yozing');
    if (!id) return;

    setTerminating(true);
    try {
      setForm(await terminateAgreement(Number(id), reason));
      setTerminateOpen(false);
      setTerminationReason('');
      toast.success('Shartnoma bekor qilindi');
    } catch {
      toast.error('Bekor qilishda xatolik');
    } finally {
      setTerminating(false);
    }
  };

  const save = async () => {
    if (isTerminated) return toast.error('Bekor qilingan shartnoma tahrirlanmaydi');
    if (!form.clientId) return toast.error('Mijozni tanlang');
    if (!form.customerName.trim()) return toast.error('Korxona nomi kerak');
    if (form.paymentModel === 'MONTHLY' && !form.monthlyDueDay) return toast.error('Oyning sanasini kiriting');
    if (form.paymentModel === 'PER_COUNT' && (!form.perCountThreshold || !form.perCountDueDays))
      return toast.error('Ish soni va to\'lov muddatini kiriting');
    if (form.paymentModel === 'PER_AMOUNT' && (!form.perAmountThreshold || !form.perAmountDueDays))
      return toast.error('Summa va to\'lov muddatini kiriting');

    setSaving(true);
    try {
      const payload = {
        ...form,
        mainTariffBhm: Number(form.mainTariffBhm),
        creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
        perAmountThreshold: form.perAmountThreshold ? Number(form.perAmountThreshold) : undefined,
      };
      const saved = id
        ? await updateAgreement(Number(id), payload)
        : await createAgreement(payload);

      if (syncToClient && canSyncToClient) {
        // Shartnoma saqlangan — sinxronlash yiqilsa ham uni bekor qilmaymiz
        await apiClient.patch(`/clients/${form.clientId}`, { director: form.customerDirector })
          .catch(() => toast.error('Mijoz kartochkasi yangilanmadi'));
      }

      toast.success('Saqlandi');
      navigate(`/shartnomalar/${saved.id}`);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } }).response?.status;
      toast.error(status === 409 ? 'Bu shartnoma raqami allaqachon band' : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const tariffUzs = bhmUzs && Number(form.mainTariffBhm)
    ? (Number(form.mainTariffBhm) * bhmUzs).toLocaleString('ru-RU')
    : '';

  return (
    <div className="mx-auto max-w-3xl p-4 pb-28 sm:p-6 sm:pb-28">
      <button
        onClick={() => navigate('/shartnomalar')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <Icon icon="solar:alt-arrow-left-linear" className="text-lg" />
        Shartnomalar
      </button>

      <div className="space-y-5">
        {/* Holat paneli — faqat saqlangan shartnoma uchun */}
        {id && (
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-gray-900">№ {form.agreementNumber}</div>
                <div className="text-xs text-gray-500">
                  {new Date(form.agreementDate).toLocaleDateString('ru-RU')} — {form.customerName}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => downloadAgreementPdf(form, bhmUzs)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Icon icon="solar:file-download-bold-duotone" className="text-lg text-blue-600" />
                  PDF yuklab olish
                </button>

                {isTerminated ? (
                  <span className="rounded-full bg-red-100 px-3 py-1.5 text-sm text-red-700">
                    {STATUS_LABEL.TERMINATED}
                  </span>
                ) : (
                  <>
                    {/* Holat oddiy `Saqlash` bilan yoziladi; bekor qilish alohida endpoint */}
                    <select
                      value={form.status}
                      onChange={(e) => set('status', e.target.value as AgreementStatus)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="DRAFT">{STATUS_LABEL.DRAFT}</option>
                      <option value="ACTIVE">{STATUS_LABEL.ACTIVE}</option>
                    </select>
                    <button
                      onClick={() => setTerminateOpen(true)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Bekor qilish
                    </button>
                  </>
                )}
              </div>
            </div>

            {isTerminated && (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {form.terminatedAt && `${new Date(form.terminatedAt).toLocaleDateString('ru-RU')} — `}
                Sabab: {form.terminationReason || '—'}
              </div>
            )}
          </section>
        )}

        <Section step={1} title="Mijoz va rekvizitlar" subtitle="Shartnomaga nusxa olinadi — keyin mijoz kartochkasi o'zgarsa ham bu yerdagi matn o'zgarmaydi">
          <Field label="Mijoz" className="mb-4">
            <select
              value={form.clientId || ''}
              onChange={(e) => pickClient(Number(e.target.value))}
              className={INPUT_CLASS}
            >
              <option value="">Mijozni tanlang</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Korxona nomi">
              <input value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="MChJ «…»" className={INPUT_CLASS} />
            </Field>
            <Field label="INN (СТИР)">
              <input value={form.customerInn ?? ''} onChange={(e) => set('customerInn', e.target.value)} placeholder="123456789" className={INPUT_CLASS} />
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
              rows={10}
              placeholder={'Манзил: Тошкент ш., Чилонзор т., 14-уй\nИФУТ (ОКЭД): 46900\nБанк: АТБ «Ипотека банк»\nҲ/р: 20208000000000000000\nМФО: 00491\nТел: +998 90 123-45-67\nE-mail: info@example.uz'}
              className={`${INPUT_CLASS} resize-y font-mono leading-relaxed`}
            />
          </Field>

          {canSyncToClient && (
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={syncToClient} onChange={(e) => setSyncToClient(e.target.checked)} />
              Direktorni mijoz kartochkasiga ham saqlash
            </label>
          )}
        </Section>

        <Section step={2} title="To'lov shartlari">
          <Field label="To'lov modeli">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PAYMENT_MODEL_LABEL) as PaymentModel[]).map((model) => (
                <button
                  key={model}
                  onClick={() => set('paymentModel', model)}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    form.paymentModel === model
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {PAYMENT_MODEL_LABEL[model]}
                </button>
              ))}
            </div>
          </Field>

          {form.paymentModel === 'MONTHLY' && (
            <Field label="Oyning sanasi" className="mt-4">
              <input type="number" min={1} max={28} value={form.monthlyDueDay ?? ''} onChange={(e) => set('monthlyDueDay', Number(e.target.value) || null)} placeholder="1–28" className={INPUT_CLASS} />
            </Field>
          )}
          {form.paymentModel === 'PER_COUNT' && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Necha ta ishda">
                <input type="number" value={form.perCountThreshold ?? ''} onChange={(e) => set('perCountThreshold', Number(e.target.value) || null)} className={INPUT_CLASS} />
              </Field>
              <Field label="Necha bank kuni ichida">
                <input type="number" value={form.perCountDueDays ?? ''} onChange={(e) => set('perCountDueDays', Number(e.target.value) || null)} className={INPUT_CLASS} />
              </Field>
            </div>
          )}
          {form.paymentModel === 'PER_AMOUNT' && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Qaysi summada (so'm)">
                <input type="number" value={form.perAmountThreshold ?? ''} onChange={(e) => set('perAmountThreshold', e.target.value || null)} className={INPUT_CLASS} />
              </Field>
              <Field label="Necha bank kuni ichida">
                <input type="number" value={form.perAmountDueDays ?? ''} onChange={(e) => set('perAmountDueDays', Number(e.target.value) || null)} className={INPUT_CLASS} />
              </Field>
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="BYuD tarifi (BHM)" hint={tariffUzs ? `≈ ${tariffUzs} so'm` : undefined}>
              <input value={form.mainTariffBhm} onChange={(e) => setMainTariff(e.target.value)} className={INPUT_CLASS} />
            </Field>
            {form.paymentModel !== 'PREPAID' && (
              <Field label="Kredit limiti (so'm)">
                <input type="number" value={form.creditLimit ?? ''} onChange={(e) => set('creditLimit', e.target.value || null)} className={INPUT_CLASS} />
              </Field>
            )}
          </div>
        </Section>
      </div>

      {/* Forma uzun — saqlash tugmasi doim ko'rinib tursin */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={save}
            disabled={saving || isTerminated}
            className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </div>

      {terminateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setTerminateOpen(false); }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <h3 className="mb-1 font-semibold">Shartnomani bekor qilish</h3>
            <p className="mb-3 text-sm text-gray-600">
              № {form.agreementNumber} — {form.customerName}. Bekor qilingandan keyin shartnoma tahrirlanmaydi.
            </p>
            <textarea
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              rows={3}
              placeholder="Bekor qilish sababi"
              className={INPUT_CLASS}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setTerminateOpen(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700">
                Yopish
              </button>
              <button
                onClick={terminate}
                disabled={terminating}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
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
