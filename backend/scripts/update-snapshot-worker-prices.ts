/**
 * Mavjud task'larda snapshotWorkerPrice ni yangilash
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSnapshotWorkerPrices() {
  console.log('Mavjud task\'larda snapshotWorkerPrice ni yangilash...\n');
  
  // Barcha task'larni olish (snapshotWorkerPrice null yoki undefined bo'lganlar)
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { snapshotWorkerPrice: null },
        { snapshotWorkerPrice: undefined },
      ],
    },
    select: {
      id: true,
      title: true,
      branchId: true,
      createdAt: true,
      snapshotWorkerPrice: true,
    },
  });
  
  console.log(`Jami ${tasks.length} ta task topildi (snapshotWorkerPrice null)\n`);
  
  let updated = 0;
  let notFound = 0;
  
  // Har bir task uchun
  for (const task of tasks) {
    try {
      // Task yaratilgan vaqtdan oldin yaratilgan eng so'nggi statePayment ni topish
      const statePayment = await prisma.statePayment.findFirst({
        where: {
          branchId: task.branchId,
          createdAt: { lte: task.createdAt },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      if (statePayment) {
        const workerPrice = Number(statePayment.workerPrice);
        await prisma.task.update({
          where: { id: task.id },
          data: { snapshotWorkerPrice: workerPrice },
        });
        updated++;
        if (updated % 10 === 0) {
          console.log(`  Yangilangan: ${updated} ta task...`);
        }
      } else {
        // Agar task yaratilgan vaqtdan oldin StatePayment topilmasa, eng so'nggi StatePayment ni olish
        const latestStatePayment = await prisma.statePayment.findFirst({
          where: {
            branchId: task.branchId,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        
        if (latestStatePayment) {
          const workerPrice = Number(latestStatePayment.workerPrice);
          await prisma.task.update({
            where: { id: task.id },
            data: { snapshotWorkerPrice: workerPrice },
          });
          updated++;
          console.log(`  [FALLBACK] Task ${task.id}: Eng so'nggi StatePayment ishlatildi (${workerPrice})`);
        } else {
          notFound++;
          console.log(`  [WARN] Task ${task.id}: StatePayment topilmadi (Branch: ${task.branchId})`);
        }
      }
    } catch (error: any) {
      console.error(`  [ERROR] Task ${task.id}: ${error.message}`);
    }
  }
  
  console.log(`\n=== Natijalar ===`);
  console.log(`Yangilangan: ${updated}`);
  console.log(`StatePayment topilmadi: ${notFound}`);
  console.log(`Jami: ${tasks.length}`);
}

updateSnapshotWorkerPrices()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

