import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '../../lib/api';
import type { InvoiceFormData, InvoiceItem } from './types';

interface ExportPriceCalculatorProps {
  form: InvoiceFormData;
  setForm: (form: InvoiceFormData) => void;
  items: InvoiceItem[];
  canEditEffective: boolean;
}

interface RecommendedPrice {
  id: number;
  productName: string;
  priceUsd: number;
}

export function ExportPriceCalculator({ form, setForm, items, canEditEffective }: ExportPriceCalculatorProps) {
  const [recommendedPrices, setRecommendedPrices] = useState<RecommendedPrice[]>([]);
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});
  const [loadingUsdRate, setLoadingUsdRate] = useState(false);
  const [calcVisible, setCalcVisible] = useState(true);

  // Yo'lkira narxi form.additionalInfo.freightCost || ''
  const freightCost = form.additionalInfo?.freightCost || 0;
  // USD to RUB form.additionalInfo.usdToRubRate || ''
  const usdToRubRate = form.additionalInfo?.usdToRubRate || 0;

  useEffect(() => {
    // Tavsiyaviy narxlarni yuklash bazadan
    const fetchPrices = async () => {
      try {
        const res = await apiClient.get<RecommendedPrice[]>('/recommended-prices');
        setRecommendedPrices(res.data);

        // Map product names to default prices
        const priceMap: Record<string, number> = {};
        res.data.forEach(p => {
          priceMap[p.productName] = p.priceUsd;
        });

        // Initialize localPrices if they don't exist yet
        setLocalPrices(prev => {
          const newMap = { ...prev };
          let changed = false;
          items.forEach(item => {
            const defaultPrice = priceMap[item.name.trim()] || 0;
            if (newMap[item.name] === undefined && defaultPrice > 0) {
              newMap[item.name] = defaultPrice;
              changed = true;
            }
          });
          return changed ? newMap : prev;
        });
      } catch (error) {
        console.error('Tavsiyaviy narxlarni yuklashda xatolik:', error);
      }
    };

    fetchPrices();
  }, [items]);

  // Invoice yuklanganda yoki rate yo'q bo'lsa kursni olish
  useEffect(() => {
    if (!usdToRubRate && canEditEffective) {
      handleRefreshRate();
    }
  }, []);

  const handleRefreshRate = async () => {
    try {
      setLoadingUsdRate(true);
      const res = await apiClient.get<{ rate: number }>('/exchange-rate/usd-rub');
      if (res.data && res.data.rate) {
        updateField('usdToRubRate', res.data.rate);
      }
    } catch (error) {
      console.error('Kursni olishda xatolik:', error);
    } finally {
      setLoadingUsdRate(false);
    }
  };

  const updateField = (field: 'freightCost' | 'usdToRubRate', val: number) => {
    if (!canEditEffective) return;
    setForm({
      ...form,
      additionalInfo: {
        ...(form.additionalInfo || {}),
        [field]: val,
      }
    });
  };

  const totalNet = useMemo(() => {
    return items.reduce((sum, i) => sum + (Number(i.netWeight) || 0), 0);
  }, [items]);

  const rows = useMemo(() => {
    return items.map((item, idx) => {
      const netto = Number(item.netWeight) || 0;
      const recPrice = localPrices[item.name] || 0;
      const summa = netto * recPrice;
      const yolkiraUlushi = totalNet > 0 ? (netto / totalNet) * freightCost : 0;
      const summaPlusYolkira = summa + yolkiraUlushi;
      const kgNarx = netto > 0 ? summaPlusYolkira / netto : 0;

      return {
        id: item.id || `temp-${idx}`,
        name: item.name,
        netto,
        recPrice,
        summa,
        yolkiraUlushi,
        summaPlusYolkira,
        kgNarx
      };
    });
  }, [items, localPrices, freightCost, totalNet]);

  const totalSumma = rows.reduce((acc, r) => acc + r.summa, 0);
  const totalYolkira = rows.reduce((acc, r) => acc + r.yolkiraUlushi, 0);
  const finalUsd = rows.reduce((acc, r) => acc + r.summaPlusYolkira, 0);
  const finalRub = finalUsd * usdToRubRate;

  if (items.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Icon icon="lucide:calculator" className="w-5 h-5 text-blue-600" />
          Eksport narx kalkulyatori (Tavsiyaviy)
        </h3>
        <button
          type="button"
          onClick={() => setCalcVisible(!calcVisible)}
          className="text-gray-500 hover:text-gray-700 p-1"
          title={calcVisible ? "Yashirish" : "Ko'rsatish"}
        >
          <Icon icon={calcVisible ? "lucide:chevron-up" : "lucide:chevron-down"} className="w-5 h-5" />
        </button>
      </div>

      {calcVisible && (
        <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
          <div className="flex flex-wrap items-center gap-6 mb-6">
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
              <label className="text-sm font-medium text-gray-700">Yo'lkira narxi (USD):</label>
              <input
                type="number"
                min="0"
                step="any"
                value={freightCost || ''}
                onChange={(e) => updateField('freightCost', parseFloat(e.target.value) || 0)}
                disabled={!canEditEffective}
                className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
              <label className="text-sm font-medium text-gray-700">USD/RUB kursi:</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={usdToRubRate || ''}
                  onChange={(e) => updateField('usdToRubRate', parseFloat(e.target.value) || 0)}
                  disabled={!canEditEffective}
                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                />
                {canEditEffective && (
                  <button
                    type="button"
                    onClick={handleRefreshRate}
                    disabled={loadingUsdRate}
                    title="Markaziy Bankdan (Rossiya) avtomatik olish"
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Icon icon={loadingUsdRate ? 'lucide:loader-2' : 'lucide:refresh-cw'} className={`w-4 h-4 ${loadingUsdRate ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600 border-b border-gray-200 text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">Tovar nomi</th>
                  <th className="px-3 py-2 font-medium text-right">Netto (кг)</th>
                  <th className="px-3 py-2 font-medium text-right bg-blue-50">Tavs. narx ($)</th>
                  <th className="px-3 py-2 font-medium text-right">Summa ($)</th>
                  <th className="px-3 py-2 font-medium text-right text-gray-500">Yo'l. taq. ($)</th>
                  <th className="px-3 py-2 font-medium text-right bg-green-50">Summa+Y. ($)</th>
                  <th className="px-3 py-2 font-medium text-right text-blue-600">$/кг</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 truncate max-w-[150px]" title={row.name}>{row.name}</td>
                    <td className="px-3 py-2 text-right">{row.netto.toLocaleString('ru-RU')}</td>
                    <td className="px-3 py-2 text-right bg-blue-50/30">
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.recPrice || ''}
                        onChange={(e) => {
                          if (!canEditEffective) return;
                          setLocalPrices(prev => ({ ...prev, [row.name]: parseFloat(e.target.value) || 0 }));
                        }}
                        disabled={!canEditEffective}
                        className="w-16 px-1 py-0.5 text-xs text-right border border-blue-200 rounded focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">{row.summa.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{row.yolkiraUlushi.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right bg-green-50/30 font-medium">{row.summaPlusYolkira.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right text-blue-600 font-bold">{row.kgNarx.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                <tr>
                  <td className="px-3 py-2">Jami</td>
                  <td className="px-3 py-2 text-right">{totalNet.toLocaleString('ru-RU')}</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-right">{totalSumma.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{totalYolkira.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</td>
                  <td className="px-3 py-2 text-right text-green-700">{finalUsd.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 flex flex-col md:flex-row items-end md:items-center justify-end gap-2 md:gap-4 bg-white p-3 rounded-lg border border-green-200 shadow-sm">
            <div className="text-gray-600">
              <span className="text-sm">Jami USD:</span>
              <span className="ml-2 font-bold text-lg">${finalUsd.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <Icon icon="lucide:arrow-right" className="w-5 h-5 text-gray-400 hidden md:block" />
            <div className="text-green-700">
              <span className="text-sm">RUB:</span>
              <span className="ml-2 font-bold text-xl">{finalRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
