import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ValidationService } from '../services/validation.service';
import { DocumentService } from '../services/document.service';
import { AiService } from '../services/ai.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/tasks/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Faqat PDF fayllar qabul qilinadi'));
    }
  },
});

const uploadDocumentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  documentType: z.enum(['INVOICE', 'ST', 'FITO', 'OTHER']).optional(),
});

/**
 * POST /tasks/:id/documents
 * Upload document for a task
 */
router.post(
  '/:id/documents',
  requireAuth(),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Fayl yuklanmadi' });
      }

      // Validate request
      const parsed = uploadDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      // Check user access
      const validationService = new ValidationService(prisma);
      const canAccess = await validationService.canUserAccessTask(
        taskId,
        user.id,
        user.role
      );

      if (!canAccess) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(403).json({ error: 'Bu taskga kirish huquqingiz yo\'q' });
      }

      // Verify task exists
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(404).json({ error: 'Task topilmadi' });
      }

      // Process document
      const documentService = new DocumentService(prisma);

      // Avval documentType ustunining mavjudligini tekshiramiz (transaction'dan oldin)
      let hasDocumentTypeColumn = false;
      try {
        // Test query to check if documentType column exists
        await prisma.$queryRaw`SELECT "documentType" FROM "TaskDocument" LIMIT 1`;
        hasDocumentTypeColumn = true;
      } catch (checkError: any) {
        // Column doesn't exist
        hasDocumentTypeColumn = false;
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create task document record
        const documentData: any = {
          taskId,
          name: parsed.data.name,
          fileUrl: `/uploads/tasks/${req.file!.filename}`,
          fileType: 'pdf',
          fileSize: req.file!.size,
          description: parsed.data.description,
          uploadedById: user.id,
        };
        
        // documentType'ni faqat ustun mavjud bo'lsa qo'shamiz
        // Prisma Client schema'da documentType bor, lekin DB'da yo'q bo'lishi mumkin
        // Agar ustun yo'q bo'lsa, raw SQL ishlatamiz
        let taskDocument: any;
        
        if (hasDocumentTypeColumn) {
          // Ustun mavjud - oddiy Prisma create ishlatamiz
          documentData.documentType = parsed.data.documentType || 'OTHER';
          taskDocument = await tx.taskDocument.create({
            data: documentData,
          });
        } else {
          // Ustun yo'q - raw SQL ishlatamiz
          // Raw SQL bilan insert qilamiz va natijani qaytaramiz
          const insertedRows = await (tx as any).$queryRaw`
            INSERT INTO "TaskDocument" ("taskId", "name", "fileUrl", "fileType", "fileSize", "description", "uploadedById", "createdAt")
            VALUES (${documentData.taskId}, ${documentData.name}, ${documentData.fileUrl}, ${documentData.fileType}, ${documentData.fileSize}, ${documentData.description || null}, ${documentData.uploadedById}, NOW())
            RETURNING id, "taskId", "name", "fileUrl", "fileType", "fileSize", "description", "uploadedById", "createdAt"
          `;
          
          taskDocument = insertedRows[0];
        }

        // Extract text from PDF
        await documentService.processPdfDocument(
          taskDocument.id,
          req.file!.path
        );

        // If document type is INVOICE or ST, structure with AI
        const aiService = new AiService(tx);
        if (
          parsed.data.documentType === 'INVOICE' ||
          parsed.data.documentType === 'ST'
        ) {
          const extractedText = await documentService.getExtractedText(
            taskDocument.id
          );

          if (extractedText) {
            await aiService.processDocument(
              taskDocument.id,
              taskId,
              parsed.data.documentType,
              extractedText
            );
          }
        }

        // If ST is uploaded and Invoice exists, run AI comparison
        let aiCheckResult = null;
        if (parsed.data.documentType === 'ST') {
          try {
            // Check if Invoice exists
            const invoiceDoc = await tx.taskDocument.findFirst({
              where: {
                taskId,
                documentType: 'INVOICE',
              },
              include: {
                metadata: true,
                structuredData: true,
              },
            });

            if (invoiceDoc && invoiceDoc.metadata && invoiceDoc.structuredData) {
              // Get ST metadata and structured data
              const stDoc = await tx.taskDocument.findUnique({
                where: { id: taskDocument.id },
                include: {
                  metadata: true,
                  structuredData: true,
                },
              });

              if (stDoc && stDoc.metadata && stDoc.structuredData) {
                // Run AI comparison
                const comparisonResult = await aiService.compareDocuments(
                  invoiceDoc.metadata.extractedText,
                  invoiceDoc.structuredData.structuredData as any,
                  stDoc.metadata.extractedText,
                  stDoc.structuredData.structuredData as any
                );

                // Determine result: FAIL if any critical errors, otherwise PASS
                const hasCriticalErrors = comparisonResult.some(
                  (f) => f.severity === 'critical'
                );
                const result: 'PASS' | 'FAIL' = hasCriticalErrors ? 'FAIL' : 'PASS';

                // Save AI check result - handle case when table doesn't exist
                try {
                  await tx.aiCheck.create({
                    data: {
                      taskId,
                      checkType: 'INVOICE_ST',
                      result,
                      details: { findings: comparisonResult },
                    },
                  });
                } catch (aiCheckError: any) {
                  // If table doesn't exist, log warning but don't fail
                  const isTableMissing = 
                    aiCheckError?.code === 'P2021' || 
                    aiCheckError?.code === 'P2010' ||
                    aiCheckError?.prismaError?.code === '42P01' ||
                    aiCheckError?.message?.includes('does not exist') ||
                    aiCheckError?.message?.includes('не существует');
                  
                  if (isTableMissing) {
                    console.warn('AiCheck table does not exist, skipping save');
                  } else {
                    // Other error - log but don't fail the upload
                    console.error('Error saving AI check:', aiCheckError);
                  }
                }

                aiCheckResult = {
                  result,
                  findings: comparisonResult,
                };
              }
            }
          } catch (aiError) {
            console.error('AI comparison error:', aiError);
            // Don't fail the upload if AI check fails
          }
        }

        return { taskDocument, aiCheckResult };
      });

      res.json({
        success: true,
        document: {
          id: result.taskDocument.id,
          name: result.taskDocument.name,
          fileUrl: result.taskDocument.fileUrl,
          documentType: (result.taskDocument as any).documentType || null,
        },
        aiCheck: result.aiCheckResult || null,
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      console.error('Error uploading document:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
);

export default router;

