import { PrismaClient, Prisma, Currency, ExchangeSource } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

/**
 * Get exchange rate for a specific date
 * ExchangeRate table always stores USD to UZS rates
 * Falls back to most recent rate if exact date not found
 * Always returns a rate (never null) - throws if no rate available
 */
export async function getExchangeRate(
  date: Date,
  fromCurrency: Currency,
  toCurrency: Currency,
  tx?: Prisma.TransactionClient | PrismaClient,
  preferredSource?: ExchangeSource
): Promise<Decimal> {
  const client = tx || prisma;

  // If converting to same currency, return rate of 1
  if (fromCurrency === toCurrency) {
    return new Decimal(1);
  }

  // ExchangeRate table only stores USD to UZS rates
  // If converting USD to UZS, use the rate directly
  if (fromCurrency === 'USD' && toCurrency === 'UZS') {
    let whereClause: any = {
      currency: 'USD',
      date: {
        lte: date,
      },
    };

    // If preferred source is specified, prefer that
    if (preferredSource) {
      whereClause.source = preferredSource;
    }

    // Check if we're looking for today's rate
    // Compare dates in UTC to avoid timezone issues
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dateUTC = new Date(date);
    dateUTC.setUTCHours(0, 0, 0, 0);
    const isToday = dateUTC.getTime() === today.getTime();
    
    console.log(`[ExchangeRate] Date comparison: requested=${dateUTC.toISOString().split('T')[0]}, today=${today.toISOString().split('T')[0]}, isToday=${isToday}`);
    
    // Try to find exact date match first (with preferred source if specified)
    let rate = await client.exchangeRate.findFirst({
      where: {
        currency: 'USD',
        date: date, // Exact date match
      },
    });

    // Skip CBU API call for stage operations - only use database rates
    // CBU API calls removed to avoid timeouts during transactions

    // If no exact match found, try to find rate with preferred source (for historical dates)
    if (!rate && preferredSource) {
      rate = await client.exchangeRate.findFirst({
        where: {
          currency: 'USD',
          date: {
            lte: date,
          },
          source: preferredSource,
        },
        orderBy: {
          date: 'desc',
        },
      });
    }
    
    // If still no rate found, try any source (for historical dates)
    if (!rate) {
      rate = await client.exchangeRate.findFirst({
        where: {
          currency: 'USD',
          date: {
            lte: date,
          },
        },
        orderBy: {
          date: 'desc',
        },
      });
    }

    // If no rate found before/on date, try most recent rate
    if (!rate) {
      rate = await client.exchangeRate.findFirst({
        where: {
          currency: 'USD',
        },
        orderBy: {
          date: 'desc',
        },
      });
    }

    // Skip CBU API call for stage operations - only use database rates
    // If no rate found in database (including most recent), throw error
    if (!rate) {
      throw new Error(
        `No exchange rate found for USD to UZS on or before ${date.toISOString()}. Please ensure exchange rates are configured in the database.`
      );
    }

    return rate.rate;
  }

  // If converting UZS to USD, calculate inverse
  if (fromCurrency === 'UZS' && toCurrency === 'USD') {
    const usdToUzsRate = await getExchangeRate(date, 'USD', 'UZS', client, preferredSource);
    // Inverse: if 1 USD = 12500 UZS, then 1 UZS = 1/12500 USD
    return new Decimal(1).div(usdToUzsRate);
  }

  throw new Error(
    `Unsupported currency conversion: ${fromCurrency} to ${toCurrency}. Only USD <-> UZS conversions are supported.`
  );
}

/**
 * Convert amount from one currency to UZS using exchange rate
 * Pure function for currency conversion
 * Handles UZS to UZS (returns same amount, rate = 1)
 */
export function convertToUzs(
  amount: Decimal | number | string,
  currency: Currency,
  exchangeRate: Decimal | number | string
): Decimal {
  const amountDecimal = new Decimal(amount);
  const rateDecimal = new Decimal(exchangeRate);

  // If already UZS, return same amount
  if (currency === 'UZS') {
    return amountDecimal;
  }

  // Convert: amount * rate = UZS amount
  return amountDecimal.mul(rateDecimal);
}

/**
 * Get latest exchange rate for today or most recent
 */
export async function getLatestExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency,
  tx?: Prisma.TransactionClient | PrismaClient,
  preferredSource?: ExchangeSource
): Promise<Decimal> {
  const client = tx || prisma;
  return getExchangeRate(new Date(), fromCurrency, toCurrency, client, preferredSource);
}

/**
 * Fetch USD to UZS exchange rate from CBU API
 * Returns the rate or null if API call fails
 * 
 * @param date Optional date in format YYYY-MM-DD. If not provided, returns latest rate
 * @returns Exchange rate as Decimal or null if failed
 * 
 * API format: https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/ or
 *             https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/YYYY-MM-DD/
 * 
 * Response format:
 * [{
 *   "id": 1,
 *   "Code": "840",
 *   "Ccy": "USD",
 *   "Rate": 12033.28,
 *   "Date": "2026-01-08"
 * }]
 */
/**
 * Fetch USD to UZS exchange rate from CBU API
 * 
 * API endpoints:
 * - Latest rate: https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/
 * - Rate for date: https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/YYYY-MM-DD/
 * - All currencies: https://cbu.uz/uz/arkhiv-kursov-valyut/json/
 * 
 * Response format:
 * [{
 *   "id": 69,
 *   "Code": "840",
 *   "Ccy": "USD",
 *   "Rate": "12033.28",
 *   "Date": "08.01.2026"
 * }]
 */
