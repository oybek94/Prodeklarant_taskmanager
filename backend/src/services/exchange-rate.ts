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

    // Try to find exact date match first (with preferred source if specified)
    let rate = await client.exchangeRate.findFirst({
      where: whereClause,
      orderBy: {
        date: 'desc',
      },
    });

    // If no rate found with preferred source, try any source
    if (!rate && preferredSource) {
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

    if (!rate) {
      throw new Error(
        `No exchange rate found for USD to UZS on or before ${date.toISOString()}`
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
 */
export async function fetchRateFromCBU(): Promise<Decimal | null> {
  try {
    // CBU API endpoint for USD exchange rate
    const response = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/');
    
    if (!response.ok) {
      console.error(`CBU API error: ${response.statusText} (${response.status})`);
      return null;
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const usdRate = parseFloat(data[0].Rate);
      if (isNaN(usdRate) || usdRate <= 0) {
        console.error('Invalid rate value from CBU API:', data[0].Rate);
        return null;
      }
      return new Decimal(usdRate);
    }
    
    console.error('CBU API returned empty or invalid data:', data);
    return null;
  } catch (error) {
    console.error('Error fetching exchange rate from CBU API:', error);
    return null;
  }
}

/**
 * Fetch and save daily rate from CBU API
 * Uses last available rate as fallback if API fails
 * Returns the saved rate
 */
export async function fetchAndSaveDailyRate(): Promise<Decimal> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Try to fetch from CBU API
  const cbuRate = await fetchRateFromCBU();
  
  if (cbuRate) {
    // Successfully fetched from CBU, save it
    try {
      await upsertExchangeRate(today, cbuRate, 'CBU');
      console.log(`Successfully fetched and saved daily rate from CBU: ${cbuRate.toString()}`);
      return cbuRate;
    } catch (error) {
      console.error('Error saving CBU rate:', error);
      // Fall through to fallback logic
    }
  }

  // API failed, use last available rate as fallback
  console.warn('CBU API unavailable, using last available rate as fallback');
  
  const lastRate = await prisma.exchangeRate.findFirst({
    where: {
      currency: 'USD',
    },
    orderBy: {
      date: 'desc',
    },
  });

  if (lastRate) {
    // Save the last rate for today with CBU source (indicating it's a fallback)
    try {
      await upsertExchangeRate(today, lastRate.rate, 'CBU');
      console.log(`Used last available rate as fallback: ${lastRate.rate.toString()} (from ${lastRate.date.toISOString()})`);
      return lastRate.rate;
    } catch (error) {
      console.error('Error saving fallback rate:', error);
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

