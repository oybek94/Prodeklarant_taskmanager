import { Prisma, PowerOfAttorney } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { tashkentDateKey, tashkentParts } from '../utils/tashkent-time';
import { resolveExporterRequisites, ExporterRequisites } from './exporter-letterhead';

/**
 * Haydovchiga beriladigan ishonchnoma (cargo.customs.uz 50-grafa).
 *
 * Oqim: kengaytma avval reservePowerOfAttorney bilan raqam oladi, saytga yozadi,
 * keyin saytdan o'qilgan haydovchi ma'lumotini saveDriverDetails bilan qaytaradi.
 * Hujjat (PDF) shu yozuvdan chiziladi.
 */

export const pinflSchema = z.string().regex(/^\d{14}$/, 'JSHSHIR 14 ta raqamdan iborat bo\'lishi kerak');

const nameSchema = z.string().trim().min(1).max(100);

export const driverDetailsSchema = z.object({
  pinfl: pinflSchema,
  lastName: nameSchema,
  firstName: nameSchema,
  // Otasining ismi hamma hujjatda ham bo'lavermaydi
  patronymic: z.string().trim().max(100).default(''),
  passport: z.string().trim().min(5).max(20),
});
export type DriverDetails = z.infer<typeof driverDetailsSchema>;

export class PowerOfAttorneyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// --- Sana va shahar yordamchilari ------------------------------------------

const RU_MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export type RuDateParts = { day: string; monthName: string; year: number };

/** Toshkent kuni bo'yicha: «10» ноября 2026 */
export const ruDateParts = (date: Date): RuDateParts => {
  const p = tashkentParts(date);
  return { day: String(p.day).padStart(2, '0'), monthName: RU_MONTHS_GENITIVE[p.month], year: p.year };
};

/** Ishonchnoma amal qilish muddati — invoys yilining oxirgi kuni (31 dekabr) */
export const validUntilParts = (issueDate: Date): RuDateParts => ({
  day: '31',
  monthName: RU_MONTHS_GENITIVE[11],
  year: tashkentParts(issueDate).year,
});

/** "..., г. Фергана, ул. ..." → "Фергана". Topilmasa — null (hujjatda bo'sh joy qoladi) */
export const cityFromAddress = (address: string): string | null => {
  const match = address.match(/(?:^|[\s,])(?:г\.|г\s|город\s|гор\.)\s*([^,;()]+)/i);
  const city = match?.[1]?.trim();
  return city ? city : null;
};

// --- Eksportyor va invoys ma'lumotlari ----------------------------------------

export type PowerOfAttorneyContext = {
  invoice: { id: number; invoiceNumber: string; date: Date };
  exporter: ExporterRequisites;
  exporterInn: string;
  contract: Awaited<ReturnType<typeof findContract>>;
};

const findContract = (invoice: { contractId: number | null; clientId: number; contractNumber: string | null }) => {
  if (invoice.contractId) return prisma.contract.findUnique({ where: { id: invoice.contractId } });
  if (invoice.contractNumber) {
    return prisma.contract.findFirst({
      where: { clientId: invoice.clientId, contractNumber: invoice.contractNumber },
    });
  }
  return Promise.resolve(null);
};

const normalizeInn = (value: string) => value.replace(/\s+/g, '');

export const loadPowerOfAttorneyContext = async (invoiceId: number): Promise<PowerOfAttorneyContext> => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      date: true,
      clientId: true,
      contractId: true,
      contractNumber: true,
      client: { select: { inn: true } },
    },
  });
  if (!invoice) throw new PowerOfAttorneyError('Invoice topilmadi', 404);

  const [contract, companySettings] = await Promise.all([findContract(invoice), prisma.companySettings.findFirst()]);
  const exporter = resolveExporterRequisites({ contract, companySettings });
  // Shartnomada INN bo'lmasa — mijoz INN i; ikkalasi ham bo'lmasa raqamni
  // korxona bo'yicha ajratib bo'lmaydi
  const exporterInn = normalizeInn(exporter.inn || invoice.client?.inn || '');
  if (!exporterInn) {
    throw new PowerOfAttorneyError('Eksportyor INN i topilmadi: shartnomaga yoki mijoz kartochkasiga INN kiriting', 422);
  }

  return {
    invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber, date: invoice.date },
    exporter,
    exporterInn,
    contract,
  };
};

// --- Raqam berish -----------------------------------------------------------------

const MAX_ALLOCATION_ATTEMPTS = 5;
const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export type ReservedPowerOfAttorney = {
  number: number;
  /** YYYY-MM-DD (invoys sanasi) */
  date: string;
  record: PowerOfAttorney;
};

/**
 * Invoys uchun raqam beradi. Takroriy chaqiruv (to'ldirgichni qayta ishga tushirish)
 * o'sha raqamni qaytaradi; haydovchi almashgan bo'lsa raqam saqlanadi, ma'lumot tozalanadi.
 */
export const reservePowerOfAttorney = async (invoiceId: number, pinfl: string): Promise<ReservedPowerOfAttorney> => {
  const context = await loadPowerOfAttorneyContext(invoiceId);
  const dateKey = tashkentDateKey(context.invoice.date);
  const issueDate = new Date(`${dateKey}T00:00:00.000Z`);

  const existing = await prisma.powerOfAttorney.findUnique({ where: { invoiceId } });
  if (existing) {
    const sameDriver = existing.pinfl === pinfl;
    const record = sameDriver
      ? existing
      : await prisma.powerOfAttorney.update({
          where: { invoiceId },
          data: { pinfl, lastName: null, firstName: null, patronymic: null, passport: null },
        });
    return { number: record.sequence, date: dateKey, record };
  }

  // Parallel so'rovlarda bir xil raqam berilmasligi uchun unique indeksga tayanamiz
  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    const last = await prisma.powerOfAttorney.aggregate({
      where: { exporterInn: context.exporterInn, issueDate },
      _max: { sequence: true },
    });
    const sequence = (last._max.sequence ?? 0) + 1;
    try {
      const record = await prisma.powerOfAttorney.create({
        data: { invoiceId, exporterInn: context.exporterInn, issueDate, sequence, pinfl },
      });
      return { number: sequence, date: dateKey, record };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Boshqa so'rov shu raqamni oldi yoki shu invoys uchun yozuv paydo bo'ldi — qayta o'qiymiz
      const raced = await prisma.powerOfAttorney.findUnique({ where: { invoiceId } });
      if (raced) return { number: raced.sequence, date: dateKey, record: raced };
    }
  }
  throw new PowerOfAttorneyError('Ishonchnoma raqamini berib bo\'lmadi, qayta urinib ko\'ring', 409);
};

// --- Haydovchi ma'lumotini saqlash -----------------------------------------------

export const saveDriverDetails = async (invoiceId: number, details: DriverDetails): Promise<PowerOfAttorney> => {
  const existing = await prisma.powerOfAttorney.findUnique({ where: { invoiceId } });
  if (!existing) {
    throw new PowerOfAttorneyError('Ishonchnoma raqami hali berilmagan', 404);
  }
  if (existing.pinfl !== details.pinfl) {
    throw new PowerOfAttorneyError('JSHSHIR rezerv qilingan ishonchnomaga mos kelmaydi', 409);
  }
  return prisma.powerOfAttorney.update({
    where: { invoiceId },
    data: {
      lastName: details.lastName,
      firstName: details.firstName,
      patronymic: details.patronymic || null,
      passport: details.passport,
    },
  });
};
