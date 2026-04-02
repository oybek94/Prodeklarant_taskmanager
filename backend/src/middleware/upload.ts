import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Uploads papkasini yaratish
const uploadsDir = path.join(__dirname, '../../uploads');
const imagesDir = path.join(uploadsDir, 'images');
const videosDir = path.join(uploadsDir, 'videos');
const audiosDir = path.join(uploadsDir, 'audios');
const documentsDir = path.join(uploadsDir, 'documents');

[uploadsDir, imagesDir, videosDir, audiosDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage konfiguratsiyasi
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;
    
    if (file.fieldname === 'image') {
      uploadPath = imagesDir;
    } else if (file.fieldname === 'video') {
      uploadPath = videosDir;
    } else if (file.fieldname === 'audio') {
      uploadPath = audiosDir;
    } else if (file.fieldname === 'document' || file.fieldname === 'documents') {
      uploadPath = documentsDir;
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Multer uses latin1 by default for header parsing which corrupts utf-8 cyrillic characters.
    // We convert it back to utf8 here.
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    // Allow Alphanumeric and Cyrillic characters, plus spaces and hyphens
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s_\-]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes: { [key: string]: string[] } = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'],
    document: [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ],
    documents: [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ]
  };

  const fieldName = file.fieldname as 'image' | 'video' | 'audio' | 'document' | 'documents';
  const allowedTypes = allowedMimes[fieldName] || [];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Fayl formati qo'llab-quvvatlanmaydi. Ruxsat etilgan formatlar: ${allowedTypes.join(', ')}`));
  }
};

// Upload middleware
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Alohida upload middleware'lar
export const uploadImage = upload.single('image');
export const uploadVideo = upload.single('video');
export const uploadAudio = upload.single('audio');
export const uploadDocument = upload.single('document');
export const uploadDocuments = upload.array('documents', 10);

