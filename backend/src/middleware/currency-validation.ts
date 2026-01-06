import { Request, Response, NextFunction } from 'express';
import { Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Validation result for currency fields
 */
export interface CurrencyValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that exchange rate is provided when currency is not UZS
 */
export function validateExchangeRate(
  currency: Currency | string | null | undefined,
  exchangeRate: Decimal | number | string | null | undefined
): CurrencyValidationResult {
  const errors: string[] = [];

  // If currency is UZS, exchange rate is not required (always 1)
  if (currency === 'UZS' || currency === null || currency === undefined) {
    return { isValid: true, errors: [] };
  }

  // For non-UZS currencies, exchange rate is required
  if (!exchangeRate) {
    errors.push(`Exchange rate is required for currency ${currency}`);
  } else {
    const rate = new Decimal(exchangeRate);
    if (rate.lte(0)) {
      errors.push('Exchange rate must be greater than 0');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that converted UZS amount is provided when currency is not UZS
 */
export function validateConvertedUzsAmount(
  currency: Currency | string | null | undefined,
  convertedUzsAmount: Decimal | number | string | null | undefined
): CurrencyValidationResult {
  const errors: string[] = [];

  // If currency is UZS, converted amount should equal original amount
  if (currency === 'UZS') {
    // For UZS, we still need the converted amount to be present
    if (!convertedUzsAmount) {
      errors.push('Converted UZS amount is required');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // For non-UZS currencies, converted UZS amount is required
  if (!convertedUzsAmount) {
    errors.push('Converted UZS amount is required for non-UZS currencies');
  } else {
    const amount = new Decimal(convertedUzsAmount);
    if (amount.lt(0)) {
      errors.push('Converted UZS amount cannot be negative');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates complete currency transaction data
 * Checks: currency, exchange rate, converted UZS amount
 */
export function validateCurrencyTransaction(data: {
  currency?: Currency | string | null;
  exchangeRate?: Decimal | number | string | null;
  convertedUzsAmount?: Decimal | number | string | null;
  originalAmount?: Decimal | number | string | null;
}): CurrencyValidationResult {
  const errors: string[] = [];

  // Validate exchange rate
  const rateValidation = validateExchangeRate(data.currency, data.exchangeRate);
  if (!rateValidation.isValid) {
    errors.push(...rateValidation.errors);
  }

  // Validate converted UZS amount
  const amountValidation = validateConvertedUzsAmount(data.currency, data.convertedUzsAmount);
  if (!amountValidation.isValid) {
    errors.push(...amountValidation.errors);
  }

  // If both exchange rate and converted amount are present, verify calculation
  if (data.exchangeRate && data.convertedUzsAmount && data.originalAmount && data.currency && data.currency !== 'UZS') {
    const calculated = new Decimal(data.originalAmount).mul(new Decimal(data.exchangeRate));
    const provided = new Decimal(data.convertedUzsAmount);
    
    // Allow small rounding differences (0.01)
    const difference = calculated.sub(provided).abs();
    if (difference.gt(0.01)) {
      errors.push(
        `Converted UZS amount mismatch: calculated ${calculated.toString()}, provided ${provided.toString()}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Express middleware to validate currency fields in request body
 * Checks for exchangeRate when currency is not UZS
 */
export function validateCurrencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const body = req.body;

  // Check if this is a financial operation with currency
  if (body.currency !== undefined || body.originalCurrency !== undefined || body.dealAmountCurrency !== undefined) {
    const currency = body.currency || body.originalCurrency || body.dealAmountCurrency;
    const exchangeRate = body.exchangeRate || body.dealAmountExchangeRate;

    const validation = validateExchangeRate(currency, exchangeRate);
    if (!validation.isValid) {
      res.status(400).json({
        error: 'Currency validation failed',
        details: validation.errors,
      });
      return;
    }
  }

  next();
}

