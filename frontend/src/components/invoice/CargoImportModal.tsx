import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { validateEditedValue } from './useCargoImport';
import type { CargoPreviewRow } from './useCargoImport';

interface CargoImportModalProps {
  text: string;
  setText: (v: string) => void;
  loading: boolean;
  rows: CargoPreviewRow[];
  selectedKeys: Set<string>;
  toggleKey: (key: string) => void;
  toggleAll: (checked: boolean) => void;
  /** Qo'lda tahrirlangan qiymatlar (qator kaliti → matn) */
  edits: Record<string, string>;
  editValue: (key: string, value: string) => void;
  revertValue: (key: string) => void;
  /** Belgilangan qatorlardan birida noto'g'ri qiymat bor — qo'llash bloklanadi */
  hasInvalidEdits: boolean;
  analyze: () => void;
  applyCargo: () => void;
  onClose: () => void;
}

const INPUT_CLASS =
  'w-full mt-1 px-2 py-1 border rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 transition-all';

/** Qator qiymatini tahrirlash maydoni — turi qatorga qarab (son, sana, valyuta, ko'p qatorli matn) */
function RowValueInput({
  row,
  value,
  invalid,
  onChange,
}: {
  row: CargoPreviewRow;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const className = `${INPUT_CLASS} ${
    invalid
      ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
      : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
  }`;

  if (row.input === 'multiline') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.min(Math.max(value.split('\n').length, 2), 6)}
        className={`${className} leading-snug resize-y`}
      />
    );
  }
  if (row.input === 'currency') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
        <option value="USD">USD</option>
        <option value="UZS">UZS</option>
      </select>
    );
  }
  return (
    <input
      type={row.input === 'date' ? 'date' : 'text'}
      inputMode={row.input === 'number' ? 'decimal' : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    />
  );
}

const PLACEHOLDER = `Mijoz yuborgan matnni shu yerga qo'ying, masalan:

Номер инвойса: PIN-98
Номер ТС: 40906MCA/405284BA
Год урожая: 2026
...`;

/**
 * "Matndan to'ldirish" modali — mijozning Telegram xabarini AI orqali tahlil qilib,
 * invoys maydonlariga moslashtirilgan ko'rinishda taqdim etadi.
 *
 * Ikki bosqich: (1) matn kiritish, (2) "maydon ← qiymat" ro'yxatini tasdiqlash.
 */
export function CargoImportModal({
  text,
  setText,
  loading,
  rows,
  selectedKeys,
  toggleKey,
  toggleAll,
  edits,
  editValue,
  revertValue,
  hasInvalidEdits,
  analyze,
  applyCargo,
  onClose,
}: CargoImportModalProps) {
  const hasPreview = rows.length > 0;
  const allSelected = hasPreview && rows.every((r) => selectedKeys.has(r.key));

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Sticky sarlavha */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Icon icon="solar:document-add-bold-duotone" className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-800 leading-tight">Matndan to&apos;ldirish</h2>
              <p className="text-[11px] text-gray-400 leading-tight">
                {hasPreview
                  ? 'Qaysi maydonlar to\'ldirilishini tekshiring — qiymatni shu yerda tuzatish mumkin'
                  : 'Отправитель, Изготовитель va Клиент qatorlari e\'tiborga olinmaydi'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0"
            title="Yopish"
          >
            <Icon icon="solar:close-circle-bold-duotone" className="w-5 h-5" />
          </button>
        </div>

        {/* Scroll qismi */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!hasPreview ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={14}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-2 pb-2 border-b border-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Barchasi ({rows.length})
                </span>
              </label>

              {rows.map((row) => {
                const checked = selectedKeys.has(row.key);
                const edited = row.key in edits;
                const value = edited ? edits[row.key] : row.newValue;
                const error = edited && checked ? validateEditedValue(row, value) : null;
                return (
                  <div
                    key={row.key}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                      checked ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleKey(row.key)}
                      aria-label={row.label}
                      className="w-4 h-4 mt-0.5 accent-indigo-600 shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleKey(row.key)}
                          className="text-xs font-medium text-gray-500 leading-tight text-left cursor-pointer"
                        >
                          {row.label}
                        </button>
                        {edited && (
                          <>
                            <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                              tahrirlandi
                            </span>
                            <button
                              type="button"
                              onClick={() => revertValue(row.key)}
                              title={`Asl qiymatga qaytarish: ${row.newValue}`}
                              className="ml-auto text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              <Icon icon="solar:undo-left-round-bold-duotone" className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                      {row.clear ? (
                        <div className="text-sm leading-snug mt-0.5 text-rose-600 italic">
                          Matnda bo&apos;sh — maydon tozalanadi
                        </div>
                      ) : (
                        <RowValueInput
                          row={row}
                          value={value}
                          invalid={error !== null}
                          onChange={(next) => editValue(row.key, next)}
                        />
                      )}
                      {error && <div className="text-[11px] text-rose-600 mt-0.5">{error}</div>}
                      {row.currentValue && row.currentValue !== value && (
                        <div className="text-[11px] text-amber-600 mt-0.5 break-words">
                          {row.clear
                            ? `O'chiriladigan eski qiymat: ${row.currentValue}`
                            : `Hozirgi qiymat almashtiriladi: ${row.currentValue}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            Bekor qilish
          </button>
          {!hasPreview ? (
            <button
              type="button"
              onClick={analyze}
              disabled={loading || !text.trim()}
              className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {loading && <Icon icon="solar:refresh-bold-duotone" className="w-4 h-4 animate-spin" />}
              {loading ? 'Tahlil qilinmoqda...' : 'Tahlil qilish'}
            </button>
          ) : (
            <button
              type="button"
              onClick={applyCargo}
              disabled={selectedKeys.size === 0 || hasInvalidEdits}
              title={hasInvalidEdits ? 'Qizil belgilangan qiymatlarni tuzating' : undefined}
              className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Qo&apos;llash ({selectedKeys.size})
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
