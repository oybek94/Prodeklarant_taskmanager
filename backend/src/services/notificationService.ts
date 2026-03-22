import { prisma } from '../prisma';
import { socketEmitter } from './socketEmitter';

// NotificationType — Prisma enum bilan sinxron bo'lishi kerak
type NotificationType =
  | 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_COMPLETED' | 'TASK_DELETED'
  | 'STAGE_UPDATED' | 'PROCESS_REMINDER' | 'PROCESS_ESCALATED'
  | 'INVOICE_SAVED' | 'INVOICE_CONFLICT' | 'ERROR_ADDED' | 'SYSTEM';

// Bildirishnoma turi bo'yicha konfiguratsiya
const NOTIFICATION_CONFIG: Record<NotificationType, {
  icon: string;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gray';
}> = {
  TASK_CREATED:      { icon: '📋', color: 'green' },
  TASK_UPDATED:      { icon: '✏️', color: 'blue' },
  TASK_COMPLETED:    { icon: '✅', color: 'green' },
  TASK_DELETED:      { icon: '🗑️', color: 'red' },
  STAGE_UPDATED:     { icon: '🔄', color: 'blue' },
  PROCESS_REMINDER:  { icon: '⏰', color: 'yellow' },
  PROCESS_ESCALATED: { icon: '🚨', color: 'red' },
  INVOICE_SAVED:     { icon: '📄', color: 'purple' },
  INVOICE_CONFLICT:  { icon: '⚠️', color: 'yellow' },
  ERROR_ADDED:       { icon: '⚠️', color: 'red' },
  SYSTEM:            { icon: 'ℹ️', color: 'gray' },
};

export { NOTIFICATION_CONFIG };

interface NotifyParams {
  userIds: number[];
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  taskId?: number;
  metadata?: Record<string, any>;
  excludeUserId?: number; // bu foydalanuvchiga yubormaslik
}

/**
 * Bildirishnoma yaratish va Socket orqali push yuborish.
 * - DB ga har bir qabul qiluvchi uchun yozadi
 * - Socket.io orqali real-time push yuboradi
 */
export async function notify(params: NotifyParams): Promise<void> {
  const { userIds, type, title, message, actionUrl, taskId, metadata, excludeUserId } = params;

  // excludeUserId ni chiqarib tashlash
  const recipients = excludeUserId
    ? userIds.filter(id => id !== excludeUserId)
    : userIds;

  if (recipients.length === 0) return;

  const config = NOTIFICATION_CONFIG[type];

  try {
    // DB ga saqlash — raw SQL (prisma generate kerak emas)
    const values = recipients.map(userId =>
      `(${userId}, '${type}'::\"NotificationType\", '${title.replace(/'/g, "''")}', '${message.replace(/'/g, "''")}', ${actionUrl ? `'${actionUrl.replace(/'/g, "''")}'` : 'NULL'}, false, ${taskId || 'NULL'}, ${metadata ? `'${JSON.stringify(metadata).replace(/'/g, "''")}'::jsonb` : 'NULL'}, NOW())`
    ).join(', ');
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Notification" ("userId", "type", "title", "message", "actionUrl", "read", "taskId", "metadata", "createdAt") VALUES ${values}`
    );

    // Socket.io orqali push
    for (const userId of recipients) {
      socketEmitter.toUser(userId, 'notification:new', {
        type,
        title,
        message,
        icon: config.icon,
        color: config.color,
        actionUrl,
        taskId,
      });
    }
  } catch (err) {
    console.error('[NotificationService] Error creating notifications:', err);
  }
}

/**
 * Filial bo'yicha barcha faol foydalanuvchilarning ID larini olish
 */
export async function getBranchUserIds(branchId: number): Promise<number[]> {
  const users = await prisma.user.findMany({
    where: { branchId, active: true },
    select: { id: true },
  });
  return users.map(u => u.id);
}

/**
 * Barcha admin foydalanuvchilarning ID larini olish
 */
export async function getAdminUserIds(): Promise<number[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', active: true },
    select: { id: true },
  });
  return admins.map(u => u.id);
}

/**
 * Barcha faol foydalanuvchilarning ID larini olish
 */
export async function getAllActiveUserIds(): Promise<number[]> {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true },
  });
  return users.map(u => u.id);
}
