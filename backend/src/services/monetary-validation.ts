import { Currency, ExchangeSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Validation result for monetary fields
 */
export interface MonetaryValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates universal monetary fields according to business rules:
 * - If currency = UZS → exchange_rate MUST be 1
 * - If currency = USD → exchange_rate MUST be > 0
 * - amount_uzs = amount_original * exchange_rate
 */
export function validateMonetaryFields(data: {
  amount_original?: Decimal | number | string | null;
  currency?: Currency | string | null;
  exchange_rate?: Decimal | number | string | null;
  amount_uzs?: Decimal | number | string | null;
}): MonetaryValidationResult {
  const errors: string[] = [];

  const currency = data.currency;
  const exchangeRate = data.exchange_rate ? new Decimal(data.exchange_rate) : null;
  const amountOriginal = data.amount_original ? new Decimal(data.amount_original) : null;
  const amountUzs = data.amount_uzs ? new Decimal(data.amount_uzs) : null;

  // If currency is UZS, exchange rate must be 1
  if (currency === 'UZS') {
    if (!exchangeRate) {
      errors.push('Exchange rate is required for UZS currency (must be 1)');
    } else if (!exchangeRate.eq(1)) {
      errors.push(`Exchange rate for UZS currency must be 1, got ${exchangeRate.toString()}`);
    }
  }

  // If currency is USD, exchange rate must be > 0
  if (currency === 'USD') {
    if (!exchangeRate) {
      errors.push('Exchange rate is required for USD currency');
    } else if (exchangeRate.lte(0)) {
      errors.push(`Exchange rate for USD currency must be greater than 0, got ${exchangeRate.toString()}`);
    }
  }

  // Validate amount calculation: amount_uzs = amount_original * exchange_rate
  if (amountOriginal && exchangeRate && amountUzs) {
    const calculated = amountOriginal.mul(exchangeRate);
    const difference = calculated.sub(amountUzs).abs();
    
    // Allow small rounding differences (0.01 UZS)
    const roundingTolerance = new Decimal(0.01);
    if (difference.gt(roundingTolerance)) {
      errors.push(
        `Amount calculation mismatch: amount_uzs (${amountUzs.toString()}) should equal amount_original (${amountOriginal.toString()}) * exchange_rate (${exchangeRate.toString()}) = ${calculated.toString()}`
      );
    }
  } else if (amountOriginal && exchangeRate && !amountUzs) {
    errors.push('amount_uzs is required when amount_original and exchange_rate are provided');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that exchange rate is provided when currency is not UZS
 */
export function validateExchangeRateRequired(
  currency: Currency | string | null | undefined,
  exchangeRate: Decimal | number | string | null | undefined
): MonetaryValidationResult {
  const errors: string[] = [];

  if (currency === 'UZS') {
    // UZS requires exchange_rate = 1
    if (!exchangeRate) {
      errors.push('Exchange rate is required for UZS currency (must be 1)');
    } else {
      const rate = new Decimal(exchangeRate);
      if (!rate.eq(1)) {
        errors.push('Exchange rate for UZS currency must be 1');
      }
    }
  } else if (currency === 'USD') {
    // USD requires exchange_rate > 0
    if (!exchangeRate) {
      errors.push('Exchange rate is required for USD currency');
    } else {
      const rate = new Decimal(exchangeRate);
      if (rate.lte(0)) {
        errors.push('Exchange rate for USD currency must be greater than 0');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates amount_uzs from amount_original and exchange_rate
 */
export function calculateAmountUzs(
  amountOriginal: Decimal | number | string,
  currency: Currency | string,
  exchangeRate: Decimal | number | string
): Decimal {
  const amountDecimal = new Decimal(amountOriginal);
  const rateDecimal = new Decimal(exchangeRate);

  // If already UZS, return same amount
  if (currency === 'UZS') {
    return amountDecimal;
  }

  // Convert: amount_original * exchange_rate = amount_uzs
  return amountDecimal.mul(rateDecimal);
}

/**
 * Enforces that exchange rates for past dates cannot be updated
 */
export function validateExchangeRateImmutability(
  existingRateDate: Date,
  newDate?: Date
): MonetaryValidationResult {
  const errors: string[] = [];
  const now = new Date();
  const existingDate = new Date(existingRateDate);

  // If trying to update an existing rate
  if (existingDate < now) {
    errors.push(`Cannot update exchange rate for past date: ${existingDate.toISOString()}. Historical rates are immutable.`);
  }

  // If trying to create/update with a past date
  if (newDate && newDate < now) {
    errors.push(`Cannot create/update exchange rate for past date: ${newDate.toISOString()}. Only current and future dates are allowed.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates StatePayment data
 * StatePayment MUST have:
 * - Both USD and UZS amounts provided
 * - Currency can be USD or UZS (used only for display)
 */
export function validateStatePayment(data: {
  currency?: Currency | string | null;
  exchangeRate?: Decimal | number | string | null;
  certificatePayment?: Decimal | number | string | null;
  psrPrice?: Decimal | number | string | null;
  workerPrice?: Decimal | number | string | null;
  customsPayment?: Decimal | number | string | null;
}): MonetaryValidationResult {
  const errors: string[] = [];
  const currency = data.currency;

  if (currency !== undefined && currency !== null && currency !== 'USD' && currency !== 'UZS') {
    errors.push(`StatePayment currency must be USD or UZS, got ${currency}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

