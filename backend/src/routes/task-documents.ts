import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ValidationService } from '../services/validation.service';
import { DocumentService } from '../services/document.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';

const router = Router();

// Uploads papkasi uchun absolute path
const uploadsDir = path.join(__dirname, '../../uploads');
const documentsDir = path.join(uploadsDir, 'documents');

// Papkalarni yaratish (mavjud bo'lmasa)
[documentsDir].forEach(dir => {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
});

// Helper function to decode multer's latin1 strings to utf8
const decodeText = (text: string) => {
  if (!text) return text;
  try {
    return Buffer.from(text, 'latin1').toString('utf8');
  } catch {
    return text;
  }
};

// Configure multer for file uploads - documents papkasiga saqlaymiz
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalNameDecoded = decodeText(file.originalname);
    const ext = path.extname(originalNameDecoded);
    let name = path.basename(originalNameDecoded, ext)
      .replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!name || name.length === 0) {
      name = 'file';
    }
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF and JPG files
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/pjpeg'];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg'];
    const originalNameDecoded = decodeText(file.originalname);
    const fileExtension = path.extname(originalNameDecoded).toLowerCase();
    
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
  documentType: z.enum(['INVOICE', 'ST', 'FITO', 'CMR', 'TIR', 'OTHER']).optional(),
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
      const bodyToParse = { ...req.body };
      // Field value'lari doim UTF-8 da keladi, shuning uchun decodeText kerak emas
      // if (bodyToParse.name) bodyToParse.name = decodeText(bodyToParse.name);
      // if (bodyToParse.description) bodyToParse.description = decodeText(bodyToParse.description);
      
      const parsed = uploadDocumentSchema.safeParse(bodyToParse);
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
          const originalNameDecoded = decodeText(req.file!.originalname);
          const fileExtension = path.extname(originalNameDecoded).toLowerCase();
          const fileType = fileExtension === '.pdf' ? 'pdf' : 
                          (fileExtension === '.jpg' || fileExtension === '.jpeg') ? 'jpg' : 
                          'other';
          
          // Pochtaga yuborishda yuklangan fayl nomi saqlansin: asl fayl nomi (originalname) ni saqlaymiz
          const originalFileName = (originalNameDecoded || '').trim() || parsed.data.name || 'document';
          const documentData: any = {
            taskId,
            name: originalFileName,
            fileUrl: `/uploads/documents/${req.file!.filename}`,
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
      const originalNameDecoded = decodeText(req.file!.originalname);
      const fileExtension = path.extname(originalNameDecoded).toLowerCase();
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

      const { socketEmitter } = require('../services/socketEmitter');
      socketEmitter.broadcast('taskDocument:created', { taskId: taskId });

      res.json({
        success: true,
        document: {
          id: result.taskDocument.id,
          name: result.taskDocument.name,
          fileUrl: result.taskDocument.fileUrl,
          documentType: (result.taskDocument as any).documentType || null,
        },
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

