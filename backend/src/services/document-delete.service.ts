import { prisma } from '../prisma';
import { removeUnreferencedUploads } from './uploaded-file-cleanup';

export class DocumentDeleteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type DocumentSource = 'task' | 'archive';

/**
 * Har qanday tizimga kirgan xodim (kim yuklaganidan va qancha vaqt o'tganidan qat'i nazar)
 * hujjatni o'chira oladi — "faqat yuklagan odam, 2 kun ichida" qoidasi ish tezligini tushirardi.
 * Mijoz portali tokenlari bu yo'lga umuman kira olmaydi (auth middleware /portal/ dan tashqarini rad etadi).
 */

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
  source: DocumentSource = 'task'
): Promise<{ taskId: number }> {
  if (source === 'archive') {
    const doc = await prisma.archiveDocument.findUnique({
      where: { id },
      select: { taskId: true, fileUrl: true },
    });
    if (!doc) throw new DocumentDeleteError(404, 'Hujjat topilmadi');

    await prisma.archiveDocument.delete({ where: { id } });
    await removeUnreferencedUploads([doc.fileUrl]);
    return { taskId: doc.taskId };
  }

  const doc = await prisma.taskDocument.findUnique({
    where: { id },
    select: { taskId: true, fileUrl: true },
  });
  if (!doc) throw new DocumentDeleteError(404, 'Hujjat topilmadi');

  // DocumentMetadata / StructuredDocument — onDelete: Cascade, AiCheck.taskDocumentId — SetNull
  await prisma.taskDocument.delete({ where: { id } });
  await removeUnreferencedUploads([doc.fileUrl]);
  return { taskId: doc.taskId };
}
