import { prisma } from '../prisma';
import { Prisma, Currency } from '@prisma/client';

/**
 * Valyuta kursini olish
 * @param from - Qaysi valyutadan
 * @param to - Qaysi valyutaga
 * @param date - Sana (ixtiyoriy, default: bugungi sana)
 * @returns Kurs yoki null
 */
export async function getExchangeRate(
  from: Currency,
  to: Currency,
  date?: Date
): Promise<number | null> {
  // Agar bir xil valyuta bo'lsa, 1 qaytarish
  if (from === to) {
    return 1;
  }

  const targetDate = date || new Date();
  targetDate.setHours(0, 0, 0, 0);

  // Eng yaqin kursni topish (sana bo'yicha)
  const rate = await prisma.currencyExchangeRate.findFirst({
    where: {
      fromCurrency: from,
      toCurrency: to,
      date: {
        lte: targetDate,
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  if (rate) {
    return Number(rate.rate);
  }

  // Agar to'g'ridan-to'g'ri kurs topilmasa, teskari kursni topish va invert qilish
  const reverseRate = await prisma.currencyExchangeRate.findFirst({
    where: {
      fromCurrency: to,
      toCurrency: from,
      date: {
        lte: targetDate,
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  if (reverseRate) {
    return 1 / Number(reverseRate.rate);
  }

  return null;
}

/**
 * Tashqi API'dan eng so'nggi kursni olish va saqlash
 * Hozircha CBU API ishlatiladi (keyinchalik boshqa API ham qo'shilishi mumkin)
 */
export async function fetchLatestRate(): Promise<void> {
  try {
    // CBU API'dan USD/UZS kursini olish
    // API endpoint: https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/
    const response = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/');
    
    if (!response.ok) {
      throw new Error(`CBU API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const usdRate = parseFloat(data[0].Rate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Bugungi sana uchun kurs mavjudligini tekshirish
      const existingRate = await prisma.currencyExchangeRate.findUnique({
        where: {
          fromCurrency_toCurrency_date: {
            fromCurrency: 'USD',
            toCurrency: 'UZS',
            date: today,
          },
        },
      });

      if (!existingRate) {
        // Yangi kursni saqlash
        await prisma.currencyExchangeRate.create({
          data: {
            fromCurrency: 'USD',
            toCurrency: 'UZS',
            rate: new Prisma.Decimal(usdRate),
            date: today,
            source: 'API',
          },
        });
      } else {
        // Mavjud kursni yangilash
        await prisma.currencyExchangeRate.update({
          where: {
            id: existingRate.id,
          },
          data: {
            rate: new Prisma.Decimal(usdRate),
            source: 'API',
          },
        });
      }
    }
  } catch (error) {
    console.error('Error fetching exchange rate from API:', error);
    throw error;
  }
}

/**
 * Summani bir valyutadan ikkinchisiga konvertatsiya qilish
 * @param amount - Summa
 * @param from - Qaysi valyutadan
 * @param to - Qaysi valyutaga
 * @param date - Sana (ixtiyoriy)
 * @returns Konvertatsiya qilingan summa yoki null
 */
export async function convertAmount(
  amount: number | Prisma.Decimal,
  from: Currency,
  to: Currency,
  date?: Date
): Promise<number | null> {
  if (from === to) {
    return Number(amount);
  }

  const rate = await getExchangeRate(from, to, date);
  if (rate === null) {
    return null;
  }

  return Number(amount) * rate;
}

/**
 * Qo'lda kurs kiritish
 * @param from - Qaysi valyutadan
 * @param to - Qaysi valyutaga
 * @param rate - Kurs
 * @param date - Sana (ixtiyoriy, default: bugungi sana)
 */
export async function setManualRate(
  from: Currency,
  to: Currency,
  rate: number,
  date?: Date
): Promise<void> {
  const targetDate = date || new Date();
  targetDate.setHours(0, 0, 0, 0);

  await prisma.currencyExchangeRate.upsert({
    where: {
      fromCurrency_toCurrency_date: {
        fromCurrency: from,
        toCurrency: to,
        date: targetDate,
      },
    },
    update: {
      rate: new Prisma.Decimal(rate),
      source: 'MANUAL',
    },
    create: {
      fromCurrency: from,
      toCurrency: to,
      rate: new Prisma.Decimal(rate),
      date: targetDate,
      source: 'MANUAL',
    },
  });
}

