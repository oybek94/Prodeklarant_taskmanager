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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:44',message:'POST /:id/documents entry',data:{taskId:req.params.id,hasFile:!!req.file,bodyKeys:Object.keys(req.body)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      const taskId = parseInt(req.params.id);
      const user = req.user;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:47',message:'After parsing taskId',data:{taskId,hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Fayl yuklanmadi' });
      }

      // Validate request
      const parsed = uploadDocumentSchema.safeParse(req.body);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:59',message:'After schema validation',data:{success:parsed.success,parsedData:parsed.success?parsed.data:null,errors:parsed.success?null:parsed.error.flatten()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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
      const aiService = new AiService(prisma);

      // Avval documentType ustunining mavjudligini tekshiramiz (transaction'dan oldin)
      let hasDocumentTypeColumn = false;
      try {
        // Test query to check if documentType column exists
        await prisma.$queryRaw`SELECT "documentType" FROM "TaskDocument" LIMIT 1`;
        hasDocumentTypeColumn = true;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:100',message:'documentType column exists',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      } catch (checkError: any) {
        // Column doesn't exist
        hasDocumentTypeColumn = false;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:107',message:'documentType column does not exist',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:111',message:'Before transaction',data:{taskId,fileName:req.file!.filename,fileSize:req.file!.size,documentType:parsed.data.documentType,hasDocumentTypeColumn},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      const result = await prisma.$transaction(async (tx) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:95',message:'Before taskDocument.create',data:{taskId,name:parsed.data.name,documentType:parsed.data.documentType||'OTHER'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:142',message:'TaskDocument created with Prisma (has documentType)',data:{taskDocumentId:taskDocument.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        } else {
          // Ustun yo'q - raw SQL ishlatamiz
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:150',message:'Using raw SQL insert (no documentType column)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          // Raw SQL bilan insert qilamiz va natijani qaytaramiz
          const insertedRows = await (tx as any).$queryRaw`
            INSERT INTO "TaskDocument" ("taskId", "name", "fileUrl", "fileType", "fileSize", "description", "uploadedById", "createdAt")
            VALUES (${documentData.taskId}, ${documentData.name}, ${documentData.fileUrl}, ${documentData.fileType}, ${documentData.fileSize}, ${documentData.description || null}, ${documentData.uploadedById}, NOW())
            RETURNING id, "taskId", "name", "fileUrl", "fileType", "fileSize", "description", "uploadedById", "createdAt"
          `;
          
          taskDocument = insertedRows[0];
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:162',message:'TaskDocument created with raw SQL',data:{taskDocumentId:taskDocument.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
        }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:130',message:'TaskDocument created successfully',data:{taskDocumentId:taskDocument.id,hasDocumentType:hasDocumentTypeColumn},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        // Extract text from PDF
        await documentService.processPdfDocument(
          taskDocument.id,
          req.file!.path
        );

        // If document type is INVOICE or ST, structure with AI
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

        return taskDocument;
      });

      res.json({
        success: true,
        document: {
          id: result.id,
          name: result.name,
          fileUrl: result.fileUrl,
          documentType: (result as any).documentType || null,
        },
      });
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'task-documents.ts:144',message:'Error in POST /:id/documents',data:{errorMessage:error instanceof Error?error.message:String(error),errorName:error instanceof Error?error.name:'Unknown',errorCode:(error as any)?.code,prismaError:(error as any)?.meta,errorStack:error instanceof Error?error.stack:'No stack'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
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

