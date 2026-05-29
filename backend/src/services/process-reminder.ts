import { prisma } from '../prisma';
import { TaskProcessLogAction } from '@prisma/client';
import { notify, getAdminUserIds } from './notificationService';

const PROCESS_TYPE_LABELS: Record<string, string> = {
  TIR: 'TIR-SMR',
  CERT: 'Zayavka',
  DECLARATION: 'Deklaratsiya',
};

const PROCESS_TYPE_QUESTIONS: Record<string, string> = {
  TIR: 'TIR-SMR tayyormi?',
  CERT: 'Sertifikat tayyormi?',
  DECLARATION: 'Deklaratsiya tayyormi?',
};

const PROCESS_TYPE_TO_STAGE_NAMES: Record<string, string[]> = {
  TIR: ['TIR-SMR'],
  CERT: ['Zayavka'],
  DECLARATION: ['Deklaratsiya'],
};

function getCarNumberFromTitle(title: string): string {
  if (!title || typeof title !== 'string') return '';
  const parts = title.split(/\s+АВТО\s+/i);
  if (parts.length >= 2) {
    const plate = parts[1].trim().split(/\s/)[0] || parts[1].trim();
    if (plate) return plate;
  }
  const beforeSlash = title.split('/')[0]?.trim();
  if (beforeSlash && beforeSlash.length <= 20) return beforeSlash;
  return '';
}

/**
 * Run reminder job: find TasksProcess due for reminder, create notifications, update next reminder time
 */
export async function runProcessReminderJob(): Promise<{ processed: number }> {
  const now = new Date();

  const due = await prisma.tasksProcess.findMany({
    where: {
      status: { in: ['NEW', 'IN_PROGRESS'] },
      remindersSent: { lt: 3 },
      nextReminderTime: { lte: now },
    },
    include: {
      task: { select: { id: true, title: true, branchId: true } },
    },
  });

  if (due.length > 0) {
    console.log(`[Process Reminder] ${due.length} ta vazifa eslatma vaqtiga yetdi`);
  }

  let processed = 0;
  for (const tp of due) {
    try {
      // 1. Jarayon completed emasmi?
      // a) TasksProcess done statusi bormi?
      const isCompletedProcess = await prisma.tasksProcess.findFirst({
        where: {
          taskId: tp.taskId,
          processType: tp.processType,
          status: 'DONE',
        },
      });

      // b) TaskStage statusi TAYYOR bo'lganmi?
      const stageNames = PROCESS_TYPE_TO_STAGE_NAMES[tp.processType] || [];
      const isCompletedStage = await prisma.taskStage.findFirst({
        where: {
          taskId: tp.taskId,
          name: { in: stageNames },
          status: 'TAYYOR',
        },
      });

      const isCompleted = !!(isCompletedProcess || isCompletedStage);

      // 2. Reminder yuborilgan user aynan shablonni yuklab olgan usermi?
      // (tp.userId aynan yuklab olgan user id si)
      const isSameUser = tp.userId > 0;

      if (isCompleted || !isSameUser) {
        // Eslatma yuborilmaydi va keyingi safar tekshirilmasligi uchun nextReminderTime = null qilinadi
        await prisma.tasksProcess.update({
          where: { id: tp.id },
          data: { nextReminderTime: null },
        });
        // Mavjud o'qilmagan bildirishnomalarni ham o'chirish
        if (isCompleted) {
          await prisma.$executeRawUnsafe(
            `UPDATE "Notification" SET "read" = true WHERE "read" = false AND metadata->>'taskProcessId' = '${tp.id}'`
          );
        }
        continue;
      }

      const settings = await prisma.processSettings.findUnique({
        where: { processType: tp.processType },
      });
      const reminder1 = settings?.reminder1 ?? 10;
      const reminder2 = settings?.reminder2 ?? 20;
      const reminder3 = settings?.reminder3 ?? 40;

      const label = PROCESS_TYPE_LABELS[tp.processType] || tp.processType;
      const question = PROCESS_TYPE_QUESTIONS[tp.processType] || 'Tayyor bo\'ldimi?';
      const carNumber = getCarNumberFromTitle(tp.task?.title || '');
      const prefix = carNumber || `Task #${tp.taskId}`;
      const title = `${prefix} — ${label}`;
      const message = question;
      const actionUrl = `/tasks/${tp.taskId}`;

      const newRemindersSent = tp.remindersSent + 1;
      let nextReminderTime: Date | null = null;
      if (newRemindersSent === 1) {
        nextReminderTime = new Date(tp.downloadedAt.getTime() + reminder2 * 60 * 1000);
      } else if (newRemindersSent === 2) {
        nextReminderTime = new Date(tp.downloadedAt.getTime() + reminder3 * 60 * 1000);
      }

      // Qabul qiluvchilar: faqat yuklab olgan ishchiga
      const recipientIds = new Set<number>([tp.userId]);

      const txOps: any[] = [
        prisma.taskProcessLog.create({
          data: {
            taskProcessId: tp.id,
            userId: tp.userId,
            action: TaskProcessLogAction.REMINDER_SENT,
          },
        }),
      ];

      if (newRemindersSent >= 3) {
        // Escalate: notify admins
        const adminIds = await getAdminUserIds();
        const escalateTitle = `${prefix} — ${label}`;
        const escalateMessage = 'Ish bajarilmadi! Admin e\'tiboriga yuborildi.';

        await notify({
          userIds: adminIds,
          type: 'PROCESS_ESCALATED',
          title: escalateTitle,
          message: escalateMessage,
          actionUrl,
          taskId: tp.taskId,
          metadata: { taskProcessId: tp.id, processType: tp.processType },
        });

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

      // Eslatma bildirishnomasi
      await notify({
        userIds: Array.from(recipientIds),
        type: 'PROCESS_REMINDER',
        title,
        message,
        actionUrl,
        taskId: tp.taskId,
        metadata: { taskProcessId: tp.id, processType: tp.processType },
      });

      processed++;
      console.log(`[Process Reminder] Bildirishnoma yuborildi: ${recipientIds.size} kishiga, taskId=${tp.taskId}, processType=${tp.processType}`);
    } catch (err) {
      console.error(`[ProcessReminder] Error processing taskProcess ${tp.id}:`, err);
    }
  }

  return { processed };
}
