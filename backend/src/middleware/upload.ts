import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Uploads papkasini yaratish
const uploadsDir = path.join(__dirname, '../../uploads');
const imagesDir = path.join(uploadsDir, 'images');
const videosDir = path.join(uploadsDir, 'videos');
const audiosDir = path.join(uploadsDir, 'audios');

[uploadsDir, imagesDir, videosDir, audiosDir].forEach(dir => {
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
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Unique filename: timestamp + random + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes: { [key: string]: string[] } = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']
  };

  const fieldName = file.fieldname as 'image' | 'video' | 'audio';
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

