import { z } from 'zod';

/**
 * Dashboard eslatmalari uchun validatsiya va ruxsat tekshiruvlari.
 * Alohida faylda — DB va socket'ga bog'liq emas, shuning uchun testlash oson.
 *
 * Sabab: eslatmaning `bountyReward` summasi uni yopgan xodimning ish haqi hisobiga,
 * `xpReward` esa XP ga qo'shiladi. Ilgari har qanday xodim o'ziga mukofotli eslatma
 * yaratib, o'zi "bajarildi" qilib qo'yishi mumkin edi.
 */

const MAX_XP_REWARD = 10_000;
const MAX_BOUNTY_REWARD_UZS = 1_000_000_000;

export const noteCreateSchema = z.object({
  content: z.string().trim().min(1, 'Matn kiritilishi shart').max(2000),
  assignedToId: z.number().int().positive().nullable().optional(),
  xpReward: z.number().int().min(0).max(MAX_XP_REWARD).nullable().optional(),
  bountyReward: z.number().min(0).max(MAX_BOUNTY_REWARD_UZS).nullable().optional(),
});

export const noteToggleSchema = z.object({ isCompleted: z.boolean() });

export const noteContentSchema = z.object({
  content: z.string().trim().min(1, 'Matn kiritilishi shart').max(2000),
});

interface GuardUser {
  id: number;
  role: string;
}

interface RewardFields {
  xpReward?: number | null;
  /** Bazadan Prisma Decimal bo'lib keladi — Number() bilan o'qiladi */
  bountyReward?: number | { toString(): string } | null;
}

export interface NoteForGuard extends RewardFields {
  createdById: number;
  assignedToId: number | null;
  isCompleted: boolean;
  completedById: number | null;
}

const isAdmin = (user: GuardUser): boolean => user.role === 'ADMIN';

const hasReward = (note: RewardFields): boolean =>
  (note.xpReward ?? 0) > 0 || Number(note.bountyReward ?? 0) > 0;

/** Mukofot (XP yoki pul) faqat admin tomonidan belgilanadi */
export function rewardPermissionError(role: string, data: RewardFields): string | null {
  if (role === 'ADMIN' || !hasReward(data)) return null;
  return 'Mukofot (XP yoki pul) faqat admin tomonidan belgilanadi';
}

/**
 * Eslatmani "bajarildi"/"bajarilmadi" qilish mumkinmi. Mukofotsiz eslatma umumiy
 * ro'yxat — har kim belgilaydi. Mukofotli eslatmada mukofot kimga borishi himoyalanadi.
 */
export function noteToggleError(note: NoteForGuard, user: GuardUser, isCompleted: boolean): string | null {
  if (isAdmin(user) || !hasReward(note)) return null;

  if (!isCompleted) {
    return note.completedById === user.id ? null : 'Mukofotli vazifani faqat uni bajargan xodim yoki admin bekor qila oladi';
  }
  if (note.isCompleted) {
    return 'Bu vazifa allaqachon bajarilgan';
  }
  if (note.assignedToId !== null) {
    return note.assignedToId === user.id ? null : 'Bu mukofotli vazifa boshqa xodimga biriktirilgan';
  }
  if (note.createdById === user.id) {
    return 'O\'zingiz yaratgan mukofotli vazifani o\'zingiz yopa olmaysiz';
  }
  return null;
}

/** Tahrirlash va o'chirish: faqat yaratuvchi yoki admin */
export function canModifyNote(note: Pick<NoteForGuard, 'createdById'>, user: GuardUser): boolean {
  return isAdmin(user) || note.createdById === user.id;
}
