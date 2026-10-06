import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useIsMobile } from '../../utils/useIsMobile';
import type { Client, Contract, Branch, CreateTaskForm } from './types';

interface CreateInvoiceModalProps {
  open: boolean;
  isDuplicate: boolean;
  selectedClientId: string;
  setSelectedClientId: (val: string) => void;
  selectedContractId: string;
  setSelectedContractId: (val: string) => void;
  clients: Client[];
  contracts: Contract[];
  loadingContracts: boolean;
  branches: Branch[];
  createTaskForm: CreateTaskForm;
  setCreateTaskForm: React.Dispatch<React.SetStateAction<CreateTaskForm>>;
  creatingTask: boolean;
  onSubmit: () => void;
  onClose: () => void;
  onOpenClientProfile: (clientId: number) => void;
}

const FONT = "font-['Onest',system-ui,sans-serif]";
const MONO = "font-['JetBrains_Mono',ui-monospace,monospace]";
const LABEL = 'text-[13px] font-medium text-[#2B3340] dark:text-gray-300';
const INPUT =
  'w-full box-border rounded-[10px] border border-[#D5D9E0] dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-[#151A22] dark:text-gray-100 placeholder:text-[#8A92A0] outline-none focus:border-[#0B6E6E] focus:ring-[3px] focus:ring-[#0B6E6E]/15';
// Mobilda ko'rinadigan shartnomalar soni (qolgani "Yana N ta" orqali ochiladi)
const MOBILE_CONTRACTS_LIMIT = 2;

