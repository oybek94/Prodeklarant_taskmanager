import type { InvoiceItem } from './types';
import { formatNumber, isTareInRange } from './invoiceUtils';

interface InvoiceWeightSummaryProps {
  items: InvoiceItem[];
  loaderWeight: string;
  trailerWeight: string;
  palletWeight: string;
}

/**
 * Maksimal og'irlik, farq, tare tekshiruvi paneli.
 * PDF da va Spetsifikatsiya tabida ko'rinmaydi — buni parent kontrol qiladi.
 */
export function InvoiceWeightSummary({ items, loaderWeight, trailerWeight, palletWeight }: InvoiceWeightSummaryProps) {
  const goodsGross = items.reduce((sum, item) => sum + (item.grossWeight || 0), 0);
  const loader = Number(loaderWeight) || 0;
  const trailer = Number(trailerWeight) || 0;
  const pallet = Number(palletWeight) || 0;
  const totalGross = goodsGross + loader + trailer + pallet;
  const maxWeight = 39950 - loader - trailer - pallet;
  const difference = maxWeight - goodsGross;

  return (
    <div className="mt-4 flex flex-wrap gap-4">
      <div className="p-3 bg-gray-100 rounded-lg border border-gray-200 text-sm w-1/2">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>
            <strong>Maks. og&apos;irlik (кг):</strong> {formatNumber(maxWeight)}
          </span>
          <span className={difference >= 0 ? 'text-green-700' : 'text-red-700'}>
            <strong>Farq (кг):</strong> {difference >= 0 ? '+' : ''}{formatNumber(difference)}
          </span>
          <span className={totalGross > 40000 ? 'w-full text-red-700' : 'w-full'}>
            <strong>Umumiy og&apos;irlik (кг):</strong> {formatNumber(totalGross)}
          </span>
          {(loader + trailer) > 0 && (
            <span className="w-full">
              <strong>Avto og&apos;irlik (кг):</strong> {loader > 0 && trailer > 0 ? `${formatNumber(loader)} + ${formatNumber(trailer)} = ` : ''}{formatNumber(loader + trailer)}
            </span>
          )}
        </div>
      </div>
      <div className="p-3 bg-gray-100 rounded-lg border border-gray-200 text-sm flex-1 min-w-0">
        <ul className="space-y-1 list-none">
          {items.map((item, index) => {
            const qty = (item.packagesCount ?? item.quantity) ?? 0;
            const gross = item.grossWeight ?? 0;
            const net = item.netWeight ?? 0;
            if (!qty) return null;
            const grossPerPkg = gross / qty;
            const netPerPkg = net / qty;
            const tarePerPkg = grossPerPkg - netPerPkg;
            const tareOutOfRange = !isTareInRange(tarePerPkg, item.packageType || '');
            return (
              <li key={index} className={tareOutOfRange ? 'text-red-600 font-medium' : undefined}>
                {item.name || '—'} - {formatNumber(grossPerPkg)} -- {formatNumber(netPerPkg)} -- {formatNumber(tarePerPkg)}{item.packageType ? ` (${item.packageType})` : ''}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
