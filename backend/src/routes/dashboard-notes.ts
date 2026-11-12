import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { io } from '../server';
import { sendTelegramMessage } from '../services/telegram.service';
import {
  canModifyNote,
  noteContentSchema,
  noteCreateSchema,
  noteToggleError,
  noteToggleSchema,
  rewardPermissionError,
} from './dashboard-notes.guards';

const router = Router();

const NOTE_NOT_FOUND = 'Eslatma topilmadi';
const NOTE_FORBIDDEN = 'Faqat eslatmani yaratgan xodim yoki admin o\'zgartira oladi';

const noteRelations = {
  createdBy: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  completedBy: { select: { id: true, name: true } },
} as const;

/** Telegram xabari HTML rejimida ketadi — foydalanuvchi matni teg sifatida o'qilmasin */
const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const parseNoteId = (raw: string): number | null => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// GET all notes (active and recently completed)
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const activeTasks = await prisma.dashboardNote.findMany({
      where: {
        OR: [
          { isCompleted: false },
          {
            isCompleted: true,
            completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        ]
      },
      include: noteRelations,
      orderBy: { createdAt: 'desc' }
    });
    const formatted = activeTasks.map((t) => ({
      ...t,
      bountyReward: t.bountyReward ? Number(t.bountyReward) : null,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching dashboard notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// GET archived notes
router.get('/archive', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const archivedTasks = await prisma.dashboardNote.findMany({
      where: {
        isCompleted: true,
        completedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      include: noteRelations,
      orderBy: { completedAt: 'desc' },
      take: 100
    });
    const formatted = archivedTasks.map((t) => ({
      ...t,
      bountyReward: t.bountyReward ? Number(t.bountyReward) : null,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching archived notes:', error);
    res.status(500).json({ error: 'Failed to fetch archive' });
  }
});

// POST a new note
router.post('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = noteCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { content, assignedToId, xpReward, bountyReward } = parsed.data;

    // Mukofot uni yopgan xodimning ish haqi/XP hisobiga qo'shiladi — faqat admin belgilaydi
    const rewardError = rewardPermissionError(req.user.role, { xpReward, bountyReward });
    if (rewardError) return res.status(403).json({ error: rewardError });

    const note = await prisma.dashboardNote.create({
      data: {
        content,
        createdById: req.user.id,
        assignedToId: assignedToId ?? null,
        xpReward: xpReward || null,
        bountyReward: bountyReward || null,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } }
      }
    });

    if (assignedToId && assignedToId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: 'SYSTEM',
          title: 'Yangi vazifa',
          message: `Sizga yangi vazifa biriktirildi: "${content}"${xpReward ? ` (+${xpReward} XP)` : ''}${bountyReward ? ` (+${bountyReward.toLocaleString()} UZS)` : ''}`,
        }
      });
    }

    const message = `<b>Yangi vazifa qo'shildi!</b>\n\n<b>Vazifa:</b> ${escapeHtml(content)}\n<b>Kim tomonidan:</b> ${escapeHtml(note.createdBy.name)}${note.assignedTo ? `\n<b>Kimga:</b> ${escapeHtml(note.assignedTo.name)}` : ''}${note.xpReward ? `\n<b>Mukofot:</b> ${note.xpReward} XP ⭐️` : ''}${note.bountyReward ? `\n<b>Pul mukofoti:</b> ${Number(note.bountyReward).toLocaleString()} UZS 💰` : ''}`;
    await sendTelegramMessage(message);

    io.emit('dashboardNote:updated');
    res.json({
      ...note,
      bountyReward: note.bountyReward ? Number(note.bountyReward) : null,
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT mark as done / toggle
router.put('/:id/toggle', requireAuth(), async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = noteToggleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'isCompleted mantiqiy qiymat bo\'lishi kerak' });
    const { isCompleted } = parsed.data;

    const id = parseNoteId(String(req.params.id));
    const existing = id === null ? null : await prisma.dashboardNote.findUnique({ where: { id } });
    if (id === null || !existing) return res.status(404).json({ error: NOTE_NOT_FOUND });

    const toggleError = noteToggleError(existing, req.user, isCompleted);
    if (toggleError) return res.status(403).json({ error: toggleError });

    const note = await prisma.dashboardNote.update({
      where: { id },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        completedById: isCompleted ? req.user.id : null
      },
      include: noteRelations
    });

    io.emit('dashboardNote:updated');
    res.json({
      ...note,
      bountyReward: note.bountyReward ? Number(note.bountyReward) : null,
    });
  } catch (error) {
    console.error('Error toggling note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// PUT update a note content
router.put('/:id', requireAuth(), async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = noteContentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Content is required' });

    const id = parseNoteId(String(req.params.id));
    const existing = id === null ? null : await prisma.dashboardNote.findUnique({ where: { id } });
    if (id === null || !existing) return res.status(404).json({ error: NOTE_NOT_FOUND });
    if (!canModifyNote(existing, req.user)) return res.status(403).json({ error: NOTE_FORBIDDEN });

    const note = await prisma.dashboardNote.update({
      where: { id },
      data: { content: parsed.data.content },
      include: noteRelations
    });

    io.emit('dashboardNote:updated');
    res.json(note);
  } catch (error) {
    console.error('Error updating note content:', error);
    res.status(500).json({ error: 'Failed to update note content' });
  }
});

// DELETE a note
router.delete('/:id', requireAuth(), async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const id = parseNoteId(String(req.params.id));
    const existing = id === null ? null : await prisma.dashboardNote.findUnique({ where: { id } });
    if (id === null || !existing) return res.status(404).json({ error: NOTE_NOT_FOUND });
    if (!canModifyNote(existing, req.user)) return res.status(403).json({ error: NOTE_FORBIDDEN });

    await prisma.dashboardNote.delete({ where: { id } });

    io.emit('dashboardNote:updated');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
