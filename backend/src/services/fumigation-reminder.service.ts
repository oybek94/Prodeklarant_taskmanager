import { prisma } from '../prisma';
import { sendTelegramMessage } from './telegram.service';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatTashkentTime = (date: Date): string =>
  date.toLocaleString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    hour12: false,
  });

/**
 * Vaqti kelgan fumigatsiya eslatmalarini notify bot orqali guruhga yuboradi.
 * Har bir eslatma atomik "claim" qilinadi (sentAt: null -> now), shuning uchun
 * pm2 restart yoki ikki jarayon bo'lsa ham xabar ikki marta ketmaydi.
 * Yuborish muvaffaqiyatsiz bo'lsa claim qaytariladi va keyingi daqiqada qayta uriniladi.
 */
export async function sendDueFumigationReminders(): Promise<number> {
  const now = new Date();
  const due = await prisma.fumigationReminder.findMany({
    where: { sentAt: null, remindAt: { lte: now } },
    include: { createdBy: { select: { name: true } } },
    orderBy: { remindAt: 'asc' },
    take: 50,
  });

  let sent = 0;
  for (const reminder of due) {
    const claim = await prisma.fumigationReminder.updateMany({
      where: { id: reminder.id, sentAt: null },
      data: { sentAt: new Date() },
    });
    if (claim.count !== 1) continue;

    const message =
      `🧪 <b>Fumigatsiya vaqti keldi!</b>\n\n` +
      `<b>Fura:</b> ${escapeHtml(reminder.truckNumber)}\n` +
      `<b>Rasmiylashtirish vaqti:</b> ${formatTashkentTime(reminder.remindAt)}\n` +
      `<b>Kiritgan:</b> ${escapeHtml(reminder.createdBy.name)}`;

    const ok = await sendTelegramMessage(message);
    if (ok) {
      sent += 1;
    } else {
      await prisma.fumigationReminder.updateMany({
        where: { id: reminder.id },
        data: { sentAt: null },
      });
    }
  }
  return sent;
}
