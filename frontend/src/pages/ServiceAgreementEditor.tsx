import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import AgreementPreview from '../components/serviceAgreement/AgreementPreview';
import { createAgreement, getAgreement, getNextNumber, terminateAgreement, updateAgreement } from '../features/serviceAgreement/api';
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
        customerAddress: c.address,
        customerBankName: c.bankName,
        customerBankAccount: c.bankAccount,
        customerPhone: c.phone,
        customerEmail: c.email,
        customerDirector: c.director,
        customerMfo: c.mfo,
        customerOked: c.oked,
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
        await apiClient.patch(`/clients/${form.clientId}`, {
          director: form.customerDirector,
          mfo: form.customerMfo,
          oked: form.customerOked,
        }).catch(() => toast.error('Mijoz kartochkasi yangilanmadi'));
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

  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
      <div className="space-y-6">
        {/* Holat paneli — faqat saqlangan shartnoma uchun */}
        {id && (
          <section className="rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">№ {form.agreementNumber}</div>
                <div className="text-xs text-gray-500">
                  {new Date(form.agreementDate).toLocaleDateString('ru-RU')} — {form.customerName}
                </div>
              </div>

              {isTerminated ? (
                <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                  {STATUS_LABEL.TERMINATED}
                </span>
              ) : (
                <div className="flex items-center gap-2">
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
                </div>
              )}
            </div>

            {isTerminated && (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {form.terminatedAt && `${new Date(form.terminatedAt).toLocaleDateString('ru-RU')} — `}
                Sabab: {form.terminationReason || '—'}
              </div>
            )}
          </section>
        )}

        {/* 1. Mijoz va rekvizitlar */}
        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 font-semibold">1. Mijoz va rekvizitlar</h2>
          <select
            value={form.clientId || ''}
            onChange={(e) => pickClient(Number(e.target.value))}
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Mijozni tanlang</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="Korxona nomi" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.customerInn ?? ''} onChange={(e) => set('customerInn', e.target.value)} placeholder="INN" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.customerDirector ?? ''} onChange={(e) => set('customerDirector', e.target.value)} placeholder="Direktor F.I.Sh." className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.customerMfo ?? ''} onChange={(e) => set('customerMfo', e.target.value)} placeholder="MFO" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.customerOked ?? ''} onChange={(e) => set('customerOked', e.target.value)} placeholder="OKED" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.customerAddress ?? ''} onChange={(e) => set('customerAddress', e.target.value)} placeholder="Manzil" className="rounded-lg border border-gray-300 px-3 py-2" />
          </div>

          {canSyncToClient && (
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={syncToClient} onChange={(e) => setSyncToClient(e.target.checked)} />
              Direktor, MFO va OKED ni mijoz kartochkasiga ham saqlash
            </label>
          )}
        </section>

        {/* 2. To'lov modeli */}
        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 font-semibold">2. To'lov modeli</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {(Object.keys(PAYMENT_MODEL_LABEL) as PaymentModel[]).map((model) => (
              <button
                key={model}
                onClick={() => set('paymentModel', model)}
                className={`rounded-lg px-3 py-2 text-sm ${form.paymentModel === model ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {PAYMENT_MODEL_LABEL[model]}
              </button>
            ))}
          </div>

          {form.paymentModel === 'MONTHLY' && (
            <input type="number" min={1} max={28} value={form.monthlyDueDay ?? ''} onChange={(e) => set('monthlyDueDay', Number(e.target.value) || null)} placeholder="Oyning sanasi (1–28)" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          )}
          {form.paymentModel === 'PER_COUNT' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="number" value={form.perCountThreshold ?? ''} onChange={(e) => set('perCountThreshold', Number(e.target.value) || null)} placeholder="Necha ta ishda" className="rounded-lg border border-gray-300 px-3 py-2" />
              <input type="number" value={form.perCountDueDays ?? ''} onChange={(e) => set('perCountDueDays', Number(e.target.value) || null)} placeholder="Necha bank kuni ichida" className="rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          )}
          {form.paymentModel === 'PER_AMOUNT' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="number" value={form.perAmountThreshold ?? ''} onChange={(e) => set('perAmountThreshold', e.target.value || null)} placeholder="Qaysi summada (so'm)" className="rounded-lg border border-gray-300 px-3 py-2" />
              <input type="number" value={form.perAmountDueDays ?? ''} onChange={(e) => set('perAmountDueDays', Number(e.target.value) || null)} placeholder="Necha bank kuni ichida" className="rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          )}
          {form.paymentModel !== 'PREPAID' && (
            <input type="number" value={form.creditLimit ?? ''} onChange={(e) => set('creditLimit', e.target.value || null)} placeholder="Kredit limiti (so'm)" className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2" />
          )}
        </section>

        {/* 3. Qo'shimcha shartlar */}
        <section className="rounded-xl border border-gray-200 p-4">
          <h2 className="mb-3 font-semibold">3. Qo'shimcha shartlar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.mainTariffBhm} onChange={(e) => setMainTariff(e.target.value)} placeholder="BYuD tarifi (BHM)" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.jurisdictionCourt ?? ''} onChange={(e) => set('jurisdictionCourt', e.target.value)} placeholder="Sud" className="rounded-lg border border-gray-300 px-3 py-2" />
            <input value={form.brokerRegistryNumber ?? ''} onChange={(e) => set('brokerRegistryNumber', e.target.value)} placeholder="Broker reestri raqami (bo'sh — 2.3-band tushadi)" className="rounded-lg border border-gray-300 px-3 py-2 sm:col-span-2" />
          </div>
        </section>

        <button onClick={save} disabled={saving || isTerminated} className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saqlanmoqda…' : 'Saqlash'}
        </button>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <AgreementPreview agreement={form} bhmUzs={bhmUzs} />
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
