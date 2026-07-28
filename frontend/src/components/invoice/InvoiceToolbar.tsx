import React from 'react';
import type { ViewTab, FssFilePrefix } from './types';
import { Icon } from '@iconify/react';
import { InvoiceTabs } from './InvoiceTabs';

interface InvoiceToolbarProps {
  /** Taskda "Invoys" bosqichi bormi — holat chipi shunga qarab chiqadi */
  hasInvoysStage: boolean;
  invoysStageReady: boolean;
  markingReady: boolean;
  taskId: string | undefined;
  handleMarkInvoysReady: () => void;
  viewTab: ViewTab;
  setViewTab: (tab: ViewTab) => void;
  templatesDisabled: boolean;
  task: any;
  form: any;
  navigate: (to: any, options?: any) => void;
  // Dropdowns
  tirSmrDropdownRef: React.RefObject<HTMLDivElement | null>;
  tirSmrDropdownOpen: boolean;
  setTirSmrDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sertifikatlarDropdownRef: React.RefObject<HTMLDivElement | null>;
  sertifikatlarDropdownOpen: boolean;
  setSertifikatlarDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  invoysDropdownRef: React.RefObject<HTMLDivElement | null>;
  invoysDropdownOpen: boolean;
  setInvoysDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Download/generation functions
  generateSmrExcel: () => void;
  generateCmrDoc: () => void;
  generateTirExcel: () => void;
  generateST1Excel: () => void;
  generateCommodityEkExcel: () => void;
  generateInvoiceExcel: () => void;
  generatePdf: (withStamp: boolean) => void;
  generatePdfEn: () => void;
  openFssRegionSelector: () => void;
  openFssRegionPicker: (type: FssFilePrefix) => void;
  onOpenTaskModal: () => void;
  onOpenCargoImport: () => void;
  canEditEffective: boolean;
}

/**
 * Panel uslublari bitta joyda saqlanadi.
 *
 * Ilgari har bir tugma o'z rangida edi (emerald, sky, amber, indigo, kulrang) va
 * bu ranglar HECH QANDAY ma'no tashimasdi — nega TIR-SMR yashil, Invoys esa
 * moviy ekani tushunarsiz edi. Endi rang faqat ma'no tashiydigan ikki joyda:
 * bosqich holati (`Tayyor` chipi / `Tayyor qilish` tugmasi) va bitta asosiy
 * amal (`Jarayonlar`). Qolgan hammasi neytral.
 */
const ACTION_BTN =
  'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-40';

const PRIMARY_BTN =
  'inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-40';

const READY_BTN =
  'inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-40';

const MENU_PANEL =
  'absolute left-0 top-full z-20 mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg';

/**
 * `hover:bg-gray-100` ataylab — `hover:bg-gray-50` (#f9fafb) oq menyu fonida
 * deyarli sezilmaydi, ya'ni hover umuman yo'qdek tuyuladi. Ikkalasi ham
 * index.css'da dark mode uchun `--pd-elevated` ga o'giriladi.
 */
const MENU_ITEM =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40';

/** Ochiladigan menyu tugmasidagi kichik strelka */
const Chevron: React.FC = () => (
  <Icon icon="solar:alt-arrow-down-linear" className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
);

/** Tugma guruhlarini ajratuvchi ingichka chiziq */
const Sep: React.FC = () => (
  <span className="mx-0.5 hidden h-5 w-px bg-gray-200 sm:block" aria-hidden="true" />
);

