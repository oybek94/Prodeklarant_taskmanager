import path from 'path';
import fs from 'fs';
import { createHash, randomInt } from 'crypto';
import { z } from 'zod';
import { TaskStatus, DocumentType } from '@prisma/client';
import { prisma } from '../prisma';
import { comparePassword, hashPassword } from '../utils/hash';
import { PORTAL_ROLE } from '../middleware/auth';
import { signAccessToken, signRefreshToken, JwtPayload } from '../utils/jwt';

/**
 * Mijoz portali (my.prodeklarant.uz) biznes mantig'i.
 *
 * Qoida: mijozga FAQAT shu yerda aniq `select` qilingan maydonlar chiqadi. Task'dagi
 * ichki maydonlar (snapshot*Price, KPI, xodim izohlari) hech qachon qaytarilmaydi.
 * `clientId` doim token'dan keladi (route ichida), URL/body'dan emas.
 */

export const loginSchema = z.object({
  login: z.string().trim().min(5).max(40),
  password: z.string().min(4).max(128),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });

export const shipmentsQuerySchema = z.object({
  status: z.enum(['IN_PROGRESS', 'READY', 'COMPLETED']).optional(),
});

export const documentsQuerySchema = z.object({
  shipmentId: z.coerce.number().int().positive().optional(),
});

export type ShipmentStatus = 'IN_PROGRESS' | 'READY' | 'COMPLETED';

const STATUS_TO_TASK: Record<ShipmentStatus, TaskStatus[]> = {
  READY: [TaskStatus.TAYYOR],
  COMPLETED: [TaskStatus.YAKUNLANDI],
  IN_PROGRESS: Object.values(TaskStatus).filter(
    (s) => s !== TaskStatus.TAYYOR && s !== TaskStatus.YAKUNLANDI,
  ),
};

export const toShipmentStatus = (status: TaskStatus): ShipmentStatus => {
  if (status === TaskStatus.TAYYOR) return 'READY';
  if (status === TaskStatus.YAKUNLANDI) return 'COMPLETED';
  return 'IN_PROGRESS';
};

// Mijozga ko'rsatiladigan hujjat turlari. OTHER (ichki/noma'lum) ataylab yo'q.
export const CLIENT_VISIBLE_DOC_TYPES: DocumentType[] = [
  DocumentType.INVOICE,
  DocumentType.ST,
  DocumentType.FITO,
  DocumentType.CMR,
  DocumentType.TIR,
];

const digitsOf = (value: string): string => value.replace(/\D/g, '');

/** Telefon raqamlarini formatdan qat'i nazar solishtirish: oxirgi 9 raqam. */
export const phoneKey = (value: string): string => digitsOf(value).slice(-9);

const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

/** Parol hash'ining qisqa izi. Parol almashtirilsa/o'chirilsa o'zgaradi → eski tokenlar bekor. */
export const passwordVersion = (passwordHash: string): string =>
  createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);

const issueTokens = (client: { id: number; name: string; passwordHash: string }) => {
  const payload: JwtPayload = {
    sub: client.id, role: PORTAL_ROLE, branchId: null, name: client.name, pv: passwordVersion(client.passwordHash),
  };
  return { accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload) };
};

export async function loginClient(login: string, password: string) {
  const key = phoneKey(login);
  const candidates = key.length === 9
    ? (await prisma.client.findMany({
        where: { passwordHash: { not: null }, phone: { not: null } },
        select: { id: true, name: true, phone: true, passwordHash: true },
      })).filter((c) => c.phone !== null && phoneKey(c.phone) === key)
    : [];

  // Bir telefon bir nechta korxonaga tegishli bo'lishi mumkin — paroli mos kelganini olamiz
  for (const c of candidates) {
    if (c.passwordHash && (await comparePassword(password, c.passwordHash))) {
      return { ...issueTokens({ id: c.id, name: c.name, passwordHash: c.passwordHash }), client: { id: c.id, name: c.name } };
    }
  }
  // Vaqt bo'yicha "foydalanuvchi mavjud emas"ni bildirmaslik uchun
  if (candidates.length === 0) await comparePassword(password, DUMMY_HASH);
  return null;
}

/** Token hanuzgi amaldagi parolga bog'liqmi (mijoz o'chirilgan/paroli almashgan/olib tashlangan bo'lsa false). */
export async function isPortalSessionValid(clientId: number, pv: string | undefined): Promise<boolean> {
  if (!pv) return false;
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { passwordHash: true } });
  return !!client?.passwordHash && passwordVersion(client.passwordHash) === pv;
}

