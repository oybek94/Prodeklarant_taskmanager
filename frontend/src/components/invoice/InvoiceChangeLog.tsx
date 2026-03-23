import type { ChangeLogEntry } from './types';

interface InvoiceChangeLogProps {
  changeLog: ChangeLogEntry[];
}

/**
 * Invoice o'zgarishlar hisoboti — faqat ADMIN uchun ko'rinadi.
 * Tovarlar ro'yxati va umumiy qator statistikasi filtrlangan.
 */
export function InvoiceChangeLog({ changeLog }: InvoiceChangeLogProps) {
  const filteredEntries = changeLog.filter((entry) => {
    if (entry.fieldLabel === "Tovarlar ro'yxati" || entry.fieldLabel === 'Tovarlar') return false;
    if (/^\d+ ta qator, jami /.test(entry.oldValue) || /^\d+ ta qator, jami /.test(entry.newValue)) return false;
    return true;
  });

  if (filteredEntries.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <h3 className="text-sm font-semibold text-amber-900 mb-3">O&apos;zgarishlar hisoboti</h3>
      <ul className="space-y-2 text-sm">
        {filteredEntries.map((entry, idx) => (
          <li key={idx} className="text-gray-700 flex flex-wrap items-baseline gap-x-2">
            <span>
              <span className="font-medium text-amber-800">{entry.fieldLabel}:</span>{' '}
              Oldin <span className="text-gray-600">{entry.oldValue}</span>, hozir <span className="font-medium text-gray-900">{entry.newValue}</span>
            </span>
            {entry.changedAt && (
              <span className="text-xs text-gray-500 whitespace-nowrap">— {entry.changedAt}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
