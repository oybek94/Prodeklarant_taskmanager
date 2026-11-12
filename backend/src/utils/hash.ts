import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 10;

/** Yangi yoki almashtirilayotgan xodim paroli uchun minimal uzunlik (mavjud parollarga ta'sir qilmaydi) */
export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_TOO_SHORT_MESSAGE = `Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak`;

export const hashPassword = (password: string) => bcrypt.hash(password, SALT_ROUNDS);
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);

/**
 * Foydalanuvchi topilmaganda ham bir xil vaqt sarflash uchun solishtiriladigan hash.
 * Haqiqiy (60 belgili) bcrypt hash bo'lishi shart: bcryptjs noto'g'ri uzunlikdagi
 * qiymatni hisoblamasdan darhol false qaytaradi va javob vaqti email/telefon
 * mavjudligini oshkor qiladi. Har ishga tushishda tasodifiy matndan olinadi.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), SALT_ROUNDS);