export async function refreshClient(clientId: number, pv: string | undefined) {
  if (!pv) return null;
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, passwordHash: true },
  });
  if (!client || !client.passwordHash || passwordVersion(client.passwordHash) !== pv) return null;
  return issueTokens({ id: client.id, name: client.name, passwordHash: client.passwordHash });
}

export async function getClientProfile(clientId: number) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      phone: true,
      assignedUser: { select: { name: true, phone: true } },
    },
  });
  if (!client) return null;
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    manager: client.assignedUser
      ? { name: client.assignedUser.name, phone: client.assignedUser.phone }
      : null,
  };
}

interface StageRow {
  id: number;
  name: string;
  stageOrder: number;
  status: 'BOSHLANMAGAN' | 'TAYYOR';
  startedAt: Date | null;
  completedAt: Date | null;
}

/** Joriy bosqich: birinchi tugallanmagan; hammasi tugagan bo'lsa — oxirgisi. */
export function summarizeStages(stages: StageRow[]) {
  const sorted = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);
  const total = sorted.length;
  const done = sorted.filter((s) => s.status === 'TAYYOR').length;
  const currentIdx = sorted.findIndex((s) => s.status !== 'TAYYOR');
  const idx = currentIdx === -1 ? total - 1 : currentIdx;
  const current = idx >= 0 ? sorted[idx] : null;
  return {
    sorted,
    totalStages: total,
    doneStages: done,
    currentStage: current ? { name: current.name, index: idx + 1 } : null,
    allDone: total > 0 && currentIdx === -1,
  };
}

export async function listShipments(clientId: number, status?: ShipmentStatus) {
  const tasks = await prisma.task.findMany({
    where: { clientId, ...(status ? { status: { in: STATUS_TO_TASK[status] } } : {}) },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      branch: { select: { name: true } },
      stages: {
        select: { id: true, name: true, stageOrder: true, status: true, startedAt: true, completedAt: true },
      },
      _count: { select: { documents: true } },
    },
  });

  return tasks.map((t) => {
    const s = summarizeStages(t.stages);
    return {
      id: t.id,
      title: t.title,
      status: toShipmentStatus(t.status),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      branchName: t.branch?.name ?? null,
      currentStage: s.currentStage,
      totalStages: s.totalStages,
      doneStages: s.doneStages,
      documentCount: t._count.documents,
    };
  });
}

export async function getShipment(clientId: number, taskId: number) {
  const task = await prisma.task.findFirst({
    // clientId shartda: boshqa mijozning yuki 404 beradi (mavjudligi ham sezilmaydi)
    where: { id: taskId, clientId },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      driverPhone: true,
      hasPsr: true,
      branch: { select: { name: true } },
      stages: {
        select: {
          id: true,
          name: true,
          stageOrder: true,
          status: true,
          startedAt: true,
          completedAt: true,
          assignedTo: { select: { name: true } },
        },
      },
    },
  });
  if (!task) return null;

  const s = summarizeStages(task.stages);
  const assignee = new Map(task.stages.map((st) => [st.id, st.assignedTo?.name ?? null]));
  const currentOrder = s.currentStage ? s.sorted[s.currentStage.index - 1].stageOrder : null;

  return {
    id: task.id,
    title: task.title,
    status: toShipmentStatus(task.status),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    branchName: task.branch?.name ?? null,
    driverPhone: task.driverPhone,
    hasPsr: task.hasPsr,
    currentStage: s.currentStage,
    totalStages: s.totalStages,
    doneStages: s.doneStages,
    stages: s.sorted.map((st) => ({
      id: st.id,
      name: st.name,
      order: st.stageOrder,
      state: st.status === 'TAYYOR' ? 'DONE' : !s.allDone && st.stageOrder === currentOrder ? 'CURRENT' : 'PENDING',
      startedAt: st.startedAt,
      completedAt: st.completedAt,
      assigneeName: assignee.get(st.id) ?? null,
    })),
  };
}

export interface PortalDocument {
  id: string; // "t-<TaskDocument.id>"
  shipmentId: number;
  shipmentTitle: string;
  name: string;
  type: DocumentType | null;
  fileType: string;
  fileSize: number | null;
  createdAt: Date;
}

