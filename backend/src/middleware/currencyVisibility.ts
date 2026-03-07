import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

type CurrencyData = {
  amount_original?: number;
  amount_uzs?: number;
  currency_universal?: 'USD' | 'UZS';
  exchange_rate?: number | null;
  exchange_source?: 'CBU' | 'MANUAL' | null;
  [key: string]: any;
};

/**
 * Filter currency data based on user role
 */
export function filterCurrencyByRole(data: CurrencyData | CurrencyData[], role: string): any {
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];

  const filtered = items.map((item) => {
    const filteredItem = { ...item };

    // Determine visibility based on role
    let showUsd = true;
    let showUzs = true;
    let showExchangeRate = false;

    switch (role) {
      case 'WORKER':
      case 'DEKLARANT':
      case 'CERTIFICATE_WORKER':
        showUsd = true;
        showUzs = false;
        showExchangeRate = false;
        break;
      case 'ACCOUNTANT':
        showUsd = false;
        showUzs = true;
        showExchangeRate = false;
        break;
      case 'OPERATOR':
      case 'MANAGER':
        showUsd = true;
        showUzs = true;
        showExchangeRate = false;
        break;
      case 'ADMIN':
      case 'OWNER':
        showUsd = true;
        showUzs = true;
        showExchangeRate = true;
        break;
      default:
        showUsd = true;
        showUzs = false;
        showExchangeRate = false;
    }

    // Remove exchange rate if not allowed
    if (!showExchangeRate) {
      delete filteredItem.exchange_rate;
      delete filteredItem.exchange_source;
      delete filteredItem.exchangeRate;
      delete filteredItem.exchangeSource;
    }

    // If only USD visible and original is USD, keep as is
    // If only USD visible and original is UZS, convert to USD equivalent
    if (showUsd && !showUzs) {
      if (filteredItem.currency_universal === 'UZS' && filteredItem.exchange_rate && filteredItem.exchange_rate > 0) {
        // Convert UZS to USD for display
        filteredItem.amount_original = filteredItem.amount_uzs ? filteredItem.amount_uzs / filteredItem.exchange_rate : filteredItem.amount_original;
        filteredItem.currency_universal = 'USD';
      }
      // Remove UZS amount
      delete filteredItem.amount_uzs;
    }

    // If only UZS visible, convert to UZS
    if (!showUsd && showUzs) {
      if (filteredItem.currency_universal === 'USD') {
        // Convert USD to UZS
        filteredItem.amount_original = filteredItem.amount_uzs || (filteredItem.amount_original ? filteredItem.amount_original * (filteredItem.exchange_rate || 1) : 0);
        filteredItem.currency_universal = 'UZS';
      }
      // Keep UZS amount as original
      if (filteredItem.amount_uzs) {
        filteredItem.amount_original = filteredItem.amount_uzs;
      }
    }

    return filteredItem;
  });

  return isArray ? filtered : filtered[0];
}

/**
 * Middleware to filter currency data in API responses
 */
export function currencyVisibilityMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function (data: any) {
    if (req.user && data) {
      // Filter currency data based on user role
      if (Array.isArray(data)) {
        data = data.map((item) => filterCurrencyByRole(item, req.user!.role));
      } else if (typeof data === 'object') {
        // Check if it's a report result with accounting/operational views
        if (data.accounting && data.operational) {
          // Report result structure
          data.accounting = filterCurrencyByRole(data.accounting, req.user!.role);
          data.operational = filterCurrencyByRole(data.operational, req.user!.role);
          // Filter metadata exchange rates
          if (data.metadata && !['ADMIN', 'OWNER'].includes(req.user!.role)) {
            delete data.metadata.exchangeRatesUsed;
          }
        } else {
          data = filterCurrencyByRole(data, req.user!.role);
        }
      }
    }
    
    return originalJson(data);
  };
  
  next();
}

