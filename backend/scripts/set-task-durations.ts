/**
 * Barcha task'lar uchun bajarish vaqtini 1 soat 30 daqiqa (90 daqiqa) qilib belgilash
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setTaskDurations() {
  console.log('Barcha task\'lar uchun bajarish vaqtini 1 soat 30 daqiqa (90 daqiqa) qilib belgilash...\n');
  
  // Barcha task'lar uchun stage'larni olish
  const allStages = await prisma.taskStage.findMany({
    where: {
      status: 'TAYYOR', // Faqat tayyor bo'lgan stage'lar
    },
    select: {
      id: true,
      taskId: true,
      name: true,
      durationMin: true,
    },
  });
  
  console.log(`Jami ${allStages.length} ta tayyor stage topildi\n`);
  
  let updated = 0;
  let alreadySet = 0;
  
  // Har bir stage uchun duration'ni 90 daqiqa qilib belgilash
  for (const stage of allStages) {
    if (stage.durationMin !== 90) {
      await prisma.taskStage.update({
        where: { id: stage.id },
        data: { durationMin: 90 },
      });
      
      updated++;
      
      if (updated % 50 === 0) {
        console.log(`  Yangilangan: ${updated} ta stage...`);
      }
    } else {
      alreadySet++;
    }
  }
  
  console.log(`\n=== Natijalar ===`);
  console.log(`Yangilangan: ${updated}`);
  console.log(`Allaqachon 90 daqiqa: ${alreadySet}`);
  console.log(`Jami: ${allStages.length}`);
  
  // Umumiy statistika
  const totalStages = await prisma.taskStage.count({
    where: {
      status: 'TAYYOR',
      durationMin: 90,
    },
  });
  
  console.log(`\n90 daqiqa belgilangan tayyor stage'lar: ${totalStages}`);
}

async function main() {
  try {
    await setTaskDurations();
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

