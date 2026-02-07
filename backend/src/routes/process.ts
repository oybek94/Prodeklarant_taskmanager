import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { ProcessType, TaskProcessLogAction } from '@prisma/client';
import { computeDurations } from '../services/stage-duration';
import { logKpiForStage } from '../services/kpi';
import { updateTaskStatus, generateQrTokenIfNeeded } from '../services/task-status';

const router = Router();

const PROCESS_TYPE_TO_STAGE_NAMES: Record<string, string[]> = {
  TIR: ['TIR-SMR'],
  CERT: ['Zayavka'], // Sertifikat tugmasi Zayavka jarayoniga bog'langan
  DECLARATION: ['Deklaratsiya'],
};

const downloadSchema = z.object({
  taskId: z.number().int().positive(),
  processType: z.enum(['TIR', 'CERT', 'DECLARATION']),
});

const confirmRejectSchema = z.object({
  taskProcessId: z.number().int().positive(),
});

const processSettingsSchema = z.object({
  settings: z.array(
    z.object({
      processType: z.enum(['TIR', 'CERT', 'DECLARATION']),
      estimatedTime: z.number().int().min(0),
      reminder1: z.number().int().min(0),
      reminder2: z.number().int().min(0),
      reminder3: z.number().int().min(0),
    })
  ),
});

