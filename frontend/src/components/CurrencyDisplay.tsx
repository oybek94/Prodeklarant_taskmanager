import { formatAmount } from '../utils/currencyFormatting';

interface CurrencyDisplayProps {
  amount: number;
  originalCurrency?: string | null;
  amountUzs?: number;
  exchangeRate?: number | null;
  exchangeSource?: 'CBU' | 'MANUAL' | null;
  showBoth?: boolean;
  forceOriginal?: boolean;
  className?: string;
}

const CurrencyDisplay = ({
  amount,
  originalCurrency: originalCurrencyProp,
  amountUzs,
  exchangeRate,
  forceOriginal = false,
  className = '',
}: CurrencyDisplayProps) => {
  const originalCurrency = originalCurrencyProp || 'UZS';
  const isNonStandard = originalCurrency !== 'USD' && originalCurrency !== 'UZS';

  if (forceOriginal || isNonStandard) {
    return (
      <span className={className}>
        {formatAmount(amount, originalCurrency)}
      </span>
    );
  }

  const uzsAmount =
    amountUzs !== undefined
      ? amountUzs
      : originalCurrency === 'UZS'
      ? amount
      : amount * (exchangeRate || 1);

  return (
    <span className={className}>
      {formatAmount(uzsAmount, 'UZS')}
    </span>
  );
};

export default CurrencyDisplay;
