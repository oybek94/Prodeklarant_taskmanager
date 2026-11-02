import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';

// Yuk botidagi /arxiv: mijozning yakunlangan yuklari ro'yxati va tanlangan yukning hujjatlari.
// Telegram kutubxonasiga bog'liq emas — bot servisi faqat yuboradi.

export const ARCHIVE_PAGE_SIZE = 10;
/** Telegram bir albomga ko'pi bilan 10 ta fayl qo'yadi */
export const ALBUM_SIZE = 10;
/** Bot orqali yuboriladigan bitta fayl limiti (Telegram: 50 MB) */
export const MAX_TELEGRAM_FILE_BYTES = 50 * 1024 * 1024;

const BUTTON_TEXT_MAX = 60;
const EMPTY_VALUE = '—';

const uploadsDir = path.join(__dirname, '../../uploads');
const documentsDir = path.join(uploadsDir, 'documents');
const archiveDir = path.join(uploadsDir, 'archive');

export interface ArchiveTaskItem {
  taskId: number;
  invoiceNumber: string | null;
  vehicleNumber: string | null;
}

export interface ArchivePage {
  items: ArchiveTaskItem[];
  page: number;
  totalPages: number;
  total: number;
}

export interface ArchiveFile {
  name: string;
  buffer: Buffer;
}

export interface TaskFiles {
  label: string;
  files: ArchiveFile[];
  /** Hujjat bor, lekin diskda topilmagan yoki limitdan katta bo'lgani uchun yuborilmaganlar */
  skipped: string[];
  /** Bazada nechta hujjat bor */
  documentCount: number;
}

export function readVehicleNumber(additionalInfo: unknown): string | null {
  if (typeof additionalInfo !== 'object' || additionalInfo === null || Array.isArray(additionalInfo)) return null;
  const value = (additionalInfo as Record<string, unknown>).vehicleNumber;
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** "INV-123 | 01A123BC" — qiymati yo'q bo'lsa "—" */
export function formatArchiveLabel(item: Pick<ArchiveTaskItem, 'invoiceNumber' | 'vehicleNumber'>): string {
  const invoice = item.invoiceNumber?.trim() || EMPTY_VALUE;
  const vehicle = item.vehicleNumber?.trim() || EMPTY_VALUE;
  return `${invoice} | ${vehicle}`;
}

export function truncateButtonText(text: string): string {
  return text.length <= BUTTON_TEXT_MAX ? text : `${text.slice(0, BUTTON_TEXT_MAX - 1)}…`;
}

export function chunkForAlbums<T>(items: T[], size = ALBUM_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Sahifa raqamini [0, totalPages-1] oralig'iga keltiradi (noto'g'ri callback ma'lumotiga chidamli) */
export function clampPage(page: number, totalPages: number): number {
  if (!Number.isInteger(page) || page < 0) return 0;
  return Math.min(page, Math.max(totalPages - 1, 0));
}

export async function getClientIdByGroup(chatId: string): Promise<number | null> {
  const client = await prisma.client.findUnique({ where: { botGroupChatId: chatId }, select: { id: true } });
  return client?.id ?? null;
}

export async function getArchivePage(clientId: number, requestedPage: number): Promise<ArchivePage> {
  const where = { clientId, status: 'YAKUNLANDI' as const };
  const total = await prisma.task.count({ where });
  const totalPages = Math.max(Math.ceil(total / ARCHIVE_PAGE_SIZE), 1);
  const page = clampPage(requestedPage, totalPages);
  const tasks = await prisma.task.findMany({
    where,
    orderBy: { id: 'desc' },
    skip: page * ARCHIVE_PAGE_SIZE,
    take: ARCHIVE_PAGE_SIZE,
    select: { id: true, invoice: { select: { invoiceNumber: true, additionalInfo: true } } },
  });
  return {
    page,
    totalPages,
    total,
    items: tasks.map((t) => ({
      taskId: t.id,
      invoiceNumber: t.invoice?.invoiceNumber ?? null,
      vehicleNumber: readVehicleNumber(t.invoice?.additionalInfo),
    })),
  };
}

/** Yuk BOT guruhi mijoziga tegishli va yakunlangan bo'lsagina qaytaradi — boshqa mijoz yukiga kirib bo'lmaydi */
export async function getOwnedArchiveTask(clientId: number, taskId: number): Promise<ArchiveTaskItem | null> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, clientId, status: 'YAKUNLANDI' },
    select: { id: true, invoice: { select: { invoiceNumber: true, additionalInfo: true } } },
  });
  if (!task) return null;
  return {
    taskId: task.id,
    invoiceNumber: task.invoice?.invoiceNumber ?? null,
    vehicleNumber: readVehicleNumber(task.invoice?.additionalInfo),
  };
}

