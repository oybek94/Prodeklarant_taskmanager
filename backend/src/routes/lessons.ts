/**
 * Lessons API Routes
 * 
 * Handles lesson status, unlock checks, and lesson progression
 */

import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { LessonProgressionService } from '../services/lesson-progression.service';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/lessons/:id/status
 * Get lesson status for current user
 */
router.get('/:id/status', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const lessonId = parseInt(req.params.id);
    const userId = req.user!.id;

    const status = await LessonProgressionService.calculateLessonStatus(userId, lessonId);
    
    const progress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    res.json({
      lessonId,
      status,
      lastAttemptScore: progress?.lastAttemptScore || null,
      completedAt: progress?.completedAt || null,
    });
  } catch (error: any) {
    console.error('Error getting lesson status:', error);
    res.status(500).json({
      error: 'Lesson statusini olishda xatolik',
      details: error.message,
    });
  }
});

/**
 * GET /api/lessons/:id/unlock-check
 * Check if lesson can be unlocked
 */
router.get('/:id/unlock-check', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const lessonId = parseInt(req.params.id);
    const userId = req.user!.id;

    const result = await LessonProgressionService.canUnlockLesson(userId, lessonId);
    
    res.json(result);
  } catch (error: any) {
    console.error('Error checking unlock status:', error);
    res.status(500).json({
      error: 'Unlock statusini tekshirishda xatolik',
      details: error.message,
    });
  }
});

/**
 * POST /api/lessons/:id/start
 * Mark lesson as IN_PROGRESS
 */
router.post('/:id/start', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const lessonId = parseInt(req.params.id);
    const userId = req.user!.id;

    await LessonProgressionService.startLesson(userId, lessonId);

    res.json({
      success: true,
      message: 'Lesson started',
      lessonId,
      status: 'IN_PROGRESS',
    });
  } catch (error: any) {
    console.error('Error starting lesson:', error);
    res.status(400).json({
      error: 'Lessoni boshlashda xatolik',
      details: error.message,
    });
  }
});

/**
 * GET /api/lessons/stage/:stageId
 * Get all lessons with their statuses for a stage
 */
router.get('/stage/:stageId', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const stageId = parseInt(req.params.stageId);
    const userId = req.user!.id;

    const lessons = await LessonProgressionService.getUserLessonsWithStatus(userId, stageId);

    res.json(lessons);
  } catch (error: any) {
    console.error('Error getting lessons for stage:', error);
    res.status(500).json({
      error: 'Lessonslarni olishda xatolik',
      details: error.message,
    });
  }
});

export default router;

