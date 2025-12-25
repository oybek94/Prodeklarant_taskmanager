import express from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

const router = express.Router();

// Uploads papkasini yaratish
const uploadsDir = path.join(__dirname, '../../uploads');
const documentsDir = path.join(uploadsDir, 'documents');
const archiveDir = path.join(uploadsDir, 'archive');

[documentsDir, archiveDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer konfiguratsiyasi
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    let name = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '_') // Kirill va lotin harflarini saqlaydi
      .replace(/_+/g, '_') // Bir nechta underscore'ni bittaga qisqartiradi
      .replace(/^_+|_+$/g, ''); // Boshida va oxirida underscore'larni olib tashlaydi
    
    // Agar name bo'sh bo'lsa yoki faqat underscore'lardan iborat bo'lsa
    if (!name || name.length === 0) {
      name = 'file';
    }
    
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Task hujjatlarini olish
router.get('/task/:taskId', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    // documentType field hali migration qo'llanmagan bo'lishi mumkin, shuning uchun select qilamiz
    const documents = await prisma.taskDocument.findMany({
      where: { taskId },
      select: {
        id: true,
        taskId: true,
        name: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        description: true,
        uploadedById: true,
        createdAt: true,
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // documentType faqat mavjud bo'lsa qo'shiladi
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // documentType'ni alohida qo'shamiz (agar mavjud bo'lsa)
    const documentsWithType = documents.map((doc: any) => ({
      ...doc,
      documentType: (doc as any).documentType || null,
    }));

    res.json(documents);
  } catch (error) {
    console.error('Error fetching task documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Task hujjatini yuklash (bir nechta fayl)
router.post('/task/:taskId', requireAuth(), upload.array('files', 10), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'Fayl yuborilmadi' });
    }

    const files = req.files as Express.Multer.File[];
    const names = req.body.names && req.body.names !== '[]' ? JSON.parse(req.body.names) : [];
    const descriptions = req.body.descriptions && req.body.descriptions !== '[]' ? JSON.parse(req.body.descriptions) : [];

    // Task mavjudligini tekshirish
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        client: { select: { name: true } },
        branch: { select: { name: true } },
      },
    });

    if (!task) {
      // Fayllarni o'chirish
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(404).json({ error: 'Task topilmadi' });
    }

    const documents: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileUrl = `/uploads/documents/${file.filename}`;
      const fileType = file.mimetype || path.extname(file.originalname).slice(1);
      const name = names[i] || file.originalname;
      const description = descriptions[i] || null;

      let document;
      
      // Agar task yakunlangan bo'lsa, arxivga qo'shamiz
      if (task.status === 'YAKUNLANDI') {
        document = await prisma.archiveDocument.create({
          data: {
            taskId: task.id,
            taskTitle: task.title,
            clientName: task.client.name,
            branchName: task.branch.name,
            name,
            fileUrl,
            fileType,
            fileSize: file.size,
            description,
            uploadedById: req.user!.id,
          },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      } else {
        document = await prisma.taskDocument.create({
          data: {
            taskId,
            name,
            fileUrl,
            fileType,
            fileSize: file.size,
            description,
            uploadedById: req.user!.id,
          },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      }

      documents.push(document);
    }

    res.json(documents);
  } catch (error) {
    console.error('Error uploading documents:', error);
    if (req.files) {
      (req.files as Express.Multer.File[]).forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Arxiv task'iga hujjat qo'shish
router.post('/archive/task/:taskId', requireAuth('ADMIN'), upload.array('files', 10), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'Fayl yuborilmadi' });
    }

    const files = req.files as Express.Multer.File[];
    const names = req.body.names && req.body.names !== '[]' ? JSON.parse(req.body.names) : [];
    const descriptions = req.body.descriptions && req.body.descriptions !== '[]' ? JSON.parse(req.body.descriptions) : [];

    // Task mavjudligini tekshirish
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        client: { select: { name: true } },
        branch: { select: { name: true } },
      },
    });

    if (!task) {
      // Fayllarni o'chirish
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(404).json({ error: 'Task topilmadi' });
    }

    const documents: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileUrl = `/uploads/documents/${file.filename}`;
      const fileType = file.mimetype || path.extname(file.originalname).slice(1);
      const name = names[i] || file.originalname;
      const description = descriptions[i] || null;

      const document = await prisma.archiveDocument.create({
        data: {
          taskId: task.id,
          taskTitle: task.title,
          clientName: task.client.name,
          branchName: task.branch.name,
          name,
          fileUrl,
          fileType,
          fileSize: file.size,
          description,
          uploadedById: req.user!.id,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      documents.push(document);
    }

    res.json(documents);
  } catch (error) {
    console.error('Error uploading archive documents:', error);
    if (req.files) {
      (req.files as Express.Multer.File[]).forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Task hujjatini o'chirish
router.delete('/:id', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[DELETE /documents/${id}] Starting deletion process`);

    // Avval TaskDocument'da qidiramiz
    let document: any = null;
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:318',message:'Before TaskDocument.findUnique',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // Use raw SQL query to avoid documentType and updatedAt column issues
      // Only select columns that definitely exist in the database
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:324',message:'Before raw SQL query',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const queryStartTime = Date.now();
      const result = await prisma.$queryRaw<Array<{id: number, taskId: number, name: string, fileUrl: string, fileType: string, fileSize: number | null, description: string | null, uploadedById: number, createdAt: Date}>>`
        SELECT id, "taskId", name, "fileUrl", "fileType", "fileSize", description, "uploadedById", "createdAt"
        FROM "TaskDocument"
        WHERE id = ${id}
        LIMIT 1
      `;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:332',message:'After raw SQL query',data:{id,queryDuration:Date.now()-queryStartTime,resultCount:result?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      document = result[0] || null;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:328',message:'After TaskDocument.findUnique (raw SQL)',data:{id,found:!!document,documentId:document?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    } catch (findError: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:331',message:'Error finding TaskDocument',data:{id,error:findError?.message,errorCode:findError?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error(`[DELETE /documents/${id}] Error finding TaskDocument:`, findError);
      // Continue to check ArchiveDocument
    }

    let isArchive = false;

    // Agar TaskDocument'da topilmasa, ArchiveDocument'da qidiramiz
    if (!document) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:335',message:'Document not in TaskDocument, checking ArchiveDocument',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      try {
        document = await prisma.archiveDocument.findUnique({
          where: { id },
        }) as any;
        isArchive = true;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:340',message:'Found in ArchiveDocument',data:{id,found:!!document},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      } catch (archiveError: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:343',message:'Error finding ArchiveDocument',data:{id,error:archiveError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.error(`[DELETE /documents/${id}] Error finding ArchiveDocument:`, archiveError);
      }
    }

    if (!document) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:350',message:'Document not found - returning 404',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log(`[DELETE /documents/${id}] Document not found`);
      return res.status(404).json({ error: 'Hujjat topilmadi' });
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:356',message:'Document found, checking permissions',data:{id,isArchive,uploadedById:document.uploadedById,userId:req.user?.id,userRole:req.user?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log(`[DELETE /documents/${id}] Document found, isArchive: ${isArchive}`);

    // Faqat yuklagan odam yoki admin o'chira oladi
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:378',message:'Checking permissions',data:{id,uploadedById:document.uploadedById,userId:req.user?.id,userRole:req.user?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (document.uploadedById !== req.user!.id && req.user!.role !== 'ADMIN') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:380',message:'Access denied - returning 403',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log(`[DELETE /documents/${id}] Access denied - not owner and not admin`);
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }

    // Admin'dan boshqa foydalanuvchilar 2 kundan keyin o'chira oladi
    if (req.user!.role !== 'ADMIN' && document.uploadedById === req.user!.id) {
      const uploadTime = new Date(document.createdAt || (document as any).archivedAt);
      const now = new Date();
      const diffInMs = now.getTime() - uploadTime.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:391',message:'Checking 2-day rule',data:{id,diffInDays,createdAt:document.createdAt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (diffInDays < 2) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:394',message:'Too soon to delete - returning 403',data:{id,diffInDays},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.log(`[DELETE /documents/${id}] Too soon to delete (${diffInDays.toFixed(2)} days)`);
        return res.status(403).json({ 
          error: 'Hujjatni 2 kundan keyin o\'chirish mumkin' 
        });
      }
    }

    // Faylni o'chirish
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:402',message:'Starting file deletion',data:{id,fileUrl:document.fileUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (document.fileUrl) {
      const filePath = path.join(__dirname, '../../', document.fileUrl);
      console.log(`[DELETE /documents/${id}] Attempting to delete file: ${filePath}`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`[DELETE /documents/${id}] File deleted successfully`);
        } catch (fileError) {
          console.warn(`[DELETE /documents/${id}] Error deleting file from filesystem:`, fileError);
          // Continue even if file deletion fails
        }
      } else {
        console.log(`[DELETE /documents/${id}] File not found at path: ${filePath}`);
      }
    }

    if (isArchive) {
      console.log(`[DELETE /documents/${id}] Deleting ArchiveDocument`);
      await prisma.archiveDocument.delete({
        where: { id },
      });
      console.log(`[DELETE /documents/${id}] ArchiveDocument deleted successfully`);
    } else {
      console.log(`[DELETE /documents/${id}] Deleting TaskDocument and related records`);
      
      // TaskDocument'ni o'chirishdan oldin, bog'liq jadvallarni o'chirish
      // (Cascade delete ishlamasa, manual o'chirish)
      
      // DocumentMetadata'ni o'chirish (agar mavjud bo'lsa)
      // Prisma client'da model mavjudligini tekshirish
      if ('documentMetadata' in prisma && typeof (prisma as any).documentMetadata !== 'undefined') {
        try {
          const metaResult = await (prisma as any).documentMetadata.deleteMany({
            where: { taskDocumentId: id },
          });
          console.log(`[DELETE /documents/${id}] Deleted ${metaResult.count} DocumentMetadata records`);
        } catch (metaError: any) {
          // Agar jadval mavjud bo'lmasa, e'tiborsiz qoldirish
          const isTableMissing = 
            metaError?.code === 'P2021' || 
            metaError?.code === 'P2010' ||
            metaError?.code === 'P2003' ||
            metaError?.message?.includes('does not exist') ||
            metaError?.message?.includes('не существует') ||
            metaError?.message?.includes('Unknown arg') ||
            metaError?.message?.includes('Unknown model');
          
          if (isTableMissing) {
            console.log(`[DELETE /documents/${id}] DocumentMetadata table/model does not exist, skipping`);
          } else {
            console.warn(`[DELETE /documents/${id}] Error deleting DocumentMetadata:`, metaError);
          }
        }
      } else {
        console.log(`[DELETE /documents/${id}] DocumentMetadata model not available in Prisma client, skipping`);
      }

      // StructuredDocument'ni o'chirish (agar mavjud bo'lsa)
      // Prisma client'da model mavjudligini tekshirish
      if ('structuredDocument' in prisma && typeof (prisma as any).structuredDocument !== 'undefined') {
        try {
          const structResult = await (prisma as any).structuredDocument.deleteMany({
            where: { taskDocumentId: id },
          });
          console.log(`[DELETE /documents/${id}] Deleted ${structResult.count} StructuredDocument records`);
        } catch (structError: any) {
          // Agar jadval mavjud bo'lmasa, e'tiborsiz qoldirish
          const isTableMissing = 
            structError?.code === 'P2021' || 
            structError?.code === 'P2010' ||
            structError?.code === 'P2003' ||
            structError?.message?.includes('does not exist') ||
            structError?.message?.includes('не существует') ||
            structError?.message?.includes('Unknown arg') ||
            structError?.message?.includes('Unknown model');
          
          if (isTableMissing) {
            console.log(`[DELETE /documents/${id}] StructuredDocument table/model does not exist, skipping`);
          } else {
            console.warn(`[DELETE /documents/${id}] Error deleting StructuredDocument:`, structError);
          }
        }
      } else {
        console.log(`[DELETE /documents/${id}] StructuredDocument model not available in Prisma client, skipping`);
      }

      // TaskDocument'ni o'chirish
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:490',message:'Before TaskDocument.delete',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      try {
        await prisma.taskDocument.delete({
          where: { id },
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:495',message:'TaskDocument deleted successfully',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.log(`[DELETE /documents/${id}] TaskDocument deleted successfully`);
      } catch (deleteError: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:499',message:'Error deleting TaskDocument',data:{id,error:deleteError?.message,errorCode:deleteError?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.error(`[DELETE /documents/${id}] Error deleting TaskDocument:`, deleteError);
        throw deleteError;
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:505',message:'Deletion completed successfully - sending response',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log(`[DELETE /documents/${id}] Deletion completed successfully`);
    res.json({ success: true });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4d4c60ed-1c42-42d6-b52a-9c81b1a324e2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'documents.ts:535',message:'Error caught in DELETE handler',data:{id:req.params.id,errorMessage:error instanceof Error?error.message:String(error),errorName:error instanceof Error?error.name:'Unknown',hasResponse:!res.headersSent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error(`[DELETE /documents/${req.params.id}] Error deleting document:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[DELETE /documents/${req.params.id}] Error stack:`, errorStack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
});

// Arxiv task'ining hujjatlarini olish (barcha foydalanuvchilar uchun)
router.get('/archive/task/:taskId', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    const documents = await prisma.archiveDocument.findMany({
      where: { taskId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { archivedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching archive task documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Arxiv hujjatlarini olish
router.get('/archive', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { taskId, clientName, branchName, search } = req.query;

    const where: any = {};
    
    if (taskId) {
      where.taskId = parseInt(taskId as string);
    }
    if (clientName) {
      where.clientName = { contains: clientName as string, mode: 'insensitive' };
    }
    if (branchName) {
      where.branchName = { contains: branchName as string, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { taskTitle: { contains: search as string, mode: 'insensitive' } },
        { clientName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const documents = await prisma.archiveDocument.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { archivedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching archive documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Task yakunlanganda hujjatlarni arxivga ko'chirish
router.post('/archive-task/:taskId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.taskId);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        client: { select: { name: true } },
        branch: { select: { name: true } },
        documents: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task topilmadi' });
    }

    if (task.status !== 'YAKUNLANDI') {
      return res.status(400).json({ error: 'Task yakunlanmagan' });
    }

    // Hujjatlarni arxivga ko'chirish
    const archivedDocuments = await prisma.$transaction(
      task.documents.map((doc: any) =>
        prisma.archiveDocument.create({
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

    res.json({ 
      success: true, 
      archivedCount: archivedDocuments.length,
      documents: archivedDocuments,
    });
  } catch (error) {
    console.error('Error archiving task documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Task'ning barcha hujjatlarini ZIP qilib yuklab olish
router.get('/task/:taskId/download-all', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.taskId);

    // Task ma'lumotlarini olish
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        client: { select: { name: true } },
        branch: { select: { name: true } },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task topilmadi' });
    }

    // Hujjatlarni olish
    let documents;
    if (task.status === 'YAKUNLANDI') {
      documents = await prisma.archiveDocument.findMany({
        where: { taskId },
      });
    } else {
      documents = await prisma.taskDocument.findMany({
        where: { taskId },
      });
    }

    if (documents.length === 0) {
      return res.status(404).json({ error: 'Hujjatlar topilmadi' });
    }

    // Task nomini tozalash (maxsus belgilarni olib tashlash)
    const cleanTaskTitle = task.title
      .replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'task';

    const zipFileName = `${cleanTaskTitle}.zip`;

    // ZIP fayl yaratish
    res.attachment(zipFileName);
    res.contentType('application/zip');

    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maksimal siqish
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'ZIP yaratishda xatolik' });
      }
    });

    archive.pipe(res);

    // Har bir hujjatni ZIP'ga qo'shish
    for (const doc of documents) {
      const filePath = path.join(__dirname, '../../', doc.fileUrl);
      
      if (fs.existsSync(filePath)) {
        // Fayl nomini tozalash
        const cleanFileName = doc.name
          .replace(/[^a-zA-Z0-9\u0400-\u04FF\s.-]/g, '_')
          .replace(/\s+/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '') || 'file';

        const ext = path.extname(doc.name) || path.extname(filePath);
        const finalFileName = `${cleanFileName}${ext}`;

        archive.file(filePath, { name: finalFileName });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error creating ZIP:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;

