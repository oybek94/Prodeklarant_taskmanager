/**
 * Hech qachon API javobiga chiqmasligi kerak bo'lgan kalitlar.
 *
 * Prisma `include: { client: true }` / `user: true` butun qatorni, jumladan parol
 * hashini qaytaradi — 2026-09-25 da GET /tasks/:id istalgan xodimga mijozning
 * passwordHash'ini berayotgani topildi. Har bir so'rovda `select` yozishni unutish
 * oson, shuning uchun himoya javob darajasida: app.set('json replacer', ...).
 */
const SECRET_KEYS = new Set(['passwordHash']);

export function stripSecretsReplacer(key: string, value: unknown): unknown {
  return SECRET_KEYS.has(key) ? undefined : value;
}
