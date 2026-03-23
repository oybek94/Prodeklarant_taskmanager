import { useMemo } from 'react';
import type { RegionCode, FssFilePrefix } from './types';

interface FssRegionModalProps {
  regionCodes: RegionCode[];
  regionCodesLoading: boolean;
  regionSearch: string;
  setRegionSearch: (v: string) => void;
  currentRegionName: string;
  currentRegionInternalCode: string;
  onSelect: (region: RegionCode) => void;
  onClose: () => void;
  onReload: () => void;
}

/**
 * FSS (Fitosanitar sertifikat) hudud kodi tanlash modali.
 */
export function FssRegionModal({
  regionCodes,
  regionCodesLoading,
  regionSearch,
  setRegionSearch,
  currentRegionName,
  currentRegionInternalCode,
  onSelect,
  onClose,
  onReload,
}: FssRegionModalProps) {
  const filteredRegionCodes = useMemo(() => {
    if (!regionSearch.trim()) return regionCodes;
    const q = regionSearch.toLowerCase();
    return regionCodes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.internalCode.toLowerCase().includes(q) ||
        r.externalCode.toLowerCase().includes(q)
    );
  }, [regionCodes, regionSearch]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Hudud kodini tanlang</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qidirish
            </label>
            <input
              type="text"
              value={regionSearch}
              onChange={(e) => setRegionSearch(e.target.value)}
              placeholder="Hudud nomi yoki kod bo'yicha qidiring"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="text-sm text-gray-600">
            Tanlangan: {currentRegionName || '—'}
            {currentRegionInternalCode ? ` (${currentRegionInternalCode})` : ''}
          </div>

          <div className="border border-gray-200 rounded-lg max-h-[45vh] overflow-y-auto">
            {regionCodesLoading ? (
              <div className="p-4 text-sm text-gray-500">Yuklanmoqda...</div>
            ) : filteredRegionCodes.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Natija topilmadi</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredRegionCodes.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => onSelect(region)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-medium text-gray-800">{region.name}</div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {region.internalCode} / {region.externalCode}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onReload}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Qayta yuklash
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