export const InvoiceToolbar: React.FC<InvoiceToolbarProps> = React.memo(({
  hasInvoysStage,
  invoysStageReady,
  markingReady,
  taskId,
  handleMarkInvoysReady,
  viewTab,
  setViewTab,
  templatesDisabled,
  task,
  form,
  navigate,
  tirSmrDropdownRef,
  tirSmrDropdownOpen,
  setTirSmrDropdownOpen,
  sertifikatlarDropdownRef,
  sertifikatlarDropdownOpen,
  setSertifikatlarDropdownOpen,
  invoysDropdownRef,
  invoysDropdownOpen,
  setInvoysDropdownOpen,
  generateSmrExcel,
  generateCmrDoc,
  generateTirExcel,
  generateST1Excel,
  generateCommodityEkExcel,
  generateInvoiceExcel,
  generatePdf,
  generatePdfEn,
  openFssRegionSelector,
  openFssRegionPicker,
  onOpenTaskModal,
  onOpenCargoImport,
  canEditEffective,
}) => {
  const invoiceNumber = form?.invoiceNumber ? String(form.invoiceNumber).trim() : '';

  // Faqat "invoice" tabida ma'noga ega bo'lgan blankalar
  const isInvoiceTab = viewTab === 'invoice';

  // ST-1 / Ichki / Tashqi va Deklaratsiya faqat tuman tanlangan yoki Oltiariq
  // filiali bo'lganda ma'noga ega
  const branchName = task?.branch?.name?.toLowerCase() || '';
  const isOltiariqBranch = branchName.includes('oltiariq');
  const hasRegionSelected = Boolean(form.fssRegionInternalCode) || Boolean(form.fssRegionName);
  const hasRegionContext = isOltiariqBranch || hasRegionSelected;

  return (
    <div className="mb-4">
      {/* Hujjat nomi + amallar */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          title="Orqaga"
          aria-label="Orqaga"
        >
          <Icon icon="solar:arrow-left-linear" className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-baseline gap-1.5">
          <h1 className="truncate text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
            Invoys
          </h1>
          {invoiceNumber && (
            <span className="truncate text-base font-semibold tabular-nums text-gray-400 sm:text-lg">
              №{invoiceNumber}
            </span>
          )}
        </div>

        {/* "Invoys" bosqichining HAQIQIY holati. Ilgari bu yerda "Tayyor" so'zi
            qattiq yozilgan edi. `StageStatus` enum'i ikki qiymatli
            (BOSHLANMAGAN | TAYYOR) — nomlar TaskDetail'dagi bilan bir xil. */}
        {hasInvoysStage && (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              invoysStageReady
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Icon
              icon={invoysStageReady ? 'solar:check-circle-linear' : 'solar:clock-circle-linear'}
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
            {invoysStageReady ? 'Tayyor' : 'Boshlanmagan'}
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          {/* Matndan to'ldirish — faqat invoys "Tayyor" bo'lgunicha: keyin
              maydonlarni AI bilan qayta yozishning ma'nosi yo'q */}
          {!invoysStageReady && (
            <button
              type="button"
              onClick={onOpenCargoImport}
              disabled={!canEditEffective}
              className={ACTION_BTN}
              title="Mijozning matnli xabaridan invoys maydonlarini avtomatik to'ldirish"
            >
              <Icon icon="solar:document-add-linear" className="h-4 w-4" />
              <span className="hidden sm:inline">Matndan to&apos;ldirish</span>
            </button>
          )}

          {/* TIR-SMR */}
          {invoysStageReady && isInvoiceTab && (
            <div className="relative" ref={tirSmrDropdownRef as React.RefObject<HTMLDivElement>}>
              <button
                type="button"
                onClick={() => setTirSmrDropdownOpen((prev) => !prev)}
                disabled={templatesDisabled}
                className={ACTION_BTN}
                title="TIR yoki SMR blankasini Excel formatida yuklab olish"
                aria-expanded={tirSmrDropdownOpen}
                aria-haspopup="menu"
              >
                <Icon icon="solar:tram-linear" className="h-4 w-4" />
                TIR-SMR
                <Chevron />
              </button>
              {tirSmrDropdownOpen && (
                <div className={MENU_PANEL} role="menu">
                  <button
                    type="button"
                    onClick={() => { generateSmrExcel(); setTirSmrDropdownOpen(false); }}
                    disabled={templatesDisabled}
                    className={MENU_ITEM}
                    role="menuitem"
                  >
                    SMR
                  </button>
                  <button
                    type="button"
                    onClick={() => { generateTirExcel(); setTirSmrDropdownOpen(false); }}
                    disabled={templatesDisabled}
                    className={MENU_ITEM}
                    role="menuitem"
                  >
                    TIR
                  </button>
                  <button
                    type="button"
                    onClick={() => { generateCmrDoc(); setTirSmrDropdownOpen(false); }}
                    disabled={templatesDisabled}
                    className={MENU_ITEM}
                    role="menuitem"
                  >
                    CMR (Docx)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tuman */}
          {invoysStageReady && isInvoiceTab && (
            <button
              type="button"
              onClick={openFssRegionSelector}
              disabled={templatesDisabled}
              className={ACTION_BTN}
              title="Tuman tanlashni o'zgartirish"
            >
              <Icon icon="solar:map-point-linear" className="h-4 w-4" />
              Tuman
            </button>
          )}

          {/* Sertifikatlar */}
          {invoysStageReady && isInvoiceTab && hasRegionContext && (
            <div className="relative" ref={sertifikatlarDropdownRef as React.RefObject<HTMLDivElement>}>
              <button
                type="button"
                onClick={() => setSertifikatlarDropdownOpen((prev) => !prev)}
                disabled={templatesDisabled}
                className={ACTION_BTN}
                title="Sertifikatlar va blankalarni yuklab olish"
                aria-expanded={sertifikatlarDropdownOpen}
                aria-haspopup="menu"
              >
                <Icon icon="solar:diploma-linear" className="h-4 w-4" />
                Sertifikatlar
                <Chevron />
              </button>
              {sertifikatlarDropdownOpen && (
                <div className={MENU_PANEL} role="menu">
                  <button
                    type="button"
                    onClick={() => { openFssRegionPicker('Ichki'); setSertifikatlarDropdownOpen(false); }}
                    disabled={templatesDisabled}
                    className={MENU_ITEM}
                    role="menuitem"
                  >
                    Ichki
                  </button>
                  <button
                    type="button"
                    onClick={() => { openFssRegionPicker('Tashqi'); setSertifikatlarDropdownOpen(false); }}
                    disabled={templatesDisabled}
                    className={MENU_ITEM}
                    role="menuitem"
                  >
                    Tashqi
                  </button>
                  <button
                    type="button"
                    onClick={() => { generateST1Excel(); setSertifikatlarDropdownOpen(false); }}
                    disabled={templatesDisabled}
                    className={MENU_ITEM}
                    role="menuitem"
                  >
                    ST-1
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Invoys yuklab olish */}
          {invoysStageReady && (
            <div className="relative" ref={invoysDropdownRef as React.RefObject<HTMLDivElement>}>
              <button
                type="button"
                onClick={() => setInvoysDropdownOpen((prev) => !prev)}
                disabled={templatesDisabled}
                className={ACTION_BTN}
                title="Invoysni Excel yoki PDF formatida yuklab olish"
                aria-expanded={invoysDropdownOpen}
                aria-haspopup="menu"
              >
                <Icon icon="solar:file-download-linear" className="h-4 w-4" />
                Invoys
                <Chevron />
              </button>
              {invoysDropdownOpen && (
                <div className={MENU_PANEL} role="menu">
                  <button
                    type="button"
                    onClick={() => { generateInvoiceExcel(); setInvoysDropdownOpen(false); }}
                    disabled={templatesDisabled}
                    className={MENU_ITEM}
                    role="menuitem"
                  >
                    Invoys Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => { generatePdf(false); setInvoysDropdownOpen(false); }}
                    disabled={templatesDisabled}
                    className={MENU_ITEM}
                    role="menuitem"
                  >
                    Pechatsiz PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => { generatePdf(true); setInvoysDropdownOpen(false); }}
                    disabled={templatesDisabled}
                    className={MENU_ITEM}
                    role="menuitem"
                  >
                    Pechatli PDF
                  </button>
                  <div className="my-1 border-t border-gray-200" />
                  <button
                    type="button"
                    onClick={() => { generatePdfEn(); setInvoysDropdownOpen(false); }}
                    disabled={templatesDisabled}
                    className={`${MENU_ITEM} font-medium text-emerald-700`}
                    role="menuitem"
                  >
                    <Icon icon="solar:translation-linear" className="h-4 w-4" />
                    {viewTab === 'packing' ? 'English Packing List (AI)' : 'English Invoice (AI)'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Deklaratsiya */}
          {invoysStageReady && isInvoiceTab && hasRegionContext && (
            <button
              type="button"
              onClick={generateCommodityEkExcel}
              disabled={templatesDisabled}
              className={ACTION_BTN}
              title="Deklaratsiya (CommodityEk) shabloniga invoys ma'lumotlarini yozib Excel yuklab olish"
            >
              <Icon icon="solar:document-text-linear" className="h-4 w-4" />
              Deklaratsiya
            </button>
          )}

          <Sep />

          {!invoysStageReady && (
            <button
              type="button"
              onClick={handleMarkInvoysReady}
              disabled={markingReady || !taskId}
              className={READY_BTN}
              title="Invoys jarayonini tayyor qilish"
            >
              <Icon icon="solar:check-circle-linear" className="h-4 w-4" />
              {markingReady ? 'Jarayon...' : 'Tayyor'}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenTaskModal}
            disabled={!taskId}
            className={PRIMARY_BTN}
            title="Task jarayonlarini ko'rish va o'zgartirish"
          >
            <Icon icon="solar:layers-linear" className="h-4 w-4" />
            Jarayonlar
          </button>
        </div>
      </div>

      <InvoiceTabs viewTab={viewTab} setViewTab={setViewTab} />
    </div>
  );
});
