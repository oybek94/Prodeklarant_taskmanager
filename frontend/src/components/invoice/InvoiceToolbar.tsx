import React from 'react';
import type { ViewTab, FssFilePrefix } from './types';
import { Icon } from '@iconify/react';

interface InvoiceToolbarProps {
  invoysStageReady: boolean;
  markingReady: boolean;
  taskId: string | undefined;
  handleMarkInvoysReady: () => void;
  viewTab: ViewTab;
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
  generateTirExcel: () => void;
  generateST1Excel: () => void;
  generateCommodityEkExcel: () => void;
  generateInvoiceExcel: () => void;
  generatePdf: (withStamp: boolean) => void;
  generatePdfEn: () => void;
  openFssRegionSelector: () => void;
  openFssRegionPicker: (type: FssFilePrefix) => void;
}

export const InvoiceToolbar: React.FC<InvoiceToolbarProps> = ({
  invoysStageReady,
  markingReady,
  taskId,
  handleMarkInvoysReady,
  viewTab,
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
  generateTirExcel,
  generateST1Excel,
  generateCommodityEkExcel,
  generateInvoiceExcel,
  generatePdf,
  generatePdfEn,
  openFssRegionSelector,
  openFssRegionPicker,
}) => {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Invoice</h1>

      <div className="flex flex-wrap items-center gap-2">
        {!invoysStageReady && (
          <button
            type="button"
            onClick={handleMarkInvoysReady}
            disabled={markingReady || !taskId}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:bg-amber-300 disabled:opacity-50"
            title="Invoys jarayonini tayyor qilish"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path
                fill="currentColor"
                d="M7.75 13.5 4.5 10.25l1.4-1.4 1.85 1.85 6.35-6.35 1.4 1.4z"
              />
            </svg>
            {markingReady ? 'Jarayon...' : 'Tayyor'}
          </button>
        )}

        {/* TIR-SMR dropdown */}
        {invoysStageReady && viewTab === 'invoice' && (
          <div className="relative" ref={tirSmrDropdownRef as React.RefObject<HTMLDivElement>}>
            <button
              type="button"
              onClick={() => setTirSmrDropdownOpen((prev) => !prev)}
              disabled={templatesDisabled}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="TIR yoki SMR blankasini Excel formatida yuklab olish"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M10 2a1 1 0 0 1 1 1v7.59l2.3-2.3 1.4 1.42-4.7 4.7-4.7-4.7 1.4-1.42 2.3 2.3V3a1 1 0 0 1 1-1z"
                />
                <path
                  fill="currentColor"
                  d="M4 16a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z"
                />
              </svg>
              TIR-SMR
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 ml-0.5" aria-hidden="true">
                <path fill="currentColor" d="M10 12 5 7h10l-5 5z" />
              </svg>
            </button>
            {tirSmrDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-40 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <button
                  type="button"
                  onClick={() => {
                    generateSmrExcel();
                    setTirSmrDropdownOpen(false);
                  }}
                  disabled={templatesDisabled}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SMR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    generateTirExcel();
                    setTirSmrDropdownOpen(false);
                  }}
                  disabled={templatesDisabled}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  TIR
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tuman tugmasi */}
        {invoysStageReady && viewTab === 'invoice' && (
          (() => {
            const branchName = task?.branch?.name?.toLowerCase() || '';
            const isOltiariqBranch = branchName.includes('oltiariq');
            if (isOltiariqBranch) return null;
            return (
              <button
                type="button"
                onClick={openFssRegionSelector}
                disabled={templatesDisabled}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Tuman tanlashni o'zgartirish"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M4 3h7l5 5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm7 1.5V7h3.5L11 4.5z"
                  />
                  <path
                    fill="currentColor"
                    d="M5 11h10v2H5zm0-4h6v2H5z"
                  />
                </svg>
                Tuman
              </button>
            );
          })()
        )}

        {/* Sertifikatlar dropdown */}
        {invoysStageReady && viewTab === 'invoice' && (
          <div className="relative" ref={sertifikatlarDropdownRef as React.RefObject<HTMLDivElement>}>
            <button
              type="button"
              onClick={() => setSertifikatlarDropdownOpen((prev) => !prev)}
              disabled={templatesDisabled}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sertifikatlar va blankalarni yuklab olish"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M5 2h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm7 1.5V7h3.5L12 3.5z"
                />
              </svg>
              Sertifikatlar
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 ml-0.5" aria-hidden="true">
                <path fill="currentColor" d="M10 12 5 7h10l-5 5z" />
              </svg>
            </button>
            {sertifikatlarDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-52 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                {(() => {
                  const branchName = task?.branch?.name?.toLowerCase() || '';
                  const isOltiariqBranch = branchName.includes('oltiariq');
                  const hasRegionSelected =
                    Boolean(form.fssRegionInternalCode) || Boolean(form.fssRegionName);
                  const showIchkiTashqiSt1 = isOltiariqBranch || hasRegionSelected;
                  return (
                    <>
                      {showIchkiTashqiSt1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              openFssRegionPicker('Ichki');
                              setSertifikatlarDropdownOpen(false);
                            }}
                            disabled={templatesDisabled}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Ichki
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              openFssRegionPicker('Tashqi');
                              setSertifikatlarDropdownOpen(false);
                            }}
                            disabled={templatesDisabled}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Tashqi
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              generateST1Excel();
                              setSertifikatlarDropdownOpen(false);
                            }}
                            disabled={templatesDisabled}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ST-1
                          </button>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Invoys dropdown */}
        {invoysStageReady && (
          <div className="relative" ref={invoysDropdownRef as React.RefObject<HTMLDivElement>}>
            <button
              type="button"
              onClick={() => setInvoysDropdownOpen((prev) => !prev)}
              disabled={templatesDisabled}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Invoysni Excel yoki PDF formatida yuklab olish"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M5 2h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm7 1.5V7h3.5L12 3.5z"
                />
              </svg>
              Invoys
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 ml-0.5" aria-hidden="true">
                <path fill="currentColor" d="M10 12 5 7h10l-5 5z" />
              </svg>
            </button>
            {invoysDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-52 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <button
                  type="button"
                  onClick={() => {
                    generateInvoiceExcel();
                    setInvoysDropdownOpen(false);
                  }}
                  disabled={templatesDisabled}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Invoys Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    generatePdf(false);
                    setInvoysDropdownOpen(false);
                  }}
                  disabled={templatesDisabled}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Pechatsiz PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    generatePdf(true);
                    setInvoysDropdownOpen(false);
                  }}
                  disabled={templatesDisabled}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Pechatli PDF
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  type="button"
                  onClick={() => {
                    generatePdfEn();
                    setInvoysDropdownOpen(false);
                  }}
                  disabled={templatesDisabled}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon icon="heroicons:language" className="w-4 h-4" />
                  English Invoice (AI)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Deklaratsiya tugmasi */}
        {invoysStageReady && viewTab === 'invoice' && (
          (() => {
            const branchName = task?.branch?.name?.toLowerCase() || '';
            const isOltiariqBranch = branchName.includes('oltiariq');
            const hasRegionSelected =
              Boolean(form.fssRegionInternalCode) || Boolean(form.fssRegionName);
            if (!isOltiariqBranch && !hasRegionSelected) return null;
            return (
              <button
                type="button"
                onClick={generateCommodityEkExcel}
                disabled={templatesDisabled}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:bg-amber-300"
                title="Deklaratsiya (CommodityEk) shabloniga invoys ma'lumotlarini yozib Excel yuklab olish"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path fill="currentColor" d="M10 2a1 1 0 0 1 1 1v7.59l2.3-2.3 1.4 1.42-4.7 4.7-4.7-4.7 1.4-1.42 2.3 2.3V3a1 1 0 0 1 1-1z" />
                  <path fill="currentColor" d="M4 16a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z" />
                </svg>
                Deklaratsiya
              </button>
            );
          })()
        )}

        {/* Orqaga tugmasi */}
        {invoysStageReady && viewTab === 'invoice' && (
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path fill="currentColor" d="M12.5 4.5 7 10l5.5 5.5-1.4 1.4L4.2 10l6.9-6.9z" />
            </svg>
            Orqaga
          </button>
        )}
      </div>
    </div>
  );
};
