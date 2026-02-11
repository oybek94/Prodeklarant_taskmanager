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
 * Resolve fileUrl (e.g. /uploads/tasks/filename or /uploads/documents/filename) to absolute path.
 * Validates path stays under uploadsRoot. Returns null if invalid.
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

/**
 * Uploads root: same as server.ts static (__dirname relative) so serverda fayllar topiladi.
 * Fallback: process.cwd()/uploads (local dev).
 */
function getUploadsRoot(): string {
  const fromDirname = path.resolve(__dirname, '..', '..', 'uploads');
  return fromDirname;
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
      return res.status(400).json({ success: false, error: msg, errorCode: 'VALIDATION_FAILED' });
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
        errorCode: 'NO_VALID_RECIPIENTS',
      });
    }

    const ccList = cc?.length ? normalizeEmails(cc) : undefined;
    const bccList = bcc?.length ? normalizeEmails(bcc) : undefined;

    const uploadsRoot = getUploadsRoot();
    const uploadsRootFallback = path.join(process.cwd(), 'uploads');
    const documents = await prisma.taskDocument.findMany({
      where: { taskId: task_id },
      select: { id: true, name: true, fileUrl: true },
    });

    const attachments: Array<{ filename: string; content: Buffer }> = [];
    for (const doc of documents) {
      let safePath = resolveSafePath(doc.fileUrl, uploadsRoot);
      if (!safePath) {
        return res.status(400).json({
          success: false,
          error: `Invalid file path for document: ${doc.name}`,
          errorCode: 'INVALID_DOCUMENT_PATH',
        });
      }

      let content: Buffer;
      try {
        content = await fs.readFile(safePath);
      } catch (err) {
        const pathFromDb = doc.fileUrl.startsWith('/uploads/')
          ? doc.fileUrl.slice('/uploads/'.length).replace(/\\/g, '/')
          : '';
        const documentsSub = path.join(uploadsRoot, 'documents');
        const tasksSub = path.join(uploadsRoot, 'tasks');
        const safeBaseName = path.basename(pathFromDb) || path.basename((doc.name || '').replace(/[^\w\s.-]/gi, '_')) || 'file';
        const candidates = [
          safePath,
          path.join(documentsSub, safeBaseName),
          path.join(tasksSub, safeBaseName),
        ].filter((p) => {
          const rel = path.relative(uploadsRoot, path.resolve(p));
          return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
        });
        let read = false;
        for (const candidate of candidates) {
          try {
            content = await fs.readFile(candidate);
            read = true;
            break;
          } catch {
            continue;
          }
        }
        if (!read) {
          const fallbackPath = resolveSafePath(doc.fileUrl, uploadsRootFallback);
          if (fallbackPath) {
            try {
              content = await fs.readFile(fallbackPath);
              read = true;
            } catch {
              // continue to error
            }
          }
        }
        if (!read) {
          console.error('Error reading task document file:', doc.fileUrl, doc.name, 'attempted roots:', uploadsRoot, uploadsRootFallback, err);
          return res.status(400).json({
            success: false,
            error: `Could not read file for document: ${doc.name}`,
            errorCode: 'DOCUMENT_FILE_NOT_FOUND',
          });
        }
      }

      const ext = path.extname(doc.fileUrl) || path.extname(doc.name || '') || '';
      const baseName = (doc.name || 'document').replace(/[^\w\s.-]/gi, '_');
      const filename = baseName + (ext || path.extname(safePath) || '');
      attachments.push({ filename, content: content! });
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
    const raw = err?.message || String(err);
    console.error('Send task email error:', raw);
    console.error('Full error (server log):', err);
    const isAuth = /invalid login|authentication failed|credentials/i.test(raw);
    const isConfig = /smtp|config|env|MAILRU/i.test(raw);
    const isNetwork = /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network/i.test(raw);
    const safeMessage =
      isAuth || isConfig || isNetwork
        ? raw.slice(0, 200)
        : 'Failed to send email. Please try again later.';
    return res.status(500).json({
      success: false,
      error: safeMessage,
      errorCode: 'SEND_FAILED',
    });
  }
});

export default router;
