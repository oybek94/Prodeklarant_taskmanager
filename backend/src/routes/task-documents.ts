import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ValidationService } from '../services/validation.service';
import { DocumentService } from '../services/document.service';
import { AiService } from '../services/ai.service';
import { compareInvoiceST1 } from '../ai/document.analyzer';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/tasks/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF and JPG files
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/pjpeg'];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Faqat PDF va JPG fayllar qabul qilinadi'));
    }
  },
});

const uploadDocumentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  documentType: z.enum(['INVOICE', 'ST', 'FITO', 'CMR', 'OTHER']).optional(),
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

      // Avval documentType ustunining mavjudligini tekshiramiz (transaction'dan oldin)
      // Prisma query orqali tekshiramiz - agar documentType mavjud bo'lsa, u ishlaydi
      let hasDocumentTypeColumn = false;
      try {
        // documentType ni tekshirish uchun oddiy query ishlatamiz
        const testDoc = await prisma.taskDocument.findFirst({
          select: { documentType: true },
        });
        // Agar query muvaffaqiyatli bo'lsa, ustun mavjud
        hasDocumentTypeColumn = true;
      } catch (checkError: any) {
        // Agar xatolik bo'lsa (masalan, ustun mavjud emas), fallback ga o'tamiz
        hasDocumentTypeColumn = false;
      }

      // Transaction: Faqat document yaratish va text extraction
      // AI processing transaction'dan tashqarida bajariladi (timeout muammosini oldini olish uchun)
      // PDF processing'ni transaction'dan tashqariga chiqaramiz
      // chunki bu uzoq davom etadigan operatsiya va timeout muammosiga olib keladi
      const result = await prisma.$transaction(
        async (tx) => {
          // Create task document record
          // Fayl turini aniqlash
          const fileExtension = path.extname(req.file!.originalname).toLowerCase();
          const fileType = fileExtension === '.pdf' ? 'pdf' : 
                          (fileExtension === '.jpg' || fileExtension === '.jpeg') ? 'jpg' : 
                          'other';
          
          const documentData: any = {
            taskId,
            name: parsed.data.name,
            fileUrl: `/uploads/tasks/${req.file!.filename}`,
            fileType: fileType,
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

          return { taskDocument };
        },
        {
          // Transaction timeout'ni oshiramiz (60 soniya)
          // PDF processing transaction'dan tashqarida bo'ladi
          timeout: 60000,
        }
      );

      // PDF va JPG processing'ni transaction'dan keyin bajaramiz
      // Bu timeout muammosini hal qiladi
      const fileExtension = path.extname(req.file!.originalname).toLowerCase();
      const documentService = new DocumentService(prisma);
      
      if (fileExtension === '.pdf') {
        await documentService.processPdfDocument(
          result.taskDocument.id,
          req.file!.path
        );
      } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
        await documentService.processImageDocument(
          result.taskDocument.id,
          req.file!.path
        );
      }

      // AI processing transaction'dan keyin bajariladi (background'da)
      // Bu timeout muammosini oldini oladi
      // AI tekshiruv PDF va JPG fayllar uchun ishlaydi
      let aiCheckResult = null;
      if ((parsed.data.documentType === 'INVOICE' || parsed.data.documentType === 'ST') && 
          (fileExtension === '.pdf' || fileExtension === '.jpg' || fileExtension === '.jpeg')) {
        try {
          // AI processing'ni async bajarish (response'ni kutmasdan)
          // Bu foydalanuvchiga tezroq javob qaytarish imkonini beradi
          (async () => {
            try {
              const documentService = new DocumentService(prisma);
              const aiService = new AiService(prisma);

              const extractedText = await documentService.getExtractedText(
                result.taskDocument.id
              );

              if (extractedText) {
                await aiService.processDocument(
                  result.taskDocument.id,
                  taskId,
                  parsed.data.documentType!,
                  extractedText
                );

                // If ST is uploaded and Invoice exists, run AI comparison
                if (parsed.data.documentType === 'ST') {
                  try {
                    // Check if Invoice exists
                    const invoiceDoc = await prisma.taskDocument.findFirst({
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
                      const stDoc = await prisma.taskDocument.findUnique({
                        where: { id: result.taskDocument.id },
                        include: {
                          metadata: true,
                          structuredData: true,
                        },
                      });

                      if (stDoc && stDoc.metadata && stDoc.structuredData) {
                        // Parse structured data if it's a JSON string
                        let invoiceStructured = invoiceDoc.structuredData.structuredData;
                        if (typeof invoiceStructured === 'string') {
                          try {
                            invoiceStructured = JSON.parse(invoiceStructured);
                          } catch (e) {
                            console.error('Error parsing invoice structured data:', e);
                            invoiceStructured = null;
                          }
                        }

                        let stStructured = stDoc.structuredData.structuredData;
                        if (typeof stStructured === 'string') {
                          try {
                            stStructured = JSON.parse(stStructured);
                          } catch (e) {
                            console.error('Error parsing ST structured data:', e);
                            stStructured = null;
                          }
                        }

                        // Run AI comparison (two-stage architecture: extraction + rule engine)
                        console.log('[AI Check] Starting comparison for task:', taskId);
                        const comparisonResult = await compareInvoiceST1(
                          invoiceDoc.metadata.extractedText,
                          invoiceStructured as any,
                          stDoc.metadata.extractedText,
                          stStructured as any
                        );

                        console.log('[AI Check] Comparison result:', {
                          status: comparisonResult.status,
                          errorsCount: comparisonResult.errors.length,
                          errors: comparisonResult.errors,
                        });

                        // Determine result: FAIL if status is XATO, otherwise PASS
                        const result: 'PASS' | 'FAIL' = (comparisonResult.status === 'XATO') ? 'FAIL' : 'PASS';

                        console.log('[AI Check] Saving to database:', {
                          taskId,
                          checkType: 'INVOICE_ST',
                          result,
                          details: comparisonResult,
                        });

                        // Save AI check result - handle case when table doesn't exist
                        try {
                          const savedCheck = await prisma.aiCheck.create({
                            data: {
                              taskId,
                              checkType: 'INVOICE_ST',
                              result,
                              details: comparisonResult as any, // Save new format: {status, errors}
                            },
                          });
                          console.log('[AI Check] Successfully saved:', savedCheck.id);
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
                      }
                    }
                  } catch (aiError) {
                    console.error('AI comparison error:', aiError);
                    // Don't fail the upload if AI check fails
                  }
                }
              }
            } catch (aiProcessingError) {
              console.error('AI processing error (background):', aiProcessingError);
              // Don't fail the upload if AI processing fails
            }
          })();
        } catch (aiError) {
          console.error('Error starting AI processing:', aiError);
          // Don't fail the upload if AI processing fails to start
        }
      }

      res.json({
        success: true,
        document: {
          id: result.taskDocument.id,
          name: result.taskDocument.name,
          fileUrl: result.taskDocument.fileUrl,
          documentType: (result.taskDocument as any).documentType || null,
        },
        // AI processing background'da bajarilmoqda
        // Natijalarni ko'rish uchun /tasks/:id/ai-checks endpoint'ini chaqiring
        aiCheck: null,
        message: parsed.data.documentType === 'INVOICE' || parsed.data.documentType === 'ST'
          ? 'Hujjat yuklandi. AI analizi background\'da bajarilmoqda. Natijalarni bir necha soniyadan keyin yangilash tugmasini bosing.'
          : undefined,
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

/**
 * GET /tasks/:taskId/documents/:documentId/extracted-text
 * Get extracted text (OCR result) for a document
 */
router.get(
  '/:taskId/documents/:documentId/extracted-text',
  requireAuth(),
  async (req: AuthRequest, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const taskId = parseInt(req.params.taskId);

      // Verify document belongs to task
      const document = await prisma.taskDocument.findFirst({
        where: { id: documentId, taskId },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Get metadata
      const metadata = await prisma.documentMetadata.findUnique({
        where: { taskDocumentId: documentId },
      });

      if (!metadata || !metadata.extractedText) {
        return res.json({ extractedText: '', pageCount: 0 });
      }

      res.json({
        extractedText: metadata.extractedText,
        pageCount: metadata.pageCount || 0,
      });
    } catch (error) {
      console.error('Error fetching extracted text:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

