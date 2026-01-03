import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Task yakunlanganda hujjatlarni arxivga ko'chirish
 */
export async function archiveTaskDocuments(
  tx: PrismaClient | Prisma.TransactionClient,
  taskId: number
): Promise<void> {
  // Task ma'lumotlarini olish (raw SQL yordamida)
  const taskResult = await (tx as any).$queryRaw<Array<{
    id: number;
    title: string;
    status: string;
    client_name: string;
    branch_name: string;
  }>>`
    SELECT 
      t.id,
      t.title,
      t.status::text as status,
      c.name as client_name,
      b.name as branch_name
    FROM "Task" t
    LEFT JOIN "Client" c ON t."clientId" = c.id
    LEFT JOIN "Branch" b ON t."branchId" = b.id
    WHERE t.id = ${taskId}
  `;

  if (!taskResult || taskResult.length === 0) {
    return; // Task topilmadi
  }

  const task = taskResult[0];

  if (task.status !== 'YAKUNLANDI') {
    return; // Task yakunlanmagan
  }

  // Check if documents exist before archiving
  const documentCount = await (tx as any).taskDocument.count({
    where: { taskId }
  });

  if (documentCount === 0) {
    throw new Error('Arxivga o\'tishdan oldin kamida bitta hujjat yuklanishi kerak');
  }

  // Hujjatlarni raw SQL yordamida olish (documentType column'ni o'tkazib yuborish)
  const documents = await (tx as any).$queryRaw<Array<{
    id: number;
    name: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    description: string | null;
    uploadedById: number | null;
  }>>`
    SELECT 
      id,
      name,
      "fileUrl" as "fileUrl",
      "fileType" as "fileType",
      "fileSize" as "fileSize",
      description,
      "uploadedById"
    FROM "TaskDocument"
    WHERE "taskId" = ${taskId}
  `;

  if (!documents || documents.length === 0) {
    throw new Error('Hujjatlar topilmadi');
  }

  // Hujjatlarni arxivga ko'chirish
  await Promise.all(
    documents.map((doc: any) =>
      (tx as any).archiveDocument.create({
        data: {
          taskId: task.id,
          taskTitle: task.title,
          clientName: task.client_name,
          branchName: task.branch_name,
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

