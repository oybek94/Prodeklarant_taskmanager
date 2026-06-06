export type Role = 'ADMIN' | 'MANAGER' | 'DEKLARANT' | 'CERTIFICATE_WORKER' | 'WORKER' | 'OPERATOR' | 'ACCOUNTANT' | 'OWNER';

export type CurrencyVisibility = {
  usd: boolean;
  uzs: boolean;
  exchangeRate: boolean;
};

export function getCurrencyVisibility(_role: Role): CurrencyVisibility {
  return { usd: false, uzs: true, exchangeRate: false };
}

export function getVisibleCurrencies(_role: Role): ('USD' | 'UZS')[] {
  return ['UZS'];
}

export function shouldShowExchangeRate(_role: Role): boolean {
  return false;
}

export function formatCurrencyForRole(
  amount: number,
  originalCurrency: 'USD' | 'UZS',
  _role: Role,
  amountUzs?: number,
  _exchangeRate?: number
): string {
  const uzsAmount = originalCurrency === 'UZS' ? amount : (amountUzs ?? amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(uzsAmount);
  return formatted.replace(/,/g, ' ').replace(/\./g, ',');
}

export function formatAmount(amount: number, currency: string): string {
  const decimals = currency === 'UZS' ? 0 : 2;
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
    return formatted.replace(/,/g, ' ').replace(/\./g, ',');
  } catch {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
    return `${formatted.replace(/,/g, ' ').replace(/\./g, ',')} ${currency}`;
  }
}
