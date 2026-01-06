import { useState, useEffect } from 'react';
import apiClient from '../lib/api';

export interface MonetaryInputProps {
  amount: string;
  currency: 'USD' | 'UZS';
  exchangeRate?: string;
  date?: string; // For auto-fetching exchange rate
  amountUzs?: string; // Calculated preview (optional, will be calculated if not provided)
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: 'USD' | 'UZS') => void;
  onExchangeRateChange?: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showLabels?: boolean; // Show currency labels
  currencyRules?: {
    allowed?: ('USD' | 'UZS')[];
    fixed?: 'USD' | 'UZS'; // Fixed currency (e.g., StatePayments = UZS)
    exchangeRateRequired?: boolean;
  };
  errors?: {
    amount?: string;
    currency?: string;
    exchangeRate?: string;
  };
}

const MonetaryInput = ({
  amount,
  currency,
  exchangeRate = '',
  date,
  amountUzs,
  onAmountChange,
  onCurrencyChange,
  onExchangeRateChange,
  label = 'Summa',
  required = false,
  disabled = false,
  showLabels = true,
  currencyRules,
  errors = {},
}: MonetaryInputProps) => {
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);
  const [calculatedUzs, setCalculatedUzs] = useState<string>('');

  // Calculate UZS amount preview
  useEffect(() => {
    if (amount && exchangeRate) {
      const amountNum = parseFloat(amount);
      const rateNum = parseFloat(exchangeRate);
      if (!isNaN(amountNum) && !isNaN(rateNum) && rateNum > 0) {
        if (currency === 'USD') {
          setCalculatedUzs((amountNum * rateNum).toFixed(2));
        } else {
          // UZS - no conversion needed
          setCalculatedUzs(amountNum.toFixed(2));
        }
      } else {
        setCalculatedUzs('');
      }
    } else if (currency === 'UZS' && amount) {
      // If UZS and no exchange rate, amount is already in UZS
      const amountNum = parseFloat(amount);
      if (!isNaN(amountNum)) {
        setCalculatedUzs(amountNum.toFixed(2));
      } else {
        setCalculatedUzs('');
      }
    } else {
      setCalculatedUzs('');
    }
  }, [amount, exchangeRate, currency]);

  // Use provided amountUzs if available, otherwise use calculated
  const displayUzs = amountUzs !== undefined ? amountUzs : calculatedUzs;

  // Auto-fetch exchange rate when date or currency changes
  useEffect(() => {
    if (disabled || !date) return;

    // If currency is fixed to UZS, set exchange rate to 1
    if (currencyRules?.fixed === 'UZS') {
      if (onExchangeRateChange) {
        onExchangeRateChange('1');
      }
      return;
    }

    // If currency is USD, fetch exchange rate
    if (currency === 'USD') {
      const fetchExchangeRate = async () => {
        setLoadingExchangeRate(true);
        try {
          const response = await apiClient.get(`/finance/exchange-rates/for-date?date=${date}`);
          if (response.data?.rate && onExchangeRateChange) {
            onExchangeRateChange(response.data.rate);
          }
        } catch (error) {
          console.error('Error fetching exchange rate:', error);
          // Don't show error to user, just log it
        } finally {
          setLoadingExchangeRate(false);
        }
      };
      fetchExchangeRate();
    } else if (currency === 'UZS') {
      // UZS always has exchange rate of 1
      if (onExchangeRateChange) {
        onExchangeRateChange('1');
      }
    }
  }, [date, currency, currencyRules, disabled, onExchangeRateChange]);

  // Determine if currency selector should be disabled
  const isCurrencyFixed = currencyRules?.fixed !== undefined;
  const effectiveCurrency = currencyRules?.fixed || currency;

  // Determine allowed currencies
  const allowedCurrencies = currencyRules?.allowed || ['USD', 'UZS'];

  return (
    <div className="space-y-4">
      {/* Currency Labels */}
      {showLabels && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <div className="flex flex-col gap-1">
            <div className="text-gray-700">
              <span className="font-medium">Accounting currency:</span> <span className="text-blue-700 font-semibold">UZS</span> (Base currency for all financial records)
            </div>
            <div className="text-gray-700">
              <span className="font-medium">Operational currency:</span> <span className="text-green-700 font-semibold">USD</span> (Original transaction currency)
            </div>
          </div>
        </div>
      )}

      {/* Amount and Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            required={required}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.amount
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-xs text-red-600 mt-1">{errors.amount}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valyuta {required && <span className="text-red-500">*</span>}
          </label>
          <select
            value={effectiveCurrency}
            onChange={(e) => {
              const newCurrency = e.target.value as 'USD' | 'UZS';
              if (!isCurrencyFixed) {
                onCurrencyChange(newCurrency);
              }
            }}
            required={required}
            disabled={disabled || isCurrencyFixed}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.currency
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          >
            {allowedCurrencies.includes('USD') && <option value="USD">USD</option>}
            {allowedCurrencies.includes('UZS') && <option value="UZS">UZS</option>}
          </select>
          {isCurrencyFixed && (
            <p className="text-xs text-gray-500 mt-1">Valyuta {effectiveCurrency} ga o'rnatilgan</p>
          )}
          {errors.currency && (
            <p className="text-xs text-red-600 mt-1">{errors.currency}</p>
          )}
        </div>
      </div>

      {/* Exchange Rate */}
      {effectiveCurrency === 'USD' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valyuta kursi (USD → UZS) {currencyRules?.exchangeRateRequired !== false && <span className="text-red-500">*</span>}
            {loadingExchangeRate && <span className="text-gray-500 text-xs ml-2">(yuklanmoqda...)</span>}
          </label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={exchangeRate}
            onChange={(e) => onExchangeRateChange?.(e.target.value)}
            disabled={disabled || (currencyRules?.fixed === 'UZS')}
            className={`w-full px-3 py-2 border rounded-lg ${
              errors.exchangeRate
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
            placeholder="Avtomatik to'ldiriladi"
          />
          <p className="text-xs text-gray-500 mt-1">
            {date ? 'Sana o\'zgarganda avtomatik to\'ldiriladi. Qo\'lda o\'zgartirish mumkin.' : 'Valyuta kursini kiriting'}
          </p>
          {errors.exchangeRate && (
            <p className="text-xs text-red-600 mt-1">{errors.exchangeRate}</p>
          )}
        </div>
      )}

      {/* Converted UZS Preview */}
      {displayUzs && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Konvertatsiya qilingan UZS (preview)
          </label>
          <input
            type="text"
            value={`${displayUzs} UZS`}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            {effectiveCurrency === 'USD'
              ? 'Ushbu summa hisob-kitoblar uchun ishlatiladi'
              : 'Summa allaqachon UZS da'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MonetaryInput;

