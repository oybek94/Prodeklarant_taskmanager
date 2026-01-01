/**
 * Script to create an AI-generated exam for a specific lesson
 * Usage: tsx src/scripts/create-exam-for-lesson.ts <lessonId>
 */

import { prisma } from '../prisma';
import { ExamAIService } from '../services/exam-ai.service';

async function createExamForLesson(lessonId: number) {
  try {
    console.log(`Creating exam for lesson ${lessonId}...`);

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
        stage: {
          include: {
            training: true,
          },
        },
      },
    });

    if (!lesson) {
      console.error(`Lesson ${lessonId} not found`);
      process.exit(1);
    }

    console.log(`Lesson found: ${lesson.title}`);
    console.log(`Materials count: ${lesson.materials.length}`);

    // Combine all text materials into lesson content
    const lessonContent = lesson.materials
      .map(m => m.content || '')
      .filter(c => c.trim().length > 0)
      .join('\n\n');

    if (!lessonContent || lessonContent.trim().length === 0) {
      console.error('No text content found in lesson materials');
      process.exit(1);
    }

    console.log(`Lesson content length: ${lessonContent.length} characters`);

    // Generate exam using AI
    console.log('Generating exam with AI...');
    const examResult = await ExamAIService.generateExam(
      lessonId,
      lesson.title,
      lessonContent
    );

    console.log(`Generated ${examResult.questions.length} questions`);

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

    console.log(`Exam created with ID: ${exam.id}`);

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

    console.log(`Created ${questions.length} questions`);
    console.log(`\n✅ Exam created successfully!`);
    console.log(`Exam ID: ${exam.id}`);
    console.log(`Lesson: ${lesson.title}`);
    console.log(`Questions: ${questions.length}`);
    console.log(`Passing score: ${examResult.passing_score}%`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error creating exam:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Get lesson ID from command line arguments
const lessonId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (!lessonId || isNaN(lessonId)) {
  console.error('Usage: tsx src/scripts/create-exam-for-lesson.ts <lessonId>');
  console.error('Example: tsx src/scripts/create-exam-for-lesson.ts 1');
  process.exit(1);
}

createExamForLesson(lessonId);


