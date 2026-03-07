export interface MonetaryValidationErrors {
  amount?: string;
  currency?: string;
  exchangeRate?: string;
}

export interface MonetaryValidationData {
  amount: string;
  currency: 'USD' | 'UZS';
  exchangeRate?: string;
  date?: string;
}

export interface CurrencyRules {
  allowed?: ('USD' | 'UZS')[];
  fixed?: 'USD' | 'UZS';
  exchangeRateRequired?: boolean;
}

/**
 * Validate monetary fields
 */
export function validateMonetaryFields(
  data: MonetaryValidationData,
  currencyRules?: CurrencyRules
): MonetaryValidationErrors {
  const errors: MonetaryValidationErrors = {};

  // Amount validation
  if (!data.amount || data.amount.trim() === '') {
    errors.amount = 'Summa kiritilishi shart';
  } else {
    const amountNum = parseFloat(data.amount);
    if (isNaN(amountNum)) {
      errors.amount = 'Summa raqam bo\'lishi kerak';
    } else if (amountNum <= 0) {
      errors.amount = 'Summa musbat son bo\'lishi kerak';
    }
  }

  // Currency validation
  const effectiveCurrency = currencyRules?.fixed || data.currency;

  // Check if currency is allowed
  if (currencyRules?.allowed && !currencyRules.allowed.includes(effectiveCurrency)) {
    errors.currency = `Valyuta ${effectiveCurrency} ga ruxsat berilmaydi`;
  }

  // Check if currency matches fixed rule
  if (currencyRules?.fixed && data.currency !== currencyRules.fixed) {
    errors.currency = `Valyuta ${currencyRules.fixed} bo'lishi kerak`;
  }

  // Exchange rate validation
  const exchangeRateRequired = currencyRules?.exchangeRateRequired !== false;

  if (effectiveCurrency === 'USD') {
    if (exchangeRateRequired && (!data.exchangeRate || data.exchangeRate.trim() === '')) {
      errors.exchangeRate = 'USD uchun valyuta kursi kiritilishi shart';
    } else if (data.exchangeRate) {
      const rateNum = parseFloat(data.exchangeRate);
      if (isNaN(rateNum)) {
        errors.exchangeRate = 'Valyuta kursi raqam bo\'lishi kerak';
      } else if (rateNum <= 0) {
        errors.exchangeRate = 'Valyuta kursi musbat son bo\'lishi kerak';
      }
    }
  } else if (effectiveCurrency === 'UZS') {
    // For fixed UZS (e.g., StatePayments), exchange rate must be 1
    if (currencyRules?.fixed === 'UZS') {
      if (data.exchangeRate && parseFloat(data.exchangeRate) !== 1) {
        errors.exchangeRate = 'UZS uchun valyuta kursi 1 bo\'lishi kerak';
      }
    }
  }

  return errors;
}

/**
 * Check if monetary fields are valid
 */
export function isValidMonetaryFields(
  data: MonetaryValidationData,
  currencyRules?: CurrencyRules
): boolean {
  const errors = validateMonetaryFields(data, currencyRules);
  return Object.keys(errors).length === 0;
}

/**
 * Validate currency rules
 */
export function validateCurrencyRules(
  currency: 'USD' | 'UZS',
  rules?: CurrencyRules
): string | null {
  if (!rules) return null;

  // Check fixed currency
  if (rules.fixed && currency !== rules.fixed) {
    return `Valyuta ${rules.fixed} bo'lishi kerak`;
  }

  // Check allowed currencies
  if (rules.allowed && !rules.allowed.includes(currency)) {
    return `Valyuta ${currency} ga ruxsat berilmaydi`;
  }

  return null;
}

