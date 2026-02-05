import { useAuth } from '../contexts/AuthContext';
import { getCurrencyVisibility, formatAmount, type Role } from '../utils/currencyFormatting';

interface CurrencyDisplayProps {
  amount: number;
  originalCurrency?: 'USD' | 'UZS' | null;
  amountUzs?: number;
  exchangeRate?: number | null;
  exchangeSource?: 'CBU' | 'MANUAL' | null;
  showBoth?: boolean; // Override to show both currencies regardless of role
  className?: string;
}

const CurrencyDisplay = ({
  amount,
  originalCurrency: originalCurrencyProp,
  amountUzs,
  exchangeRate,
  exchangeSource,
  showBoth = false,
  className = '',
}: CurrencyDisplayProps) => {
  const originalCurrency = originalCurrencyProp || 'USD';
  const { user } = useAuth();
  const role = (user?.role || 'DEKLARANT') as Role;
  const visibility = getCurrencyVisibility(role);

  // If showBoth override is set, show both currencies
  if (showBoth && visibility.usd && visibility.uzs) {
    const uzsAmount = amountUzs !== undefined ? amountUzs : (originalCurrency === 'UZS' ? amount : (amount * (exchangeRate || 1)));
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="text-sm font-medium">
          {formatAmount(amount, originalCurrency)}
        </div>
        {originalCurrency === 'USD' && (
          <div className="text-xs text-gray-500">
            {formatAmount(uzsAmount, 'UZS')}
          </div>
        )}
        {visibility.exchangeRate && exchangeRate && (
          <div className="text-xs text-gray-400">
            Kurs: {exchangeRate.toFixed(4)} {exchangeSource ? `(${exchangeSource})` : ''}
          </div>
        )}
      </div>
    );
  }

  // Role-based display
  if (!visibility.usd && visibility.uzs) {
    // ACCOUNTANT: Only UZS
    const uzsAmount = amountUzs !== undefined ? amountUzs : (originalCurrency === 'UZS' ? amount : (amount * (exchangeRate || 1)));
    return (
      <span className={className}>
        {formatAmount(uzsAmount, 'UZS')}
      </span>
    );
  }

  if (visibility.usd && !visibility.uzs) {
    // WORKER/DEKLARANT: Only USD (if original is USD)
    if (originalCurrency === 'USD') {
      return (
        <span className={className}>
          {formatAmount(amount, 'USD')}
        </span>
      );
    } else {
      // If original is UZS but role only sees USD, convert back
      const usdAmount = exchangeRate && exchangeRate > 0 ? amount / exchangeRate : amount;
      return (
        <span className={className}>
          {formatAmount(usdAmount, 'USD')}
        </span>
      );
    }
  }

  if (visibility.usd && visibility.uzs) {
    // OPERATOR/MANAGER/ADMIN/OWNER: Show original currency
    const display = (
      <span className={className}>
        {formatAmount(amount, originalCurrency)}
      </span>
    );

    // Add exchange rate info for ADMIN/OWNER
    if (visibility.exchangeRate && exchangeRate && originalCurrency === 'USD') {
      const uzsAmount = amountUzs !== undefined ? amountUzs : (amount * exchangeRate);
      return (
        <div className={`flex flex-col gap-1 ${className}`}>
          <div>{display}</div>
          <div className="text-xs text-gray-500">
            {formatAmount(uzsAmount, 'UZS')} (Kurs: {exchangeRate.toFixed(4)} {exchangeSource ? `(${exchangeSource})` : ''})
          </div>
        </div>
      );
    }

    return display;
  }

  // Fallback
  return (
    <span className={className}>
      {formatAmount(amount, originalCurrency)}
    </span>
  );
};

export default CurrencyDisplay;

