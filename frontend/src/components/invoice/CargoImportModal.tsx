import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import type { CargoPreviewRow } from './useCargoImport';

interface CargoImportModalProps {
  text: string;
  setText: (v: string) => void;
  loading: boolean;
  rows: CargoPreviewRow[];
  selectedKeys: Set<string>;
  toggleKey: (key: string) => void;
  toggleAll: (checked: boolean) => void;
  analyze: () => void;
  applyCargo: () => void;
  onClose: () => void;
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
                  ? 'Qaysi maydonlar to\'ldirilishini tekshiring'
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
                return (
                  <label
                    key={row.key}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      checked ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleKey(row.key)}
                      className="w-4 h-4 mt-0.5 accent-indigo-600 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-gray-500 leading-tight">{row.label}</div>
                      <div className="text-sm text-gray-900 break-words whitespace-pre-wrap leading-snug mt-0.5">
                        {row.newValue}
                      </div>
                      {row.currentValue && row.currentValue !== row.newValue && (
                        <div className="text-[11px] text-amber-600 mt-0.5 break-words">
                          Hozirgi qiymat almashtiriladi: {row.currentValue}
                        </div>
                      )}
                    </div>
                  </label>
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
              disabled={selectedKeys.size === 0}
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
