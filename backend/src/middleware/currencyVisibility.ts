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

export function filterCurrencyByRole(data: CurrencyData | CurrencyData[], _role: string): any {
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];

  const filtered = items.map((item) => {
    const filteredItem = { ...item };

    // Har doim UZS ko'rsatiladi — exchange rate va USD yashiriladi
    delete filteredItem.exchange_rate;
    delete filteredItem.exchange_source;
    delete filteredItem.exchangeRate;
    delete filteredItem.exchangeSource;

    if (filteredItem.currency_universal === 'USD' && filteredItem.amount_uzs) {
      filteredItem.amount_original = filteredItem.amount_uzs;
      filteredItem.currency_universal = 'UZS';
    } else if (filteredItem.amount_uzs) {
      filteredItem.amount_original = filteredItem.amount_uzs;
    }

    return filteredItem;
  });

  return isArray ? filtered : filtered[0];
}

export function currencyVisibilityMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = function (data: any) {
    if (req.user && data) {
      if (Array.isArray(data)) {
        data = data.map((item) => filterCurrencyByRole(item, req.user!.role));
      } else if (typeof data === 'object') {
        if (data.accounting && data.operational) {
          data.accounting = filterCurrencyByRole(data.accounting, req.user!.role);
          data.operational = filterCurrencyByRole(data.operational, req.user!.role);
          if (data.metadata) {
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
