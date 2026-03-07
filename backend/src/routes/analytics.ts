/**
 * Analytics API Routes
 * 
 * Management analytics endpoints for AI-powered insights
 */

import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AnalyticsAIService } from '../services/analytics-ai.service';

const router = Router();

/**
 * GET /api/analytics/employee/:userId
 * Get AI-powered analytics for a specific employee
 */
router.get('/employee/:userId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const analytics = await AnalyticsAIService.analyzeEmployeePerformance(userId);

    res.json(analytics);
  } catch (error: any) {
    console.error('Error getting employee analytics:', error);
    res.status(500).json({
      error: 'Employee analytics olishda xatolik',
      details: error.message,
    });
  }
});

/**
 * GET /api/analytics/department/:departmentId
 * Get AI-powered analytics for a department (branch)
 */
router.get('/department/:departmentId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const departmentId = parseInt(req.params.departmentId);

    const analytics = await AnalyticsAIService.analyzeDepartment(departmentId);

    res.json(analytics);
  } catch (error: any) {
    console.error('Error getting department analytics:', error);
    res.status(500).json({
      error: 'Department analytics olishda xatolik',
      details: error.message,
    });
  }
});

/**
 * GET /api/analytics/topics
 * Get topic understanding analysis
 * Query params: ?topic=TopicName
 */
router.get('/topics', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const topicName = req.query.topic as string;

    if (!topicName) {
      return res.status(400).json({
        error: 'Topic nomi kiritilishi shart (query param: ?topic=TopicName)',
      });
    }

    const analytics = await AnalyticsAIService.analyzeTopicUnderstanding(topicName);

    res.json(analytics);
  } catch (error: any) {
    console.error('Error getting topic analytics:', error);
    res.status(500).json({
      error: 'Topic analytics olishda xatolik',
      details: error.message,
    });
  }
});

export default router;

