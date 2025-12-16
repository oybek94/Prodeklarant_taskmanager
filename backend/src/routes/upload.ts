import express from 'express';
import path from 'path';
import { requireAuth } from '../middleware/auth';
import { uploadImage, uploadVideo, uploadAudio } from '../middleware/upload';

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

export default router;

