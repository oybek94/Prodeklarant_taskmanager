import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { ExamAIService } from '../services/exam-ai.service';
import { LessonProgressionService } from '../services/lesson-progression.service';

const router = Router();

// GET /exams - Get exams (with optional filters) - MUST BE BEFORE /:id routes
router.get('/', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const lessonId = req.query.lessonId ? parseInt(req.query.lessonId as string) : undefined;
    const trainingId = req.query.trainingId ? parseInt(req.query.trainingId as string) : undefined;

    const where: any = {
      active: true,
    };

    if (lessonId) {
      where.lessonId = lessonId;
    }

    if (trainingId) {
      where.trainingId = trainingId;
    }

    const exams = await prisma.exam.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
        training: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(exams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Imtihonni boshlash
router.post('/:id/start', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const examId = parseInt(req.params.id);
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
        },
        training: true,
      },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Imtihon topilmadi' });
    }

    if (!exam.active) {
      return res.status(400).json({ error: 'Imtihon faol emas' });
    }

    // O'qitishni tugallanganligini tekshirish (faqat trainingId bo'lsa)
    if (exam.trainingId) {
      const trainingProgress = await prisma.trainingProgress.findUnique({
        where: {
          userId_trainingId: {
            userId: req.user!.id,
            trainingId: exam.trainingId,
          },
        },
      });

      if (!trainingProgress || !trainingProgress.completed) {
        return res.status(400).json({ 
          error: 'Avval o\'qitishni tugallashingiz kerak' 
        });
      }
    }

    // Savollarni tayyorlash (to'g'ri javoblarni olib tashlash)
    const questionsForUser = exam.questions.map((q: any) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      points: q.points,
      orderIndex: q.orderIndex,
    }));

    // Maksimal ballni hisoblash
    const maxScore = exam.questions.reduce((sum: number, q: any) => sum + q.points, 0);

    res.json({
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        passingScore: exam.passingScore,
        timeLimitMin: exam.timeLimitMin,
      },
      questions: questionsForUser,
      maxScore,
    });
  } catch (error) {
    console.error('Error starting exam:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Imtihonni topshirish
router.post('/:id/submit', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const examId = parseInt(req.params.id);
    const schema = z.object({
      answers: z.array(
        z.object({
          questionId: z.number(),
          answer: z.any(), // JSON format
        })
      ),
    });

    const { answers } = schema.parse(req.body);

    // Imtihon va savollarni olish
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: true,
      },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Imtihon topilmadi' });
    }

    // Imtihon topshirish yozuvini yaratish
    const attempt = await prisma.examAttempt.create({
      data: {
        userId: req.user!.id,
        examId: exam.id,
        score: 0,
        maxScore: exam.questions.reduce((sum, q) => sum + q.points, 0),
        passed: false,
      },
    });

    // Har bir savolni tekshirish va javoblar yozuvini yaratish
    let totalScore = 0;
    const examAnswers: any[] = [];

    for (const userAnswer of answers) {
      const question = exam.questions.find((q: any) => q.id === userAnswer.questionId);
      if (!question) continue;

      let isCorrect = false;
      let points = 0;

      // To'g'ri javobni tekshirish
      if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
        const correctAnswer = question.correctAnswer;
        const userAnswerValue = userAnswer.answer;
        
        if (Array.isArray(correctAnswer) && Array.isArray(userAnswerValue)) {
          // Multiple choice: ikkala array ham bir xil bo'lishi kerak
          isCorrect = JSON.stringify(correctAnswer.sort()) === JSON.stringify(userAnswerValue.sort());
        } else {
          isCorrect = JSON.stringify(correctAnswer) === JSON.stringify(userAnswerValue);
        }
      } else if (question.type === 'TEXT') {
        // Text javoblar uchun keyinroq qo'lda tekshirish mumkin
        isCorrect = false; // Hozircha false
      }

      if (isCorrect) {
        points = question.points;
        totalScore += points;
      }

      const examAnswer = await prisma.examAnswer.create({
        data: {
          attemptId: attempt.id,
          questionId: question.id,
          answer: userAnswer.answer,
          isCorrect,
          points,
        },
      });

      examAnswers.push(examAnswer);
    }

    // Imtihon natijasini yangilash
    // Agar savollar bo'lmasa, maxScore 0 bo'ladi, shuning uchun tekshirish kerak
    if (attempt.maxScore === 0) {
      return res.status(400).json({ 
        error: 'Imtihonda savollar mavjud emas. Avval savollar qo\'shing.' 
      });
    }
    
    const scorePercent = Math.round((totalScore / attempt.maxScore) * 100);
    const passed = scorePercent >= exam.passingScore;

    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        score: totalScore,
        passed,
        completedAt: new Date(),
      },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    res.json({
      attempt: updatedAttempt,
      score: totalScore,
      maxScore: attempt.maxScore,
      scorePercent,
      passed,
      passingScore: exam.passingScore,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error submitting exam:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Imtihon natijalarini olish
router.get('/:id/results', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const examId = parseInt(req.params.id);
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Imtihon topilmadi' });
    }

    const attempts = await prisma.examAttempt.findMany({
      where: {
        userId: req.user!.id,
        examId: examId,
      },
      orderBy: { startedAt: 'desc' },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    res.json({
      exam: {
        id: exam.id,
        title: exam.title,
        passingScore: exam.passingScore,
      },
      attempts,
    });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Imtihon yaratish
router.post('/', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      trainingId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      passingScore: z.number().min(0).max(100).default(70),
      timeLimitMin: z.number().optional(),
    });

    const data = schema.parse(req.body);
    const exam = await prisma.exam.create({
      data,
    });

    res.json(exam);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Savol qo'shish
router.post('/:id/questions', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const examId = parseInt(req.params.id);
    const schema = z.object({
      question: z.string().min(1),
      type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT']),
      options: z.array(z.string()),
      correctAnswer: z.any(), // JSON format
      points: z.number().default(1),
      orderIndex: z.number().default(0),
    });

    const data = schema.parse(req.body);
    const question = await prisma.examQuestion.create({
      data: {
        ...data,
        examId,
      },
    });

    res.json(question);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Savol yangilash
router.put('/:id/questions/:questionId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const schema = z.object({
      question: z.string().min(1).optional(),
      type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT']).optional(),
      options: z.array(z.string()).optional(),
      correctAnswer: z.any().optional(),
      points: z.number().optional(),
      orderIndex: z.number().optional(),
    });

    const data = schema.parse(req.body);
    const question = await prisma.examQuestion.update({
      where: { id: questionId },
      data,
    });

    res.json(question);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Savol o'chirish
router.delete('/:id/questions/:questionId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    await prisma.examQuestion.delete({
      where: { id: questionId },
    });

    res.json({ message: 'Savol o\'chirildi' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Imtihon yangilash
router.put('/:id', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const examId = parseInt(req.params.id);
    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      passingScore: z.number().min(0).max(100).optional(),
      timeLimitMin: z.number().optional(),
      active: z.boolean().optional(),
    });

    const data = schema.parse(req.body);
    const exam = await prisma.exam.update({
      where: { id: examId },
      data,
    });

    res.json(exam);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Error updating exam:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// ============================================================================
// AI EXAM SYSTEM ENDPOINTS
// ============================================================================

/**
 * POST /api/exams/ai/generate/:lessonId
 * Generate AI-powered exam for a lesson
 */
router.post('/ai/generate/:lessonId', requireAuth('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    
    // Get lesson details
    const lesson = await prisma.trainingStep.findUnique({
      where: { id: lessonId },
      include: {
        materials: {
          where: {
            type: 'TEXT',
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson topilmadi' });
    }

    // Combine all text materials into lesson content
    const lessonContent = lesson.materials
      .map(m => m.content || '')
      .filter(c => c.trim().length > 0)
      .join('\n\n');

    if (!lessonContent || lessonContent.trim().length === 0) {
      return res.status(400).json({ error: 'Lesson content topilmadi' });
    }

    // Generate exam using AI
    const examResult = await ExamAIService.generateExam(
      lessonId,
      lesson.title,
      lessonContent
    );

    // Create exam in database
    const exam = await prisma.exam.create({
      data: {
        lessonId: lessonId,
        title: `${lesson.title} - AI Generated Exam`,
        description: `AI tomonidan avtomatik generatsiya qilingan imtihon`,
        passingScore: examResult.passing_score,
        questionCount: examResult.questions.length,
        active: true,
      },
    });

    // Create exam questions
    const questions = await Promise.all(
      examResult.questions.map((q, index) =>
        prisma.examQuestion.create({
          data: {
            examId: exam.id,
            question: q.question,
            type: q.type,
            options: q.options || [],
            correctAnswer: q.correct_answer,
            points: q.points,
            orderIndex: index,
          },
        })
      )
    );

    res.json({
      exam: {
        ...exam,
        questions,
      },
    });
  } catch (error: any) {
    console.error('Error generating AI exam:', error);
    res.status(500).json({
      error: 'AI exam generatsiya qilishda xatolik',
      details: error.message,
    });
  }
});

/**
 * POST /api/exams/:id/attempt
 * Submit exam attempt with AI evaluation
 */
router.post('/:id/attempt', requireAuth(), async (req: AuthRequest, res) => {
  try {
    const examId = parseInt(req.params.id);
    const userId = req.user!.id;

    const schema = z.object({
      answers: z.record(z.string(), z.any()), // { questionId: answer }
    });

    const { answers } = schema.parse(req.body);

    // Get exam with questions
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: {
            orderIndex: 'asc',
          },
        },
        lesson: {
          include: {
            materials: {
              where: {
                type: 'TEXT',
              },
            },
          },
        },
      },
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam topilmadi' });
    }

    if (!exam.lessonId || !exam.lesson) {
      return res.status(400).json({ error: 'Exam lesson ga bog\'lanmagan' });
    }

    // Get lesson content
    const lessonContent = exam.lesson.materials
      .map(m => m.content || '')
      .filter(c => c.trim().length > 0)
      .join('\n\n');

    // Evaluate answers using AI
    const evaluationResult = await ExamAIService.evaluateAnswers(
      exam.lesson.id,
      exam.lesson.title,
      lessonContent,
      answers
    );

    // Get attempt number
    const previousAttempts = await prisma.examAttempt.count({
      where: {
        userId,
        examId,
      },
    });

    const attemptNumber = previousAttempts + 1;

    // Create exam attempt
    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        examId,
        attemptNumber,
        score: evaluationResult.score,
        maxScore: 100,
        passed: evaluationResult.passed,
        aiFeedback: evaluationResult as any,
      },
    });

    // Create exam answers
    await Promise.all(
      Object.entries(answers).map(async ([questionId, answer]) => {
        const question = exam.questions.find(q => q.id === parseInt(questionId));
        if (!question) return;

        const questionScore = evaluationResult.question_scores[questionId] || {
          correct: false,
          score: 0,
          feedback: '',
        };

        await prisma.examAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: question.id,
            answer: answer as any,
            isCorrect: questionScore.correct,
            points: questionScore.score,
          },
        });
      })
    );

    // Update lesson status
    if (exam.lessonId && exam.lesson) {
      await LessonProgressionService.updateLessonStatusAfterExam(
        userId,
        exam.lessonId,
        evaluationResult.score,
        evaluationResult.passed
      );
    }

    // Get evaluator feedback
    const evaluatorResult = await ExamAIService.evaluateAttempt({
      attemptId: attempt.id,
      examId: exam.id,
      lessonTitle: exam.lesson.title,
      lessonContent,
      questions: exam.questions.map(q => ({
        id: q.id.toString(),
        question: q.question,
        type: q.type,
        correctAnswer: q.correctAnswer,
      })),
      learnerAnswers: answers,
      questionScores: evaluationResult.question_scores,
      overallScore: evaluationResult.score,
      passed: evaluationResult.passed,
    });

    // Update attempt with evaluator feedback
    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        aiFeedback: evaluatorResult as any,
      },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    res.json({
      attempt: updatedAttempt,
      evaluation: evaluatorResult,
    });
  } catch (error: any) {
    console.error('Error submitting exam attempt:', error);
    res.status(500).json({
      error: 'Exam attempt yuborishda xatolik',
      details: error.message,
    });
  }
});

export default router;

