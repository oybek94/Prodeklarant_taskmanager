/**
 * Barcha jarayonlarni task yaratilgan vaqtdan 90 daqiqadan keyin bajarilgan qilib belgilash
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setStageCompletionTimes() {
  console.log('Barcha jarayonlarni task yaratilgan vaqtdan 90 daqiqadan keyin bajarilgan qilib belgilash...\n');
  
  // Barcha task'larni olish
  const allTasks = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      createdAt: true,
      stages: {
        where: {
          status: 'TAYYOR',
        },
        select: {
          id: true,
          name: true,
          completedAt: true,
        },
      },
    },
  });
  
  console.log(`Jami ${allTasks.length} ta task topildi\n`);
  
  let updated = 0;
  let totalStages = 0;
  
  // Har bir task uchun stage'larni yangilash
  for (const task of allTasks) {
    if (task.stages.length === 0) {
      continue;
    }
    
    // Task yaratilgan vaqtdan 90 daqiqadan keyin
    const completionTime = new Date(task.createdAt.getTime() + 90 * 60 * 1000);
    
    // Har bir stage uchun completedAt'ni yangilash
    for (const stage of task.stages) {
      if (!stage.completedAt || stage.completedAt.getTime() !== completionTime.getTime()) {
        await prisma.taskStage.update({
          where: { id: stage.id },
          data: { completedAt: completionTime },
        });
        
        updated++;
        totalStages++;
      } else {
        totalStages++;
      }
    }
    
    if (updated % 100 === 0 && updated > 0) {
      console.log(`  Yangilangan: ${updated} ta stage...`);
    }
  }
  
  console.log(`\n=== Natijalar ===`);
  console.log(`Yangilangan stage'lar: ${updated}`);
  console.log(`Jami tayyor stage'lar: ${totalStages}`);
  console.log(`Jami task'lar: ${allTasks.length}`);
  
  // Tekshiruv: bir nechta task'ni ko'rsatish
  const sampleTasks = await prisma.task.findMany({
    take: 3,
    include: {
      stages: {
        where: {
          status: 'TAYYOR',
        },
        select: {
          name: true,
          completedAt: true,
        },
        orderBy: {
          stageOrder: 'asc',
        },
      },
    },
    orderBy: {
      id: 'desc',
    },
  });
  
  console.log(`\n=== Namuna task'lar ===`);
  for (const task of sampleTasks) {
    console.log(`\nTask ${task.id}: ${task.title.substring(0, 40)}...`);
    console.log(`  Yaratilgan: ${task.createdAt.toLocaleString('uz-UZ')}`);
    if (task.stages.length > 0) {
      const firstStage = task.stages[0];
      console.log(`  Birinchi stage bajarilgan: ${firstStage.completedAt?.toLocaleString('uz-UZ')}`);
      const diffMinutes = firstStage.completedAt 
        ? Math.round((firstStage.completedAt.getTime() - task.createdAt.getTime()) / (60 * 1000))
        : 0;
      console.log(`  Farq: ${diffMinutes} daqiqa`);
    }
  }
}

async function main() {
  try {
    await setStageCompletionTimes();
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