/**
 * Faqat TaskDocument, va faqat CLIENT_VISIBLE_DOC_TYPES. ArchiveDocument ATAYLAB yo'q: unda hujjat
 * turi saqlanmaydi, ichki (OTHER) hujjatlar ham arxivga ko'chadi; asl TaskDocument arxivlangandan
 * keyin ham o'chirilmaydi, shuning uchun yakunlangan yuklar hujjatlari baribir shu yerda ko'rinadi.
 */
export async function listDocuments(clientId: number, shipmentId?: number): Promise<PortalDocument[]> {
  const tasks = await prisma.task.findMany({
    where: { clientId, ...(shipmentId ? { id: shipmentId } : {}) },
    select: { id: true, title: true },
  });
  if (tasks.length === 0) return [];
  const titleById = new Map(tasks.map((t) => [t.id, t.title]));

  const docs = await prisma.taskDocument.findMany({
    where: { taskId: { in: tasks.map((t) => t.id) }, documentType: { in: CLIENT_VISIBLE_DOC_TYPES } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, taskId: true, name: true, documentType: true, fileType: true, fileSize: true, createdAt: true },
  });
  return docs.map((d) => ({
    id: `t-${d.id}`,
    shipmentId: d.taskId,
    shipmentTitle: titleById.get(d.taskId) ?? '',
    name: d.name,
    type: d.documentType,
    fileType: d.fileType,
    fileSize: d.fileSize,
    createdAt: d.createdAt,
  }));
}

const UPLOADS_ROOT = path.resolve(path.join(__dirname, '../../uploads'));

/** fileUrl (`/uploads/documents/x.pdf` yoki to'liq URL) → uploads ichidagi absolyut yo'l; tashqariga chiqsa null. */
export function resolveUploadPath(fileUrl: string): string | null {
  let pathname = fileUrl;
  if (/^https?:\/\//i.test(fileUrl)) {
    try {
      pathname = new URL(fileUrl).pathname;
    } catch {
      return null;
    }
  }
  let rel: string;
  try {
    rel = decodeURIComponent(pathname).replace(/^\/uploads\//, '').replace(/^\/+/, '');
  } catch {
    return null;
  }
  const abs = path.resolve(path.join(UPLOADS_ROOT, rel));
  if (!abs.startsWith(UPLOADS_ROOT + path.sep)) return null;
  return abs;
}

const DOC_ID = /^t-(\d+)$/;

export async function getDownloadableDocument(clientId: number, docId: string) {
  const m = DOC_ID.exec(docId);
  if (!m) return null;

  const doc = await prisma.taskDocument.findFirst({
    // Egalik task.clientId orqali; ko'rinadigan turlar ro'yxati list bilan bir xil
    where: { id: Number(m[1]), documentType: { in: CLIENT_VISIBLE_DOC_TYPES }, task: { clientId } },
    select: { name: true, fileUrl: true, fileType: true },
  });
  if (!doc) return null;

  const abs = resolveUploadPath(doc.fileUrl);
  if (!abs || !fs.existsSync(abs)) return null;

  const ext = path.extname(abs);
  const fileName = path.extname(doc.name) ? doc.name : `${doc.name}${ext}`;
  return { absolutePath: abs, fileName, fileType: doc.fileType };
}

// ---------------------------------------------------------------------------
// Admin: mijozga portal kirishini berish
// ---------------------------------------------------------------------------

// O'xshash belgilar (0/O, 1/l/I) chiqarib tashlangan — telefon orqali aytib berish oson
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generatePortalPassword = (length = 10): string =>
  Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('');

export async function getPortalAccess(clientId: number) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { phone: true, passwordHash: true },
  });
  if (!client) return null;
  return {
    login: client.phone,
    loginValid: !!client.phone && phoneKey(client.phone).length === 9,
    hasPassword: !!client.passwordHash,
  };
}

/** Yangi parol yaratadi (eskisini almashtiradi → eski tokenlar ham o'chadi). Ochiq parol FAQAT shu javobda. */
export async function resetPortalPassword(clientId: number) {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { phone: true } });
  if (!client) return { error: 'NOT_FOUND' as const };
  if (!client.phone || phoneKey(client.phone).length !== 9) return { error: 'NO_PHONE' as const };

  const password = generatePortalPassword();
  await prisma.client.update({ where: { id: clientId }, data: { passwordHash: await hashPassword(password) } });
  return { login: client.phone, password };
}

export async function revokePortalAccess(clientId: number): Promise<boolean> {
  const exists = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!exists) return false;
  await prisma.client.update({ where: { id: clientId }, data: { passwordHash: null } });
  return true;
}