function resolveUploadPath(fileUrl: string): string | null {
  let pathname = fileUrl;
  if (/^https?:\/\//i.test(fileUrl)) {
    try {
      pathname = new URL(fileUrl).pathname;
    } catch {
      pathname = fileUrl;
    }
  }
  const relative = pathname.startsWith('/uploads/') ? pathname.replace(/^\/uploads\//, '') : pathname.replace(/^\/+/, '');
  const baseName = path.basename(fileUrl);
  const candidates = [path.join(uploadsDir, relative), path.join(documentsDir, baseName), path.join(archiveDir, baseName)];
  const uploadsRoot = path.resolve(uploadsDir) + path.sep;
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(uploadsRoot)) continue;
    if (fs.existsSync(resolved)) return resolved;
  }
  return null;
}

/** Yuk hujjatlarini o'qiydi. Yakunlangan yukda hujjatlar ArchiveDocument'da; bo'sh bo'lsa TaskDocument'dan olinadi. */
export async function loadTaskFiles(item: ArchiveTaskItem, options: { preferTaskDocuments?: boolean } = {}): Promise<TaskFiles> {
  const findArchived = () =>
    prisma.archiveDocument.findMany({ where: { taskId: item.taskId }, orderBy: { id: 'asc' }, select: { name: true, fileUrl: true } });
  const findTaskDocs = () =>
    prisma.taskDocument.findMany({ where: { taskId: item.taskId }, orderBy: { id: 'asc' }, select: { name: true, fileUrl: true } });

  let docs: { name: string; fileUrl: string }[];
  if (options.preferTaskDocuments) {
    // Haydovchi: yukka yuklangan BARCHA hujjatlar (turidan qat'i nazar, OTHER ham); TaskDocument bo'sh bo'lsa arxivdan
    docs = await findTaskDocs();
    if (docs.length === 0) docs = await findArchived();
  } else {
    // Arxiv (mijoz guruhi): yakunlangan yukda hujjatlar ArchiveDocument'da; bo'sh bo'lsa TaskDocument'dan
    const archived = await findArchived();
    docs = archived.length > 0 ? archived : await findTaskDocs();
  }

  const files: ArchiveFile[] = [];
  const skipped: string[] = [];
  for (const doc of docs) {
    const filePath = resolveUploadPath(doc.fileUrl);
    if (!filePath) {
      skipped.push(doc.name);
      continue;
    }
    const stat = await fs.promises.stat(filePath);
    if (stat.size > MAX_TELEGRAM_FILE_BYTES) {
      skipped.push(doc.name);
      continue;
    }
    // Nomda kengaytma bo'lmasa (masalan "Invoys") faylning o'zidan olinadi — Telegram turini aniqlashi uchun
    const name = path.extname(doc.name) ? doc.name : `${doc.name}${path.extname(filePath)}`;
    files.push({ name, buffer: await fs.promises.readFile(filePath) });
  }
  return { label: formatArchiveLabel(item), files, skipped, documentCount: docs.length };
}
