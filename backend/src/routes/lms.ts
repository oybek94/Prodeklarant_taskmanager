import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { createStreamSession, verifyStreamSession } from '../services/stream.service';
import path from 'path';
import fs from 'fs';

const router = Router();

// POST /lessons/:lessonId/stream-token
// Body: { mediaId }
router.post('/lessons/:lessonId/stream-token', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId, 10);
    const { mediaId } = req.body;
    const user = req.user!;

    if (!mediaId) return res.status(400).json({ error: 'mediaId required' });

    // Validate lesson & media
    const media = await prisma.lmsLessonMedia.findUnique({ where: { id: mediaId } });
    if (!media) return res.status(404).json({ error: 'Media not found' });
    if (media.lessonId !== lessonId) return res.status(400).json({ error: 'Media not associated with lesson' });

    // Access checks: ensure course required level and sequence locks
    const lesson = await prisma.lmsLesson.findUnique({ where: { id: lessonId }, include: { module: { include: { course: true } } } });
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    // Check course level requirement
    const requiredLevelId = lesson.module?.course?.requiredLevelId;
    if (requiredLevelId) {
      const profile = await prisma.lmsUserProfile.findUnique({ where: { userId: user.id } });
      if (!profile || !profile.currentLevelId) {
        return res.status(403).json({ error: 'Access denied: level not assigned' });
      }
      // Simple numeric comparison: ensure user's level order >= required
      const requiredLevel = await prisma.lmsLevel.findUnique({ where: { id: requiredLevelId } });
      const userLevel = await prisma.lmsLevel.findUnique({ where: { id: profile.currentLevelId } });
      if (requiredLevel && userLevel && userLevel.orderIndex < requiredLevel.orderIndex) {
        return res.status(403).json({ error: 'Access denied: level too low' });
      }
    }

    // Sequence lock
    const lock = await prisma.lmsLessonSequenceLock.findUnique({ where: { lessonId } });
    if (lock && lock.unlockAfterLessonId) {
      const progress = await prisma.lmsUserProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId: lock.unlockAfterLessonId } } });
      if (!progress || !progress.completedAt) {
        return res.status(403).json({ error: 'Previous lesson not completed' });
      }
    }

    // All good - create session
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined;
    const userAgent = req.headers['user-agent'] || undefined;
    const session = await createStreamSession(user.id, mediaId, clientIp, userAgent);

    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString() });
  } catch (err: any) {
    console.error('Error issuing stream token:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Helper to get upload path
const uploadsRoot = path.join(__dirname, '../../uploads');

// GET /media/stream/:mediaId -> serve HLS manifest or MP4
router.get('/media/stream/:mediaId', async (req, res) => {
  try {
    const mediaId = parseInt(req.params.mediaId, 10);
    const token = (req.query.token as string) || '';

    if (!token) return res.status(401).json({ error: 'Missing token' });

    const session = await verifyStreamSession(token, mediaId);
    if (!session) return res.status(401).json({ error: 'Invalid or expired token' });

    const media = await prisma.lmsLessonMedia.findUnique({ where: { id: mediaId } });
    if (!media) return res.status(404).json({ error: 'Media not found' });

    // Serve HLS manifest if present
    if (media.hlsManifestKey) {
      const manifestPath = path.join(uploadsRoot, media.hlsManifestKey);
      if (!fs.existsSync(manifestPath)) return res.status(404).json({ error: 'Manifest not found' });
      let manifest = fs.readFileSync(manifestPath, 'utf-8');

      // Rewrite segment URIs to go through proxy with token
      // Example: replace relative lines (not starting with http) with proxy path
      manifest = manifest.replace(/^(?!#)(.+)$/gm, (match) => {
        if (match.startsWith('http')) return match; // external
        const encoded = encodeURIComponent(match.trim());
        return `/api/v1/media/stream/${mediaId}/segments/${encoded}?token=${token}`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(manifest);
    }

    // Fallback: stream raw file from storageKey
    const filePath = path.join(uploadsRoot, media.storageKey);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const stat = fs.statSync(filePath);
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = Number(parts[0]);
      const end = parts[1] ? Number(parts[1]) : stat.size - 1;
      if (start >= stat.size) {
        res.status(416).setHeader('Content-Range', `bytes */${stat.size}`);
        return res.end();
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', (end - start + 1).toString());
      res.setHeader('Content-Type', media.contentType || 'application/octet-stream');

      const stream = fs.createReadStream(filePath, { start, end });
      return stream.pipe(res);
    } else {
      res.setHeader('Content-Length', stat.size.toString());
      res.setHeader('Content-Type', media.contentType || 'application/octet-stream');
      const stream = fs.createReadStream(filePath);
      return stream.pipe(res);
    }
  } catch (err: any) {
    console.error('Streaming error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET segments: /media/stream/:mediaId/segments/:segmentPath
router.get('/media/stream/:mediaId/segments/:segmentPath', async (req, res) => {
  try {
    const mediaId = parseInt(req.params.mediaId, 10);
    const segmentPath = decodeURIComponent(req.params.segmentPath);
    const token = (req.query.token as string) || '';
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const session = await verifyStreamSession(token, mediaId);
    if (!session) return res.status(401).json({ error: 'Invalid or expired token' });

    const media = await prisma.lmsLessonMedia.findUnique({ where: { id: mediaId } });
    if (!media || !media.hlsManifestKey) return res.status(404).json({ error: 'Media or segments not found' });

    // Assume segments are relative to manifest directory
    const manifestDir = path.dirname(path.join(uploadsRoot, media.hlsManifestKey));
    const segmentFullPath = path.join(manifestDir, segmentPath);
    if (!fs.existsSync(segmentFullPath)) return res.status(404).json({ error: 'Segment not found' });

    const stat = fs.statSync(segmentFullPath);
    res.setHeader('Content-Length', stat.size.toString());
    // best-effort content type
    res.setHeader('Content-Type', 'application/octet-stream');
    const stream = fs.createReadStream(segmentFullPath);
    return stream.pipe(res);
  } catch (err: any) {
    console.error('Segment streaming error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
