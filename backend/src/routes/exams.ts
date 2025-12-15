import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Imtihonni boshlash
router.post('/:id/start', requireAuth(), async (req, res) => {
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

    // O'qitishni tugallanganligini tekshirish
    const progress = await prisma.trainingProgress.findUnique({
      where: {
        userId_trainingId: {
          userId: req.user!.id,
          trainingId: exam.trainingId,
        },
      },
    });

    if (!progress || !progress.completed) {
      return res.status(400).json({ 
        error: 'Avval o\'qitishni tugallashingiz kerak' 
      });
    }

    // Savollarni tayyorlash (to'g'ri javoblarni olib tashlash)
    const questionsForUser = exam.questions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      points: q.points,
      orderIndex: q.orderIndex,
    }));

    // Maksimal ballni hisoblash
    const maxScore = exam.questions.reduce((sum, q) => sum + q.points, 0);

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
router.post('/:id/submit', requireAuth(), async (req, res) => {
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
    const examAnswers = [];

    for (const userAnswer of answers) {
      const question = exam.questions.find((q) => q.id === userAnswer.questionId);
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
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error submitting exam:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Imtihon natijalarini olish
router.get('/:id/results', requireAuth(), async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
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

    res.json(attempts);
  } catch (error) {
    console.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Imtihon yaratish
router.post('/', requireAuth('ADMIN'), async (req, res) => {
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
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Savol qo'shish
router.post('/:id/questions', requireAuth('ADMIN'), async (req, res) => {
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
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Savol yangilash
router.put('/:id/questions/:questionId', requireAuth('ADMIN'), async (req, res) => {
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
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

// Admin: Savol o'chirish
router.delete('/:id/questions/:questionId', requireAuth('ADMIN'), async (req, res) => {
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
router.put('/:id', requireAuth('ADMIN'), async (req, res) => {
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
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating exam:', error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

export default router;

