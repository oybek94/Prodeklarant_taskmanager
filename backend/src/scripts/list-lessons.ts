/**
 * Script to list all lessons (TrainingSteps) with their IDs
 */

import { prisma } from '../prisma';

async function listLessons() {
  try {
    const lessons = await prisma.trainingStep.findMany({
      include: {
        stage: {
          include: {
            training: true,
          },
        },
        materials: {
          where: {
            type: 'TEXT',
          },
        },
        exams: {
          where: {
            active: true,
          },
        },
      },
      orderBy: [
        {
          stage: {
            training: {
              orderIndex: 'asc',
            },
          },
        },
        {
          stage: {
            orderIndex: 'asc',
          },
        },
        {
          orderIndex: 'asc',
        },
      ],
    });

    console.log('\n📚 Barcha Lesson\'lar:\n');
    lessons.forEach((lesson, index) => {
      console.log(`${index + 1}. ID: ${lesson.id}`);
      console.log(`   Nomi: ${lesson.title}`);
      console.log(`   Training: ${lesson.stage.training.title}`);
      console.log(`   Stage: ${lesson.stage.title}`);
      console.log(`   Materiallar: ${lesson.materials.length} ta`);
      console.log(`   Exam'lar: ${lesson.exams.length} ta`);
      console.log('');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error listing lessons:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

listLessons();
