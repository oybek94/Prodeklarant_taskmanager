import { prisma } from '../prisma';
import { removeUnreferencedUploads } from './uploaded-file-cleanup';

export class DocumentDeleteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface DocumentDeleteActor {
  id: number;
  role: string;
}

export type DocumentSource = 'task' | 'archive';

/** Admin bo'lmagan xodim o'zi yuklagan hujjatni shu muddat ichida o'chira oladi. */
const OWNER_DELETE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

function assertCanDelete(uploadedById: number, uploadedAt: Date, actor: DocumentDeleteActor, now: Date): void {
  if (actor.role === 'ADMIN') return;
  if (uploadedById !== actor.id) throw new DocumentDeleteError(403, 'Ruxsat yo\'q');
  if (now.getTime() - uploadedAt.getTime() > OWNER_DELETE_WINDOW_MS) {
    throw new DocumentDeleteError(403, 'Hujjatni 2 kundan keyin o\'chirish mumkin emas');
  }
}

/**
 * Hujjatni o'chirish — DELETE /documents/:id.
 *
 * TaskDocument va ArchiveDocument alohida jadvallar, ID lari bir-biriga bog'liq emas.
 * Avval vazifa hujjati topilmasa shu ID li ARXIV hujjati o'chirilar edi — ya'ni butunlay
 * boshqa hujjat. Endi qaysi jadval ekani aniq ko'rsatiladi (`source`), standart — vazifa hujjati.
 *
 * @returns o'chirilgan hujjatning vazifa ID si (socket xabari uchun)
 */
export async function deleteDocument(
  id: number,
  actor: DocumentDeleteActor,
  source: DocumentSource = 'task',
  now: Date = new Date()
): Promise<{ taskId: number }> {
  if (source === 'archive') {
    const doc = await prisma.archiveDocument.findUnique({
      where: { id },
      select: { taskId: true, fileUrl: true, uploadedById: true, archivedAt: true },
    });
    if (!doc) throw new DocumentDeleteError(404, 'Hujjat topilmadi');
    assertCanDelete(doc.uploadedById, doc.archivedAt, actor, now);

    await prisma.archiveDocument.delete({ where: { id } });
    await removeUnreferencedUploads([doc.fileUrl]);
    return { taskId: doc.taskId };
  }

  const doc = await prisma.taskDocument.findUnique({
    where: { id },
    select: { taskId: true, fileUrl: true, uploadedById: true, createdAt: true },
  });
  if (!doc) throw new DocumentDeleteError(404, 'Hujjat topilmadi');
  assertCanDelete(doc.uploadedById, doc.createdAt, actor, now);

  // DocumentMetadata / StructuredDocument — onDelete: Cascade, AiCheck.taskDocumentId — SetNull
  await prisma.taskDocument.delete({ where: { id } });
  await removeUnreferencedUploads([doc.fileUrl]);
  return { taskId: doc.taskId };
}
