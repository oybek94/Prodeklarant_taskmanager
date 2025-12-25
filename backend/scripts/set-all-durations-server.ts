/**
 * Server'da barcha task'lar uchun duration va completion time'larni belgilash
 * (CSV fayl kerak emas)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setAllDurationsServer() {
  console.log('Server\'da barcha task\'lar uchun duration va completion time\'larni belgilash...\n');
  
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
          durationMin: true,
          completedAt: true,
        },
      },
    },
  });
  
  console.log(`Jami ${allTasks.length} ta task topildi\n`);
  
  let durationUpdated = 0;
  let completionUpdated = 0;
  let totalStages = 0;
  
  // Har bir task uchun
  for (const task of allTasks) {
    if (task.stages.length === 0) {
      continue;
    }
    
    // Task yaratilgan vaqtdan 90 daqiqadan keyin
    const completionTime = new Date(task.createdAt.getTime() + 90 * 60 * 1000);
    
    // Har bir stage uchun
    for (const stage of task.stages) {
      totalStages++;
      
      // Duration'ni 90 daqiqa qilib belgilash
      if (stage.durationMin !== 90) {
        await prisma.taskStage.update({
          where: { id: stage.id },
          data: { durationMin: 90 },
        });
        durationUpdated++;
      }
      
      // Completion time'ni belgilash
      if (!stage.completedAt || stage.completedAt.getTime() !== completionTime.getTime()) {
        await prisma.taskStage.update({
          where: { id: stage.id },
          data: { completedAt: completionTime },
        });
        completionUpdated++;
      }
    }
    
    if ((durationUpdated + completionUpdated) % 100 === 0 && (durationUpdated + completionUpdated) > 0) {
      console.log(`  Yangilangan: ${durationUpdated} duration, ${completionUpdated} completion time...`);
    }
  }
  
  console.log(`\n=== Natijalar ===`);
  console.log(`Duration yangilangan: ${durationUpdated}`);
  console.log(`Completion time yangilangan: ${completionUpdated}`);
  console.log(`Jami tayyor stage'lar: ${totalStages}`);
  console.log(`Jami task'lar: ${allTasks.length}`);
}

async function main() {
  try {
    await setAllDurationsServer();
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

