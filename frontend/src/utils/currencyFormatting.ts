export type Role = 'ADMIN' | 'MANAGER' | 'DEKLARANT' | 'CERTIFICATE_WORKER' | 'WORKER' | 'OPERATOR' | 'ACCOUNTANT' | 'OWNER';

export type CurrencyVisibility = {
  usd: boolean;
  uzs: boolean;
  exchangeRate: boolean;
};

/**
 * Get currency visibility settings for a role
 */
export function getCurrencyVisibility(role: Role): CurrencyVisibility {
  switch (role) {
    case 'WORKER':
    case 'DEKLARANT':
    case 'CERTIFICATE_WORKER':
      return { usd: true, uzs: false, exchangeRate: false };
    case 'ACCOUNTANT':
      return { usd: false, uzs: true, exchangeRate: false };
    case 'OPERATOR':
    case 'MANAGER':
      return { usd: true, uzs: true, exchangeRate: false };
    case 'ADMIN':
    case 'OWNER':
      return { usd: true, uzs: true, exchangeRate: true };
    default:
      return { usd: true, uzs: false, exchangeRate: false };
  }
}

/**
 * Get array of visible currencies for a role
 */
export function getVisibleCurrencies(role: Role): ('USD' | 'UZS')[] {
  const visibility = getCurrencyVisibility(role);
  const currencies: ('USD' | 'UZS')[] = [];
  if (visibility.usd) currencies.push('USD');
  if (visibility.uzs) currencies.push('UZS');
  return currencies;
}

/**
 * Check if role should see exchange rates
 */
export function shouldShowExchangeRate(role: Role): boolean {
  return getCurrencyVisibility(role).exchangeRate;
}

/**
 * Format currency amount for display based on role
 */
export function formatCurrencyForRole(
  amount: number,
  originalCurrency: 'USD' | 'UZS',
  role: Role,
  amountUzs?: number,
  exchangeRate?: number
): string {
  const visibility = getCurrencyVisibility(role);
  
  // If role only sees USD and original is USD, show USD
  if (visibility.usd && !visibility.uzs && originalCurrency === 'USD') {
    const formatted = new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return formatted.replace(/,/g, ' ');
  }
  
  // If role only sees UZS, show UZS (convert if needed)
  if (!visibility.usd && visibility.uzs) {
    const uzsAmount = amountUzs !== undefined ? amountUzs : (originalCurrency === 'UZS' ? amount : (amount * (exchangeRate || 1)));
    const formatted = new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(uzsAmount);
    return formatted.replace(/,/g, ' ');
  }
  
  // If role sees both, show original currency
  if (visibility.usd && visibility.uzs) {
    const formatted = new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: originalCurrency,
      minimumFractionDigits: originalCurrency === 'USD' ? 2 : 0,
      maximumFractionDigits: originalCurrency === 'USD' ? 2 : 0,
    }).format(amount);
    return formatted.replace(/,/g, ' ');
  }
  
  // Default fallback
  const formatted = new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return formatted.replace(/,/g, ' ');
}

/**
 * Format amount with currency symbol (simple version)
 * Uses space as thousand separator instead of comma
 */
export function formatAmount(amount: number, currency: 'USD' | 'UZS'): string {
  const formatted = new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(amount);
  
  // Replace commas with spaces for thousand separators
  return formatted.replace(/,/g, ' ');
}

