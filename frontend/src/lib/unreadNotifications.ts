import apiClient from './api';

/**
 * `/notifications?unread=true` uchun umumiy dedupe qatlami.
 *
 * Sahifa ochilganda bu endpointni bir vaqtda to'rt joy chaqirardi
 * (useNotifications, XpAnimation, MedalAnimation, LeadWonAnimation) —
 * natijada bitta ma'lumot uchun 4 ta bir xil so'rov ketardi.
 *
 * Bu yerda ikki himoya bor:
 *   1. in-flight coalescing — so'rov ketayotgan bo'lsa, yangisi ochilmaydi,
 *      chaqiruvchilar o'sha promise'ni kutadi;
 *   2. qisqa TTL (2s) — deyarli bir vaqtda kelgan, lekin biri ulgurmagan
 *      chaqiruvlar ham keshdan oladi.
 *
 * TTL ataylab qisqa: bildirishnomalar 60s da bir yangilanadi (useNotifications),
 * shuning uchun 2s eskirish sezilmaydi, lekin mount paytidagi to'planishni yo'q qiladi.
 */

const TTL_MS = 2000;

let inflight: Promise<any[]> | null = null;
let cache: { data: any[]; at: number } | null = null;

export async function fetchUnreadNotifications(): Promise<any[]> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return cache.data;
  }

  if (inflight) return inflight;

  inflight = apiClient
    .get('/notifications?unread=true')
    .then((res) => {
      const data = Array.isArray(res.data) ? res.data : [];
      cache = { data, at: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/**
 * Keshni majburan tozalash — bildirishnoma o'qilgan/o'chirilgan holatlarda,
 * keyingi chaqiruv darhol serverdan yangi ro'yxat olishi uchun.
 */
export function invalidateUnreadNotifications(): void {
  cache = null;
}
