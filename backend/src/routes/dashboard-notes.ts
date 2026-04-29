import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { io } from '../server';
import { sendTelegramMessage } from '../services/telegram.service';

const router = Router();

// GET all notes (active and recently completed)
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const activeTasks = await (prisma as any).dashboardNote.findMany({
      where: {
        OR: [
          { isCompleted: false },
          { 
            isCompleted: true, 
            completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
          }
        ]
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(activeTasks);
  } catch (error) {
    console.error('Error fetching dashboard notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// GET archived notes
router.get('/archive', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const archivedTasks = await (prisma as any).dashboardNote.findMany({
      where: {
        isCompleted: true,
        completedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } }
      },
      orderBy: { completedAt: 'desc' },
      take: 100
    });
    res.json(archivedTasks);
  } catch (error) {
    console.error('Error fetching archived notes:', error);
    res.status(500).json({ error: 'Failed to fetch archive' });
  }
});

// POST a new note
router.post('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { content, assignedToId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const note = await (prisma as any).dashboardNote.create({
      data: {
        content,
        createdById: req.user!.id,
        assignedToId: assignedToId ? Number(assignedToId) : null
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } }
      }
    });

    if (assignedToId && String(assignedToId) !== String(req.user!.id)) {
      await prisma.notification.create({
        data: {
          userId: Number(assignedToId),
          type: 'SYSTEM',
          title: 'Yangi vazifa',
          message: `Sizga yangi vazifa biriktirildi: "${content}"`,
        }
      });
    }

    const message = `<b>Yangi vazifa qo'shildi!</b>\n\n<b>Vazifa:</b> ${content}\n<b>Kim tomonidan:</b> ${note.createdBy.name}${note.assignedTo ? `\n<b>Kimga:</b> ${note.assignedTo.name}` : ''}`;
    await sendTelegramMessage(message);

    io.emit('dashboardNote:updated');
    res.json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT mark as done / toggle
router.put('/:id/toggle', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { isCompleted } = req.body;
    
    const note = await (prisma as any).dashboardNote.update({
      where: { id: Number(id) },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        completedById: isCompleted ? req.user!.id : null
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } }
      }
    });

    io.emit('dashboardNote:updated');
    res.json(note);
  } catch (error) {
    console.error('Error toggling note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});
// PUT update a note content
router.put('/:id', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const note = await (prisma as any).dashboardNote.update({
      where: { id: Number(id) },
      data: { content },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } }
      }
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
    const { id } = req.params;
    
    await (prisma as any).dashboardNote.delete({
      where: { id: Number(id) }
    });

    io.emit('dashboardNote:updated');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
