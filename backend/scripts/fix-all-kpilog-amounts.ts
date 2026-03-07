/**
 * Barcha import qilingan tasklar uchun KpiLog amount'larini $5 ga o'rnatish
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const WORKER_NAMES = ['Abdukamol', 'Ahadbek', 'Hakimjon'];
const WORKER_PAYMENT = 5;

async function fixAllKpiLogAmounts() {
  console.log('Barcha KpiLog amount\'larini $5 ga o\'rnatish...\n');
  
  // Workers'ni topish
  const workers = await prisma.user.findMany({
    where: { name: { in: WORKER_NAMES } },
    select: { id: true, name: true },
  });
  
  if (workers.length !== 3) {
    console.error(`Xatolik: ${workers.length} ta worker topildi, 3 ta bo'lishi kerak`);
    return;
  }
  
  console.log(`Workers: ${workers.map(w => w.name).join(', ')}\n`);
  
  // Oltiariq branch'dagi 2025 yil tasklarini topish
  const branch = await prisma.branch.findFirst({
    where: { name: 'Oltiariq' },
  });
  
  if (!branch) {
    console.error('Oltiariq branch topilmadi');
    return;
  }
  
  // 2025 yil tasklarini topish
  const tasks = await prisma.task.findMany({
    where: {
      branchId: branch.id,
      createdAt: {
        gte: new Date('2025-01-01'),
        lt: new Date('2026-01-01'),
      },
    },
    select: { id: true },
  });
  
  console.log(`Topildi: ${tasks.length} ta task\n`);
  
  const taskIds = tasks.map(t => t.id);
  
  let updated = 0;
  let created = 0;
  let errors = 0;
  
  for (const taskId of taskIds) {
    try {
      await prisma.$transaction(async (tx) => {
        for (const worker of workers) {
          // Mavjud KpiLog yozuvini topish
          const existingLog = await tx.kpiLog.findFirst({
            where: {
              userId: worker.id,
              taskId: taskId,
              stageName: 'Invoys',
            },
          });
          
          if (existingLog) {
            // Agar amount 5 emas bo'lsa, yangilash
            if (Number(existingLog.amount) !== WORKER_PAYMENT) {
              await tx.kpiLog.update({
                where: { id: existingLog.id },
                data: {
                  amount: new Prisma.Decimal(WORKER_PAYMENT),
                },
              });
              updated++;
            }
          } else {
            // Agar mavjud bo'lmasa, yaratish
            await tx.kpiLog.create({
              data: {
                userId: worker.id,
                taskId: taskId,
                stageName: 'Invoys',
                amount: new Prisma.Decimal(WORKER_PAYMENT),
              },
            });
            created++;
          }
        }
      });
      
      if ((updated + created) % 100 === 0 && (updated + created) > 0) {
        console.log(`  Ishlangan: ${updated + created} ta yozuv...`);
      }
    } catch (error: any) {
      console.error(`  [ERROR] Task ${taskId}: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n=== Natijalar ===');
  console.log(`Yangilandi: ${updated}`);
  console.log(`Yaratildi: ${created}`);
  console.log(`Xatolar: ${errors}`);
  
  // Workers bo'yicha yangi statistikani ko'rsatish
  console.log('\nWorkers bo\'yicha yangi statistika:');
  for (const worker of workers) {
    const workerLogs = await prisma.kpiLog.findMany({
      where: {
        userId: worker.id,
        task: {
          branchId: branch.id,
          createdAt: {
            gte: new Date('2025-01-01'),
            lt: new Date('2026-01-01'),
          },
        },
        stageName: 'Invoys',
        amount: WORKER_PAYMENT,
      },
    });
    const total = workerLogs.reduce((sum, log) => sum + Number(log.amount), 0);
    console.log(`  ${worker.name}: ${workerLogs.length} ta yozuv, Jami: ${total}$`);
  }
}

fixAllKpiLogAmounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

