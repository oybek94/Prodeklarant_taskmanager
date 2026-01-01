/**
 * Script to generate AI exam for a lesson
 * 
 * Usage: tsx src/scripts/generate-exam-for-lesson.ts <lessonId>
 * Example: tsx src/scripts/generate-exam-for-lesson.ts 1
 */

import { prisma } from '../prisma';
import { ExamAIService } from '../services/exam-ai.service';

async function generateExamForLesson(lessonId: number) {
  try {
    console.log(`\n🔍 Fetching lesson ${lessonId}...`);
    
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
      console.error(`❌ Lesson ${lessonId} not found!`);
      process.exit(1);
    }

    console.log(`✅ Lesson found: "${lesson.title}"`);
    console.log(`   Stage: ${lesson.stage.title}`);
    console.log(`   Training: ${lesson.stage.training.title}`);

    // Check if lesson already has an exam
    const existingExam = await prisma.exam.findFirst({
      where: {
        lessonId: lessonId,
        active: true,
      },
    });

    if (existingExam) {
      console.log(`\n⚠️  Lesson already has an exam (ID: ${existingExam.id})`);
      console.log(`   Title: ${existingExam.title}`);
      const confirm = process.argv.includes('--force');
      if (!confirm) {
        console.log(`\n   Use --force flag to regenerate exam`);
        process.exit(0);
      }
      console.log(`\n   Regenerating exam...`);
    }

    // Combine all text materials into lesson content
    const lessonContent = lesson.materials
      .map(m => m.content || '')
      .filter(c => c.trim().length > 0)
      .join('\n\n');

    if (!lessonContent || lessonContent.trim().length === 0) {
      console.error(`❌ Lesson has no text content!`);
      console.log(`   Materials found: ${lesson.materials.length}`);
      process.exit(1);
    }

    console.log(`\n📚 Lesson content length: ${lessonContent.length} characters`);
    console.log(`   Text materials: ${lesson.materials.length}`);

    // Generate exam using AI
    console.log(`\n🤖 Generating exam using AI...`);
    const examResult = await ExamAIService.generateExam(
      lessonId,
      lesson.title,
      lessonContent
    );

    console.log(`✅ Exam generated successfully!`);
    console.log(`   Questions: ${examResult.questions.length}`);
    console.log(`   Total points: ${examResult.total_points}`);
    console.log(`   Passing score: ${examResult.passing_score}%`);

    // Delete existing exam if regenerating
    if (existingExam) {
      await prisma.exam.delete({
        where: { id: existingExam.id },
      });
      console.log(`\n🗑️  Deleted old exam (ID: ${existingExam.id})`);
    }

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

    console.log(`\n💾 Exam saved to database (ID: ${exam.id})`);

    // Create exam questions
    console.log(`\n📝 Creating ${examResult.questions.length} questions...`);
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

    console.log(`✅ All questions created successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Exam ID: ${exam.id}`);
    console.log(`   Title: ${exam.title}`);
    console.log(`   Questions: ${questions.length}`);
    console.log(`   Passing Score: ${exam.passingScore}%`);
    console.log(`\n✅ Exam generation completed!`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error generating exam:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Get lesson ID from command line arguments
const lessonId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (!lessonId || isNaN(lessonId)) {
  console.error('❌ Please provide a valid lesson ID');
  console.log('\nUsage: tsx src/scripts/generate-exam-for-lesson.ts <lessonId>');
  console.log('Example: tsx src/scripts/generate-exam-for-lesson.ts 1');
  process.exit(1);
}

generateExamForLesson(lessonId);

