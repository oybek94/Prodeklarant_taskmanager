import { Router, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ValidationService } from '../services/validation.service';
import { sendMail, requireMailRuConfig } from '../services/mail.service';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmails(arr: string[]): string[] {
  const set = new Set<string>();
  for (const e of arr) {
    const trimmed = e.trim().toLowerCase();
    if (trimmed && EMAIL_REGEX.test(trimmed)) set.add(trimmed);
  }
  return Array.from(set);
}

const sendTaskEmailSchema = z.object({
  task_id: z.number().int().positive(),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().optional(),
  recipients: z.array(z.string()).min(1, 'At least one recipient is required'),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
});

/**
 * Resolve fileUrl (e.g. /uploads/tasks/filename) to absolute path and validate it stays under uploads.
 * Returns null if invalid (path traversal or not under uploads).
 */
function resolveSafePath(fileUrl: string, uploadsRoot: string): string | null {
  if (!fileUrl.startsWith('/uploads/')) return null;
  const pathFromDb = fileUrl.slice('/uploads/'.length).replace(/\\/g, '/');
  if (!pathFromDb || pathFromDb.includes('..')) return null;
  const joined = path.join(uploadsRoot, pathFromDb);
  const resolved = path.resolve(joined);
  const relative = path.relative(uploadsRoot, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}

router.post('/', requireAuth(), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const parsed = sendTaskEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat().join(' ') || 'Validation failed';
      return res.status(400).json({ success: false, error: msg });
    }

    const { task_id, subject, body, recipients, cc, bcc } = parsed.data;

    try {
      requireMailRuConfig();
    } catch (e: any) {
      return res.status(503).json({
        success: false,
        error: e?.message || 'Email is not configured',
      });
    }

    const task = await prisma.task.findUnique({
      where: { id: task_id },
      include: { client: true },
    });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (task.status !== 'YAKUNLANDI') {
      return res.status(400).json({
        success: false,
        error: 'Only completed tasks (YAKUNLANDI) can be sent by email',
      });
    }

    const validationService = new ValidationService(prisma);
    const canAccess = await validationService.canUserAccessTask(
      task_id,
      user.id,
      user.role
    );
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this task',
      });
    }

    const contractEmails: string[] = [];
    if (task.client?.email?.trim()) {
      const trimmed = task.client.email.trim().toLowerCase();
      if (EMAIL_REGEX.test(trimmed)) contractEmails.push(trimmed);
    }

    const toList = normalizeEmails(recipients);
    const mergedTo = Array.from(new Set([...contractEmails, ...toList]));
    if (mergedTo.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one valid recipient email is required',
      });
    }

    const ccList = cc?.length ? normalizeEmails(cc) : undefined;
    const bccList = bcc?.length ? normalizeEmails(bcc) : undefined;

    const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
    const documents = await prisma.taskDocument.findMany({
      where: { taskId: task_id },
      select: { id: true, name: true, fileUrl: true },
    });

    const attachments: Array<{ filename: string; content: Buffer }> = [];
    for (const doc of documents) {
      const safePath = resolveSafePath(doc.fileUrl, uploadsRoot);
      if (!safePath) {
        return res.status(400).json({
          success: false,
          error: `Invalid file path for document: ${doc.name}`,
        });
      }
      try {
        const content = await fs.readFile(safePath);
        const ext = path.extname(doc.fileUrl) || '';
        const baseName = (doc.name || 'document').replace(/[^\w\s.-]/gi, '_');
        const filename = baseName + (ext || path.extname(safePath) || '');
        attachments.push({ filename, content });
      } catch (err) {
        console.error('Error reading task document file:', err);
        return res.status(400).json({
          success: false,
          error: `Could not read file for document: ${doc.name}`,
        });
      }
    }

    await sendMail({
      to: mergedTo,
      cc: ccList,
      bcc: bccList,
      subject,
      text: body || undefined,
      attachments: attachments.length ? attachments : undefined,
    });

    return res.json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (err: any) {
    console.error('Send task email error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to send email. Please try again later.',
    });
  }
});

export default router;
