import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import {
  PDF_FONT_SECTIONS,
  PDF_FONT_MIN,
  PDF_FONT_MAX,
  type PdfFontSizes,
  type PdfSectionKey,
} from './pdf/pdfFontSizes';

interface PdfFontSizeModalProps {
  pdfFontSizes: PdfFontSizes;
  setPdfFontSizes: (sizes: PdfFontSizes) => void;
  canEdit: boolean;
  onClose: () => void;
}

const SIZE_OPTIONS = Array.from(
  { length: PDF_FONT_MAX - PDF_FONT_MIN + 1 },
  (_, i) => PDF_FONT_MIN + i
);

/**
 * PDF bo'limlarining shrift o'lchamini tanlash.
 *
 * "Avto" — hozirgi xatti-harakat: shrift sahifadagi ma'lumot miqdoriga qarab
 * avtomatik tanlanadi. Aniq o'lcham tanlansa u QAT'IY bo'ladi va auto-fit unga
 * tegmaydi (qarang: `pdf/pdfFontSizes.ts`).
 */
export function PdfFontSizeModal({
  pdfFontSizes,
  setPdfFontSizes,
  canEdit,
  onClose,
}: PdfFontSizeModalProps) {
  const setSize = (key: PdfSectionKey, value: string) => {
    const next = { ...pdfFontSizes };
    if (value === '') delete next[key];
    else next[key] = Number(value);
    setPdfFontSizes(next);
  };

  const hasOverrides = Object.keys(pdfFontSizes).length > 0;

  return (
    <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <motion.div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-gray-800">PDF shrift o&apos;lchamlari</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Yopish"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          &laquo;Avto&raquo; &mdash; shrift sahifadagi ma&apos;lumot miqdoriga qarab tanlanadi.
          Aniq o&apos;lcham tanlansa PDF&apos;da aynan shu o&apos;lcham ishlatiladi.
        </p>

        <div className="space-y-3">
          {PDF_FONT_SECTIONS.map((section) => (
            <div key={section.key} className="flex items-center justify-between gap-3">
              <label
                htmlFor={`pdf-font-${section.key}`}
                className="text-sm text-gray-700"
              >
                {section.label}
              </label>
              <select
                id={`pdf-font-${section.key}`}
                value={pdfFontSizes[section.key] ?? ''}
                onChange={(e) => setSize(section.key, e.target.value)}
                disabled={!canEdit}
                className="w-28 shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Avto</option>
                {SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size} pt</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Jadvalda kenglik FIZIK cheklov — ustunlar sig'masa shrift baribir
            kichrayadi (qarang: PdfItemsTable.fitTable). Foydalanuvchi 12pt
            tanlab, PDF'da 8pt ko'rganda buni tushunishi kerak. */}
        {pdfFontSizes.itemsTable !== undefined && (
          <p className="mt-4 flex items-start gap-1.5 text-xs text-amber-700">
            <Icon icon="solar:info-circle-linear" className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Jadval uchun tanlangan o&apos;lcham ustunlar kengligiga sig&apos;masa
              avtomatik kichrayadi.
            </span>
          </p>
        )}

        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t">
          <button
            type="button"
            onClick={() => setPdfFontSizes({})}
            disabled={!canEdit || !hasOverrides}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Hammasini avtoga qaytarish
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Yopish
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
