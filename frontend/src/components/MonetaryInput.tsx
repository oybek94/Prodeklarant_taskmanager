export interface MonetaryInputProps {
  amount: string;
  currency: 'USD' | 'UZS';
  exchangeRate?: string;
  date?: string;
  amountUzs?: string;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: 'USD' | 'UZS') => void;
  onExchangeRateChange?: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showLabels?: boolean;
  currencyRules?: {
    allowed?: ('USD' | 'UZS')[];
    fixed?: 'USD' | 'UZS';
    exchangeRateRequired?: boolean;
  };
  errors?: {
    amount?: string;
    currency?: string;
    exchangeRate?: string;
  };
  hideExchangeRate?: boolean;
}

const MonetaryInput = ({
  amount,
  onAmountChange,
  label = 'Summa',
  required = false,
  disabled = false,
  errors = {},
}: MonetaryInputProps) => {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            required={required}
            disabled={disabled}
            className={`flex-1 px-3 py-2 border rounded-lg ${
              errors.amount
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
            placeholder="0"
          />
          <span className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm font-medium select-none">
            UZS
          </span>
        </div>
        {errors.amount && (
          <p className="text-xs text-red-600 mt-1">{errors.amount}</p>
        )}
      </div>
    </div>
  );
};

export default MonetaryInput;
