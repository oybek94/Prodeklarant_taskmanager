import { prisma } from '../prisma';
import { TaskProcessLogAction } from '@prisma/client';

const PROCESS_TYPE_LABELS: Record<string, string> = {
  TIR: 'TIR-SMR',
  CERT: 'Zayavka',
  DECLARATION: 'Deklaratsiya',
};

const PROCESS_TYPE_QUESTIONS: Record<string, string> = {
  TIR: 'Ishlar bajarildimi?',
  CERT: 'Zayavkalar jo\'natildimi?',
  DECLARATION: 'Ishlar bajarildimi?',
};

function getCarNumberFromTitle(title: string): string {
  if (!title || typeof title !== 'string') return '';
  // Format: "12345 АВТО 01A123BC" - avtomobil raqami "АВТО" dan keyin
  const parts = title.split(/\s+АВТО\s+/i);
  if (parts.length >= 2) {
    const plate = parts[1].trim().split(/\s/)[0] || parts[1].trim();
    if (plate) return plate;
  }
  // Fallback: "/" dan oldingi qism (vehicleNumber format)
  const beforeSlash = title.split('/')[0]?.trim();
  if (beforeSlash && beforeSlash.length <= 20) return beforeSlash;
  return '';
}

/**
 * Run reminder job: find TasksProcess due for reminder, create notifications, update next reminder time
 */
export async function runProcessReminderJob(): Promise<void> {
  const now = new Date();

  const due = await prisma.tasksProcess.findMany({
    where: {
      status: { in: ['NEW', 'IN_PROGRESS'] },
      remindersSent: { lt: 3 },
      nextReminderTime: { lte: now },
    },
    include: {
      task: { select: { id: true, title: true } },
    },
  });

  for (const tp of due) {
    try {
      const settings = await prisma.processSettings.findUnique({
        where: { processType: tp.processType },
      });
      const reminder1 = settings?.reminder1 ?? 10;
      const reminder2 = settings?.reminder2 ?? 20;
      const reminder3 = settings?.reminder3 ?? 40;

      const label = PROCESS_TYPE_LABELS[tp.processType] || tp.processType;
      const question = PROCESS_TYPE_QUESTIONS[tp.processType] || 'Ishlar bajarildimi?';
      const carNumber = getCarNumberFromTitle(tp.task?.title || '');
      const prefix = carNumber ? `${carNumber} - ` : `Task #${tp.taskId} - `;
      const message = `${prefix}${label}. ${question}`;
      const actionUrl = `/tasks/${tp.taskId}`;

      const newRemindersSent = tp.remindersSent + 1;
      let nextReminderTime: Date | null = null;
      if (newRemindersSent === 1) {
        nextReminderTime = new Date(tp.downloadedAt.getTime() + reminder2 * 60 * 1000);
      } else if (newRemindersSent === 2) {
        nextReminderTime = new Date(tp.downloadedAt.getTime() + reminder3 * 60 * 1000);
      }
      // remindersSent==3: no more reminders, will escalate

      const txOps: any[] = [
        prisma.inAppNotification.create({
          data: {
            userId: tp.userId,
            taskId: tp.taskId,
            taskProcessId: tp.id,
            message,
            actionUrl,
            read: false,
          },
        }),
        prisma.taskProcessLog.create({
          data: {
            taskProcessId: tp.id,
            userId: tp.userId,
            action: TaskProcessLogAction.REMINDER_SENT,
          },
        }),
      ];

      if (newRemindersSent >= 3) {
        // Escalate: notify admins, set status=ESCALATED
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', active: true },
          select: { id: true },
        });
        const escalatePrefix = carNumber ? `${carNumber} - ` : `Task #${tp.taskId} - `;
        const escalateMessage = `${escalatePrefix}${label}. Ish bajarilmadi, administratorlarga yuborildi.`;
        for (const a of admins) {
          txOps.push(
            prisma.inAppNotification.create({
              data: {
                userId: a.id,
                taskId: tp.taskId,
                taskProcessId: tp.id,
                message: escalateMessage,
                actionUrl,
                read: false,
              },
            })
          );
        }
        txOps.push(
          prisma.tasksProcess.update({
            where: { id: tp.id },
            data: {
              status: 'ESCALATED',
              remindersSent: newRemindersSent,
              nextReminderTime: null,
            },
          }),
          prisma.taskProcessLog.create({
            data: {
              taskProcessId: tp.id,
              userId: tp.userId,
              action: TaskProcessLogAction.ESCALATED,
            },
          })
        );
      } else {
        txOps.push(
          prisma.tasksProcess.update({
            where: { id: tp.id },
            data: {
              remindersSent: newRemindersSent,
              nextReminderTime,
            },
          })
        );
      }

      await prisma.$transaction(txOps);
    } catch (err) {
      console.error(`[ProcessReminder] Error processing taskProcess ${tp.id}:`, err);
    }
  }
}