// POST /process/download - Record download, start timer
router.post('/download', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const parsed = downloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { taskId, processType } = parsed.data;
    const userId = req.user!.id;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, branchId: true },
    });
    if (!task) {
      return res.status(404).json({ error: 'Task topilmadi' });
    }

    // Basic access: user must belong to same branch (or admin)
    if (req.user!.role !== 'ADMIN' && req.user!.branchId !== task.branchId) {
      return res.status(403).json({ error: 'Vazifa uchun kirish huquqi yo\'q' });
    }

    const processTypeEnum = processType as ProcessType;

    // Get settings for nextReminderTime
    const settings = await prisma.processSettings.findUnique({
      where: { processType: processTypeEnum },
    });
    const reminder1 = settings?.reminder1 ?? 10;
    const downloadedAt = new Date();
    const nextReminderTime = new Date(downloadedAt.getTime() + reminder1 * 60 * 1000);

    // Edge case: if same taskId+processType+userId has IN_PROGRESS, skip duplicate (or create new - plan says allow multiple or upsert)
    const existing = await prisma.tasksProcess.findFirst({
      where: {
        taskId,
        processType: processTypeEnum,
        userId,
        status: { in: ['NEW', 'IN_PROGRESS'] },
      },
    });
    if (existing) {
      return res.status(200).json({ taskProcessId: existing.id });
    }

    const tp = await prisma.tasksProcess.create({
      data: {
        taskId,
        userId,
        processType: processTypeEnum,
        status: 'IN_PROGRESS',
        downloadedAt,
        nextReminderTime,
        remindersSent: 0,
      },
    });

    await prisma.taskProcessLog.create({
      data: {
        taskProcessId: tp.id,
        userId,
        action: TaskProcessLogAction.DOWNLOAD,
      },
    });

    // Tegishli stage ni boshlangan (startedAt) belgilash
    const stageNames = PROCESS_TYPE_TO_STAGE_NAMES[processTypeEnum];
    if (stageNames?.length) {
      const stage = await prisma.taskStage.findFirst({
        where: {
          taskId,
          name: { in: stageNames },
          startedAt: null,
        },
        orderBy: { stageOrder: 'asc' },
      });
      if (stage) {
        await prisma.taskStage.update({
          where: { id: stage.id },
          data: { startedAt: downloadedAt },
        });
      }
    }

    res.status(200).json({ taskProcessId: tp.id });
  } catch (error: any) {
    console.error('Process download error:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /process/confirm - User confirms task done
router.post('/confirm', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const parsed = confirmRejectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { taskProcessId } = parsed.data;
    const userId = req.user!.id;

    const tp = await prisma.tasksProcess.findUnique({
      where: { id: taskProcessId },
      include: { notifications: true },
    });
    if (!tp) {
      return res.status(404).json({ error: 'Task process topilmadi' });
    }
    if (tp.userId !== userId) {
      return res.status(403).json({ error: 'Faqat tayinlangan ishchi tasdiqlashi mumkin' });
    }

    const now = new Date();
    let needsQrToken = false;

    await prisma.$transaction(async (tx) => {
      await tx.tasksProcess.update({
        where: { id: taskProcessId },
        data: {
          status: 'DONE',
          doneAt: now,
          doneById: userId,
        },
      });
      await tx.taskProcessLog.create({
        data: {
          taskProcessId,
          userId,
          action: TaskProcessLogAction.CONFIRM,
        },
      });
      await tx.inAppNotification.updateMany({
        where: { taskProcessId },
        data: { read: true },
      });

      // Tegishli task stage ni avtomatik TAYYOR belgilash
      const stageNames = PROCESS_TYPE_TO_STAGE_NAMES[tp.processType];
      if (stageNames?.length) {
        const stage = await tx.taskStage.findFirst({
          where: {
            taskId: tp.taskId,
            name: { in: stageNames },
            status: { not: 'TAYYOR' },
          },
          orderBy: { stageOrder: 'asc' },
        });
        if (stage) {
          await tx.taskStage.update({
            where: { id: stage.id },
            data: {
              status: 'TAYYOR',
              completedAt: now,
              startedAt: stage.startedAt ?? now,
              assignedToId: userId,
            },
          });
          await computeDurations(tx, tp.taskId);
          await logKpiForStage(tx, tp.taskId, stage.name, userId, now);
          needsQrToken = await updateTaskStatus(tx, tp.taskId);
        }
      }
    });

    if (needsQrToken) {
      generateQrTokenIfNeeded(tp.taskId).catch(() => {});
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Process confirm error:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// POST /process/reject - User says not done, schedule next reminder
router.post('/reject', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const parsed = confirmRejectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { taskProcessId } = parsed.data;
    const userId = req.user!.id;

    const tp = await prisma.tasksProcess.findUnique({
      where: { id: taskProcessId },
    });
    if (!tp) {
      return res.status(404).json({ error: 'Task process topilmadi' });
    }
    if (tp.userId !== userId) {
      return res.status(403).json({ error: 'Faqat tayinlangan ishchi rad etishi mumkin' });
    }

    const settings = await prisma.processSettings.findUnique({
      where: { processType: tp.processType },
    });
    const reminder2 = settings?.reminder2 ?? 20;
    const reminder3 = settings?.reminder3 ?? 40;

    const newRemindersSent = tp.remindersSent + 1;
    let nextReminderTime: Date | null = null;
    if (newRemindersSent === 1) {
      nextReminderTime = new Date(tp.downloadedAt.getTime() + reminder2 * 60 * 1000);
    } else if (newRemindersSent === 2) {
      nextReminderTime = new Date(tp.downloadedAt.getTime() + reminder3 * 60 * 1000);
    }

    if (newRemindersSent >= 3) {
      // Escalate: status=ESCALATED, notify admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', active: true },
        select: { id: true },
      });
      const task = await prisma.task.findUnique({
        where: { id: tp.taskId },
        select: { id: true },
      });
      const actionUrl = task ? `/tasks/${task.id}` : undefined;
      const message = `Task #${tp.taskId} - ${tp.processType}. Ish bajarilmadi, administratorlarga yuborildi.`;

      await prisma.$transaction([
        prisma.tasksProcess.update({
          where: { id: taskProcessId },
          data: { status: 'ESCALATED' },
        }),
        prisma.taskProcessLog.create({
          data: {
            taskProcessId,
            userId,
            action: TaskProcessLogAction.REJECT,
          },
        }),
        prisma.taskProcessLog.create({
          data: {
            taskProcessId,
            userId,
            action: TaskProcessLogAction.ESCALATED,
          },
        }),
        ...admins.map((a) =>
          prisma.inAppNotification.create({
            data: {
              userId: a.id,
              taskId: tp.taskId,
              taskProcessId,
              message,
              actionUrl,
              read: false,
            },
          })
        ),
      ]);
    } else {
      await prisma.$transaction([
        prisma.tasksProcess.update({
          where: { id: taskProcessId },
          data: {
            remindersSent: newRemindersSent,
            nextReminderTime,
          },
        }),
        prisma.taskProcessLog.create({
          data: {
            taskProcessId,
            userId,
            action: TaskProcessLogAction.REJECT,
          },
        }),
      ]);
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Process reject error:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// GET /process/settings - Get process settings (Admin only)
router.get('/settings', requireAuth('ADMIN'), async (_req: AuthRequest, res) => {
  try {
    const settings = await prisma.processSettings.findMany({
      orderBy: { processType: 'asc' },
    });
    res.json(settings);
  } catch (error: any) {
    console.error('Process settings get error:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

// PUT /process/settings - Update process settings (Admin only)
router.put('/settings', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const parsed = processSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    for (const s of parsed.data.settings) {
      await prisma.processSettings.upsert({
        where: { processType: s.processType as ProcessType },
        update: {
          estimatedTime: s.estimatedTime,
          reminder1: s.reminder1,
          reminder2: s.reminder2,
          reminder3: s.reminder3,
        },
        create: {
          processType: s.processType as ProcessType,
          estimatedTime: s.estimatedTime,
          reminder1: s.reminder1,
          reminder2: s.reminder2,
          reminder3: s.reminder3,
        },
      });
    }

    const settings = await prisma.processSettings.findMany({
      orderBy: { processType: 'asc' },
    });
    res.json(settings);
  } catch (error: any) {
    console.error('Process settings put error:', error);
    res.status(500).json({ error: error.message || 'Xatolik yuz berdi' });
  }
});

export default router;
