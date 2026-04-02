import express from 'express';
import path from 'path';
import { requireAuth } from '../middleware/auth';
import { uploadImage, uploadVideo, uploadAudio, uploadDocument, uploadDocuments } from '../middleware/upload';

const router = express.Router();

// Rasm yuklash
router.post('/image', requireAuth('ADMIN'), (req, res) => {
  uploadImage(req, res, (err) => {
    if (err) {
      console.error('Image upload error:', err);
      return res.status(400).json({ 
        error: err.message || 'Rasm yuklashda xatolik yuz berdi' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Rasm fayli yuborilmadi' });
    }

    const fileUrl = `/uploads/images/${req.file.filename}`;
    res.json({
      success: true,
      fileUrl: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

// Video yuklash
router.post('/video', requireAuth('ADMIN'), (req, res) => {
  uploadVideo(req, res, (err) => {
    if (err) {
      console.error('Video upload error:', err);
      return res.status(400).json({ 
        error: err.message || 'Video yuklashda xatolik yuz berdi' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Video fayli yuborilmadi' });
    }

    const fileUrl = `/uploads/videos/${req.file.filename}`;
    res.json({
      success: true,
      fileUrl: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

// Audio yuklash
router.post('/audio', requireAuth('ADMIN'), (req, res) => {
  uploadAudio(req, res, (err) => {
    if (err) {
      console.error('Audio upload error:', err);
      return res.status(400).json({ 
        error: err.message || 'Audio yuklashda xatolik yuz berdi' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Audio fayli yuborilmadi' });
    }

    const fileUrl = `/uploads/audios/${req.file.filename}`;
    res.json({
      success: true,
      fileUrl: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

// Document yuklash
router.post('/document', requireAuth('ADMIN', 'MANAGER'), (req, res) => {
  uploadDocument(req, res, (err) => {
    if (err) {
      console.error('Document upload error:', err);
      return res.status(400).json({ 
        error: err.message || 'Document yuklashda xatolik yuz berdi' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Document fayli yuborilmadi' });
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;
    res.json({
      success: true,
      fileUrl: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

// Ko'p document yuklash
router.post('/documents', requireAuth('ADMIN', 'MANAGER'), (req, res) => {
  uploadDocuments(req, res, (err) => {
    if (err) {
      console.error('Documents upload error:', err);
      return res.status(400).json({ 
        error: err.message || 'Hujjatlarni yuklashda xatolik yuz berdi' 
      });
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'Hujjatlar yuborilmadi' });
    }

    const files = req.files.map(file => ({
      fileUrl: `/uploads/documents/${file.filename}`,
      name: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      success: true,
      files
    });
  });
});

export default router;