export async function fetchRateFromCBU(date?: Date): Promise<Decimal | null> {
  try {
    let url: string;
    
    if (date) {
      // Format date as YYYY-MM-DD for CBU API
      const dateStr = date.toISOString().split('T')[0];
      url = `https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/${dateStr}/`;
      console.log(`[CBU API] Fetching rate for date: ${dateStr} from ${url}`);
    } else {
      // Latest rate - use the endpoint without date
      url = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/';
      console.log('[CBU API] Fetching latest rate from', url);
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.error(`[CBU API] HTTP error: ${response.statusText} (${response.status})`);
      console.error(`[CBU API] URL: ${url}`);
      return null;
    }

    const data = await response.json();
    console.log(`[CBU API] Response received, data length: ${Array.isArray(data) ? data.length : 'not array'}`);
    
    if (Array.isArray(data) && data.length > 0) {
      // Find USD in the response (should be first, but let's be safe)
      const usdData = data.find((item: any) => item.Ccy === 'USD') || data[0];
      
      if (!usdData || !usdData.Rate) {
        console.error('[CBU API] USD data not found in response:', data);
        return null;
      }
      
      const usdRate = parseFloat(usdData.Rate);
      
      if (isNaN(usdRate) || usdRate <= 0) {
        console.error('[CBU API] Invalid rate value:', usdData.Rate);
        return null;
      }
      
      console.log(`[CBU API] Rate fetched successfully: ${usdRate} (Date: ${usdData.Date || 'latest'})`);
      return new Decimal(usdRate);
    }
    
    console.error('[CBU API] Empty or invalid data:', data);
    return null;
  } catch (error) {
    console.error('[CBU API] Error fetching exchange rate:', error);
    if (error instanceof Error) {
      console.error('[CBU API] Error message:', error.message);
      console.error('[CBU API] Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Fetch and save daily rate from CBU API
 * Uses last available rate as fallback if API fails
 * Returns the saved rate
 */
/**
 * Fetch and save daily rate from CBU API
 * Uses last available rate as fallback if API fails
 * Returns the saved rate
 * 
 * @param date Optional date to fetch rate for. If not provided, uses today's date
 */
export async function fetchAndSaveDailyRate(date?: Date): Promise<Decimal> {
  const targetDate = date || new Date();
  targetDate.setUTCHours(0, 0, 0, 0);

  console.log(`[CBU API] Fetching daily rate for date: ${targetDate.toISOString().split('T')[0]}`);

  // First, try to fetch latest rate (without date) - this always returns today's rate
  console.log('[CBU API] Trying to fetch latest rate from CBU API...');
  let cbuRate = await fetchRateFromCBU(); // No date = latest rate
  
  // If latest rate fetch failed or we need a specific date, try with date
  if (!cbuRate && date) {
    console.log(`[CBU API] Latest rate fetch failed, trying with specific date: ${targetDate.toISOString().split('T')[0]}`);
    cbuRate = await fetchRateFromCBU(targetDate);
  }
  
  if (cbuRate) {
    // Successfully fetched from CBU, save it
    try {
      await upsertExchangeRate(targetDate, cbuRate, 'CBU');
      console.log(`[CBU API] Successfully fetched and saved rate from CBU: ${cbuRate.toString()} for date ${targetDate.toISOString().split('T')[0]}`);
      return cbuRate;
    } catch (error) {
      console.error('[CBU API] Error saving CBU rate:', error);
      // Return the rate anyway, even if saving failed
      return cbuRate;
    }
  }

  // API failed, use last available rate as fallback
  console.warn('[CBU API] CBU API unavailable, using last available rate as fallback');
  
  const lastRate = await prisma.exchangeRate.findFirst({
    where: {
      currency: 'USD',
    },
    orderBy: {
      date: 'desc',
    },
  });

  if (lastRate) {
    // Save the last rate for target date with CBU source (indicating it's a fallback)
    try {
      await upsertExchangeRate(targetDate, lastRate.rate, 'CBU');
      console.log(`[CBU API] Used last available rate as fallback: ${lastRate.rate.toString()} (from ${lastRate.date.toISOString()})`);
      return lastRate.rate;
    } catch (error) {
      console.error('[CBU API] Error saving fallback rate:', error);
      throw new Error('Failed to save exchange rate (both CBU API and fallback failed)');
    }
  }

  throw new Error('No exchange rate available and CBU API failed. Please set a rate manually.');
}

/**
 * Create or update exchange rate
 * Enforces immutability: cannot update rates for past dates
 */
export async function upsertExchangeRate(
  date: Date,
  rate: Decimal | number | string,
  source: ExchangeSource = 'CBU',
  tx?: Prisma.TransactionClient | PrismaClient
): Promise<void> {
  const client = tx || prisma;
  const rateDecimal = new Decimal(rate);
  const rateDate = new Date(date);
  rateDate.setHours(0, 0, 0, 0);

  // Check if rate already exists for this date
  const existingRate = await client.exchangeRate.findUnique({
    where: {
      currency_date: {
        currency: 'USD',
        date: rateDate,
      },
    },
  });

  // If updating existing rate, check immutability
  if (existingRate) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (existingRate.date < now) {
      throw new Error(
        `Cannot update exchange rate for past date: ${existingRate.date.toISOString()}. Historical rates are immutable.`
      );
    }
  }

  // Upsert the rate
  await client.exchangeRate.upsert({
    where: {
      currency_date: {
        currency: 'USD',
        date: rateDate,
      },
    },
    update: {
      rate: rateDecimal,
      source,
    },
    create: {
      currency: 'USD',
      date: rateDate,
      rate: rateDecimal,
      source,
    },
  });
}

