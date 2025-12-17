import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Task yakunlanganda hujjatlarni arxivga ko'chirish
 */
export async function archiveTaskDocuments(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<void> {
  const task = await tx.task.findUnique({
    where: { id: taskId },
    include: {
      client: { select: { name: true } },
      branch: { select: { name: true } },
      documents: true,
    },
  });

  if (!task || task.status !== 'YAKUNLANDI' || task.documents.length === 0) {
    return; // Task yakunlanmagan yoki hujjatlar yo'q
  }

  // Hujjatlarni arxivga ko'chirish
  await Promise.all(
    task.documents.map((doc) =>
      tx.archiveDocument.create({
        data: {
          taskId: task.id,
          taskTitle: task.title,
          clientName: task.client.name,
          branchName: task.branch.name,
          name: doc.name,
          fileUrl: doc.fileUrl,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          description: doc.description,
          uploadedById: doc.uploadedById,
          originalTaskDocumentId: doc.id,
        },
      })
    )
  );
}

