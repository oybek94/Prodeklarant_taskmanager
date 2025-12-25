/**
 * Barcha task'lar uchun status'ni qayta hisoblash va yangilash
 * 
 * Foydalanish:
 *   cd backend
 *   npx ts-node --transpile-only scripts/update-task-statuses.ts
 */

import { PrismaClient } from '@prisma/client';
import { calculateTaskStatus, updateTaskStatus } from '../src/services/task-status';

const prisma = new PrismaClient();

async function updateAllTaskStatuses() {
  console.log('Barcha task\'lar uchun status\'ni yangilash...\n');
  
  // Barcha task'larni olish
  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      status: true,
    },
  });
  
  console.log(`Jami ${tasks.length} ta task topildi\n`);
  
  let updated = 0;
  let unchanged = 0;
  let errors = 0;
  
  for (const task of tasks) {
    try {
      // Status'ni qayta hisoblash
      const newStatus = await calculateTaskStatus(prisma, task.id);
      
      // Agar status o'zgarmagan bo'lsa, o'tkazib yuborish
      if (task.status === newStatus) {
        unchanged++;
        continue;
      }
      
      // Status'ni yangilash
      await updateTaskStatus(prisma, task.id);
      
      console.log(`[UPDATED] Task ${task.id} (${task.title.substring(0, 30)}...): ${task.status} → ${newStatus}`);
      updated++;
      
      if (updated % 10 === 0) {
        console.log(`  Processed ${updated + unchanged} tasks...`);
      }
      
    } catch (error: any) {
      console.error(`[ERROR] Task ${task.id}: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n=== Natijalar ===');
  console.log(`Jami task'lar: ${tasks.length}`);
  console.log(`Yangilangan: ${updated}`);
  console.log(`O'zgarmagan: ${unchanged}`);
  console.log(`Xatolar: ${errors}`);
  
  // YAKUNLANDI status'dagi task'lar sonini ko'rsatish
  const yakunlandiCount = await prisma.task.count({
    where: {
      status: 'YAKUNLANDI',
    },
  });
  
  console.log(`\nYAKUNLANDI status'dagi task'lar: ${yakunlandiCount}`);
}

async function main() {
  try {
    await updateAllTaskStatuses();
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