const initials = (name: string) =>
  name
    .replace(/["'«»[\]]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU');
};

const Required = () => <span className="text-[#B42318] dark:text-[#F97066]">*</span>;

const SectionTitle: React.FC<{ n: number; title: string }> = ({ n, title }) => (
  <div className="flex items-center gap-2.5">
    <span className="w-[22px] h-[22px] rounded-full bg-[#151A22] dark:bg-gray-100 text-white dark:text-[#151A22] text-xs font-bold flex items-center justify-center">
      {n}
    </span>
    <h3 className="m-0 text-[15px] font-semibold text-[#151A22] dark:text-gray-100">{title}</h3>
  </div>
);

const segClass = (on: boolean) =>
  `flex-1 min-w-[88px] h-10 rounded-[9px] text-sm font-semibold transition-colors truncate px-2 ${
    on
      ? 'bg-white dark:bg-slate-600 text-[#151A22] dark:text-white shadow-[0_1px_3px_rgba(21,26,34,0.14)]'
      : 'bg-transparent text-[#5B6472] dark:text-gray-400 hover:text-[#151A22] dark:hover:text-gray-200'
  }`;

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  open,
  isDuplicate,
  selectedClientId,
  setSelectedClientId,
  selectedContractId,
  setSelectedContractId,
  clients,
  contracts,
  loadingContracts,
  branches,
  createTaskForm,
  setCreateTaskForm,
  creatingTask,
  onSubmit,
  onClose,
  onOpenClientProfile,
}) => {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [showAllContracts, setShowAllContracts] = useState(false);
  // Mijoz tanlangach, ro'yxat yuklanishi boshlanguncha eski mijozning shartnomalari ko'rinmasligi uchun
  const [awaitingContracts, setAwaitingContracts] = useState(false);
  const contractsPending = awaitingContracts || loadingContracts;

  useEffect(() => {
    if (loadingContracts) setAwaitingContracts(false);
  }, [loadingContracts]);

  // Oyna yopilganda qidiruv va "ko'proq" holatini tozalash
  useEffect(() => {
    if (!open) {
      setQuery('');
      setShowAllContracts(false);
      setAwaitingContracts(false);
    }
  }, [open]);

  useEffect(() => {
    setShowAllContracts(false);
  }, [selectedClientId]);

  // Mijozda bitta shartnoma bo'lsa — avtomatik tanlanadi
  useEffect(() => {
    if (selectedClientId && !contractsPending && contracts.length === 1 && !selectedContractId) {
      setSelectedContractId(String(contracts[0].id));
    }
  }, [selectedClientId, contractsPending, contracts, selectedContractId, setSelectedContractId]);

  // Esc bilan yopish
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const client = useMemo(
    () => clients.find((c) => String(c.id) === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    const qDigits = q.replace(/\s/g, '');
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (!!qDigits && (c.inn ?? '').replace(/\s/g, '').includes(qDigits))
    );
  }, [clients, query]);

  const activeBranches = branches.filter((b) => b.isActive !== false);

  const visibleContracts =
    isMobile && !showAllContracts ? contracts.slice(0, MOBILE_CONTRACTS_LIMIT) : contracts;
  const hiddenContractsCount = contracts.length - visibleContracts.length;

  const missing: string[] = [];
  if (!selectedClientId) missing.push('mijoz');
  else if (!selectedContractId) missing.push('shartnoma');
  if (!createTaskForm.branchId) missing.push('filial');
  const ready = missing.length === 0 && !contractsPending;

  const pickClient = (c: Client) => {
    setAwaitingContracts(true);
    setSelectedClientId(String(c.id));
    setSelectedContractId('');
    setQuery('');
  };

  const changeClient = () => {
    setSelectedClientId('');
    setSelectedContractId('');
  };

  const header = (
    <div
      className={
        isMobile
          ? 'px-4 pt-3 pb-3.5 border-b border-[#E3E6EB] dark:border-slate-700 flex items-center gap-2.5'
          : 'px-6 pt-[22px] pb-[18px] border-b border-[#E3E6EB] dark:border-slate-700 flex items-start gap-3.5'
      }
    >
      {!isMobile && (
        <div className="w-11 h-11 rounded-xl bg-[#E3F3F1] dark:bg-[#0B6E6E]/25 text-[#0B6E6E] dark:text-[#5FD0C8] flex items-center justify-center shrink-0">
          <Icon icon="solar:document-add-linear" className="w-[22px] h-[22px]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2
          id="create-invoice-title"
          className={`m-0 font-bold tracking-[-0.01em] text-[#151A22] dark:text-gray-100 ${isMobile ? 'text-lg' : 'text-xl'}`}
        >
          Yangi invoys
        </h2>
        {!isMobile && (
          <p className="mt-1 mb-0 text-[13px] leading-[1.45] text-[#5B6472] dark:text-gray-400">
            {isDuplicate
              ? 'Tanlangan invoys nusxasi asosida yaratiladi'
              : "Invoys va unga bog'langan jarayon birga yaratiladi"}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Yopish"
        className={`w-11 h-11 flex items-center justify-center text-[#5B6472] dark:text-gray-400 hover:text-[#151A22] dark:hover:text-gray-100 transition-colors ${
          isMobile ? 'rounded-full bg-[#F3F5F8] dark:bg-slate-700' : 'rounded-[10px] -mt-1.5 -mr-2 hover:bg-[#F3F5F8] dark:hover:bg-slate-700'
        }`}
      >
        <Icon icon="solar:close-circle-linear" className="w-5 h-5" />
      </button>
    </div>
  );

  const clientSection = (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="create-invoice-client-search" className={LABEL}>
        Mijoz <Required />
      </label>
      {client ? (
        <div className="border border-[#D5D9E0] dark:border-slate-600 rounded-xl py-2.5 pl-3 pr-2.5 flex items-center gap-3">
          <span className="w-[38px] h-[38px] rounded-[10px] bg-[#E3F3F1] dark:bg-[#0B6E6E]/25 text-[#0B6E6E] dark:text-[#5FD0C8] text-[13px] font-bold flex items-center justify-center shrink-0">
            {initials(client.name)}
          </span>
          <span className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-[#151A22] dark:text-gray-100 truncate">{client.name}</span>
            {client.inn && <span className="text-xs text-[#5B6472] dark:text-gray-400">INN {client.inn}</span>}
          </span>
          <button
            type="button"
            onClick={changeClient}
            className={
              isMobile
                ? 'h-11 px-3 text-[13px] font-semibold text-[#0B6E6E] dark:text-[#5FD0C8]'
                : 'h-11 px-3.5 border border-[#D5D9E0] dark:border-slate-600 bg-white dark:bg-slate-800 rounded-[10px] text-[13px] font-semibold text-[#151A22] dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors'
            }
          >
            O&apos;zgartirish
          </button>
        </div>
      ) : (
        <div className="border border-[#D5D9E0] dark:border-slate-600 rounded-xl overflow-hidden">
          <div className="relative border-b border-[#E3E6EB] dark:border-slate-700">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6472] dark:text-gray-400 flex pointer-events-none">
              <Icon icon="solar:magnifer-linear" className="w-[18px] h-[18px]" />
            </span>
            <input
              id="create-invoice-client-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mijoz nomi yoki INN bo'yicha qidirish"
              autoFocus={!isMobile}
              className={`w-full box-border h-11 border-0 pl-[42px] pr-3.5 bg-[#F8F9FB] dark:bg-slate-900 text-[#151A22] dark:text-gray-100 placeholder:text-[#8A92A0] outline-none ${isMobile ? 'text-base' : 'text-sm'}`}
            />
          </div>
          <div className="max-h-[236px] overflow-y-auto p-1.5">
            {filteredClients.map((c) => {
              const n = c._count?.contracts;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickClient(c)}
                  className="w-full min-h-[52px] rounded-lg px-2.5 py-2 flex items-center gap-3 text-left hover:bg-[#F3F5F8] dark:hover:bg-slate-700/60 transition-colors"
                >
                  <span className="w-[34px] h-[34px] rounded-[9px] bg-[#EEF1F5] dark:bg-slate-700 text-[#2B3340] dark:text-gray-200 text-xs font-bold flex items-center justify-center shrink-0">
                    {initials(c.name)}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-[#151A22] dark:text-gray-100 truncate">{c.name}</span>
                    {c.inn && <span className="text-xs text-[#5B6472] dark:text-gray-400">INN {c.inn}</span>}
                  </span>
                  {n !== undefined && (
                    <span
                      className={`text-xs font-medium shrink-0 ${
                        n > 0 ? 'text-[#5B6472] dark:text-gray-400' : 'text-[#B42318] dark:text-[#F97066]'
                      }`}
                    >
                      {n > 0 ? `${n} ta shartnoma` : "Shartnoma yo'q"}
                    </span>
                  )}
                </button>
              );
            })}
            {filteredClients.length === 0 && (
              <div className="py-[18px] px-2.5 text-[13px] text-[#5B6472] dark:text-gray-400 text-center">
                {clients.length === 0 ? 'Mijozlar yuklanmoqda...' : 'Hech narsa topilmadi'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const contractSection = client && (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span id="create-invoice-contract-label" className={LABEL}>
          Shartnoma <Required />
        </span>
        {!contractsPending && contracts.length > 0 && (
          <span className="text-xs text-[#5B6472] dark:text-gray-400">{contracts.length} ta</span>
        )}
      </div>
      {contractsPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[#EEF1F5] dark:bg-slate-700/60 animate-pulse" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="border border-[#F4C7C3] dark:border-[#7A1A12] bg-[#FEF3F2] dark:bg-[#B42318]/15 rounded-xl p-3.5 flex gap-3 items-start">
          <Icon icon="solar:danger-circle-linear" className="w-5 h-5 mt-px shrink-0 text-[#B42318] dark:text-[#F97066]" />
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[13px] leading-normal text-[#7A1A12] dark:text-[#FDA29B]">
              Bu mijozda shartnoma yo&apos;q. Invoys yaratish uchun avval shartnoma qo&apos;shing.
            </span>
            <button
              type="button"
              onClick={() => onOpenClientProfile(client.id)}
              className="self-start text-[13px] font-semibold text-[#B42318] dark:text-[#F97066] underline underline-offset-2"
            >
              Mijoz profilida shartnoma qo&apos;shish →
            </button>
          </div>
        </div>
      ) : (
        <div role="radiogroup" aria-labelledby="create-invoice-contract-label" className="flex flex-col gap-2">
          {visibleContracts.map((k) => {
            const sel = selectedContractId === String(k.id);
            return (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => setSelectedContractId(String(k.id))}
                className={`w-full box-border rounded-xl flex items-center gap-3 text-left transition-colors ${
                  isMobile ? 'min-h-[60px] px-3 py-2.5' : 'min-h-16 px-3.5 py-3'
                } ${
                  sel
                    ? 'border-[1.5px] border-[#0B6E6E] dark:border-[#5FD0C8] bg-[#F2FAF9] dark:bg-[#0B6E6E]/15'
                    : 'border border-[#D5D9E0] dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-[#B5BCC7] dark:hover:border-slate-500'
                }`}
              >
                <span
                  className={`w-[18px] h-[18px] rounded-full box-border shrink-0 flex items-center justify-center border-2 ${
                    sel ? 'border-[#0B6E6E] dark:border-[#5FD0C8]' : 'border-[#B5BCC7] dark:border-slate-500'
                  }`}
                >
                  {sel && <span className="w-2 h-2 rounded-full bg-[#0B6E6E] dark:bg-[#5FD0C8]" />}
                </span>
                <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className={`${MONO} text-[13px] font-medium text-[#151A22] dark:text-gray-100`}>{k.contractNumber}</span>
                    <span className="text-xs text-[#5B6472] dark:text-gray-400">
                      {isMobile ? '· ' : ''}
                      {formatDate(k.contractDate)}
                    </span>
                  </span>
                  <span className="text-[13px] text-[#2B3340] dark:text-gray-300 truncate">Xaridor: {k.buyerName}</span>
                </span>
                {!isMobile && <span className="text-[11px] text-[#8A92A0] shrink-0">ID {k.id}</span>}
              </button>
            );
          })}
          {hiddenContractsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllContracts(true)}
              className="h-10 px-0.5 text-left text-[13px] font-semibold text-[#0B6E6E] dark:text-[#5FD0C8]"
            >
              Yana {hiddenContractsCount} ta shartnomani ko&apos;rsatish
            </button>
          )}
        </div>
      )}
    </div>
  );

  const branchField = (
    <div className="flex flex-col gap-1.5">
      <span id="create-invoice-branch-label" className={LABEL}>
        Filial <Required />
      </span>
      {activeBranches.length > 0 ? (
        <div
          role="radiogroup"
          aria-labelledby="create-invoice-branch-label"
          className="flex flex-wrap gap-1 p-1 bg-[#EEF1F5] dark:bg-slate-900 rounded-xl"
        >
          {activeBranches.map((b) => {
            const on = createTaskForm.branchId === String(b.id);
            return (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setCreateTaskForm((f) => ({ ...f, branchId: String(b.id) }))}
                className={`${segClass(on)} ${isMobile ? 'text-[13px]' : ''}`}
                title={b.name}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-[#5B6472] dark:text-gray-400 py-2">Filiallar yuklanmoqda...</div>
      )}
    </div>
  );

  const psrField = (
    <div className="flex flex-col gap-1.5">
      <span id="create-invoice-psr-label" className={LABEL}>
        PSR <Required />
      </span>
      <div role="radiogroup" aria-labelledby="create-invoice-psr-label" className="flex gap-1 p-1 bg-[#EEF1F5] dark:bg-slate-900 rounded-xl">
        {[
          { v: true, label: 'Bor' },
          { v: false, label: "Yo'q" },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={createTaskForm.hasPsr === o.v}
            onClick={() => setCreateTaskForm((f) => ({ ...f, hasPsr: o.v }))}
            className={segClass(createTaskForm.hasPsr === o.v)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  const phoneField = (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="create-invoice-driver-phone" className={LABEL}>
        Sho&apos;pir telefoni
      </label>
      <input
        id="create-invoice-driver-phone"
        type="tel"
        inputMode="tel"
        value={createTaskForm.driverPhone}
        onChange={(e) => setCreateTaskForm((f) => ({ ...f, driverPhone: e.target.value }))}
        placeholder="+998 90 123 45 67"
        className={`${INPUT} ${MONO} ${isMobile ? 'h-12 text-base' : 'h-11 text-sm'}`}
      />
    </div>
  );

  const commentField = (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="create-invoice-comment" className={LABEL}>
        Izoh <span className="font-normal text-[#8A92A0]">— ixtiyoriy</span>
      </label>
      <textarea
        id="create-invoice-comment"
        rows={3}
        value={createTaskForm.comments}
        onChange={(e) => setCreateTaskForm((f) => ({ ...f, comments: e.target.value }))}
        placeholder={isMobile ? "Jarayon bo'yicha eslatma" : "Jarayon bo'yicha eslatma, masalan yuk yoki hujjatlar haqida"}
        className={`${INPUT} py-2.5 resize-none leading-normal ${isMobile ? 'text-base' : 'text-sm'}`}
      />
    </div>
  );

  const status = ready ? (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0B6E6E] dark:text-[#5FD0C8]">
      <Icon icon="solar:check-read-linear" className="w-4 h-4" />
      Hammasi tayyor
    </span>
  ) : missing.length > 0 ? (
    <span className="text-xs leading-[1.45] text-[#5B6472] dark:text-gray-400">
      Qoldi: <span className="font-semibold text-[#151A22] dark:text-gray-100">{missing.join(', ')}</span>
    </span>
  ) : null;

  const submitButton = (
    <button
      type="button"
      onClick={onSubmit}
      disabled={!ready || creatingTask}
      className={`rounded-[10px] font-semibold transition-colors bg-[#0B6E6E] text-white hover:bg-[#095C5C] disabled:bg-[#DDE1E7] disabled:text-[#6B7380] dark:disabled:bg-slate-700 dark:disabled:text-gray-400 disabled:cursor-not-allowed ${
        isMobile ? 'h-[52px] rounded-xl text-[15px] w-full' : 'h-11 px-5 text-sm'
      }`}
    >
      {creatingTask ? 'Yaratilmoqda...' : 'Invoys yaratish'}
    </button>
  );

  const footer = isMobile ? (
    <div className="border-t border-[#E3E6EB] dark:border-slate-700 px-4 pt-3 pb-[max(24px,env(safe-area-inset-bottom))] flex flex-col gap-2">
      {status}
      {submitButton}
    </div>
  ) : (
    <div className="border-t border-[#E3E6EB] dark:border-slate-700 bg-[#FAFBFC] dark:bg-slate-800/60 px-6 py-3.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">{status}</div>
      <button
        type="button"
        onClick={onClose}
        className="h-11 px-[18px] border border-[#D5D9E0] dark:border-slate-600 bg-white dark:bg-slate-800 rounded-[10px] text-sm font-semibold text-[#151A22] dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
      >
        Bekor qilish
      </button>
      {submitButton}
    </div>
  );

  const body = isMobile ? (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
      {clientSection}
      {contractSection}
      {branchField}
      {psrField}
      {phoneField}
      {commentField}
    </div>
  ) : (
    <div className="flex-1 overflow-y-auto px-6 pt-5 pb-6 flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionTitle n={1} title="Mijoz va shartnoma" />
        {clientSection}
        {contractSection}
      </section>
      <section className="flex flex-col gap-3.5">
        <SectionTitle n={2} title="Jarayon" />
        {branchField}
        <div className="grid grid-cols-2 gap-3.5">
          {psrField}
          {phoneField}
        </div>
      </section>
      {commentField}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex bg-[#151A22]/55 backdrop-blur-[2px] ${isMobile ? 'items-end' : 'items-center justify-center p-4'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-invoice-title"
            className={`${FONT} bg-white dark:bg-slate-800 text-[#151A22] dark:text-gray-100 flex flex-col overflow-hidden ${
              isMobile
                ? 'w-full h-[94dvh] rounded-t-[20px]'
                : 'w-full max-w-[600px] max-h-[min(880px,92vh)] rounded-[18px] shadow-[0_24px_64px_rgba(21,26,34,0.28)]'
            }`}
            initial={isMobile ? { y: '100%' } : { opacity: 0, y: 16 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && (
              <div className="flex justify-center pt-2">
                <span className="w-10 h-1 rounded-sm bg-[#D5D9E0] dark:bg-slate-600" />
              </div>
            )}
            {header}
            {body}
            {footer}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
