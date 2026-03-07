/**
 * Barcha 2025 yil tasklari uchun har bir worker'ga KpiLog yozuvini ta'minlash
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const WORKER_NAMES = ['Abdukamol', 'Ahadbek', 'Hakimjon'];
const WORKER_PAYMENT = 5;

async function ensureAllKpiLog() {
  console.log('Barcha tasklar uchun KpiLog yozuvlarini ta\'minlash...\n');
  
  // Workers'ni topish
  const workers = await prisma.user.findMany({
    where: { name: { in: WORKER_NAMES } },
    select: { id: true, name: true },
  });
  
  if (workers.length !== 3) {
    console.error(`Xatolik: ${workers.length} ta worker topildi`);
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
  
  const tasks = await prisma.task.findMany({
    where: {
      branchId: branch.id,
      createdAt: {
        gte: new Date('2025-01-01'),
        lt: new Date('2026-01-01'),
      },
    },
    select: { id: true, title: true },
  });
  
  console.log(`Topildi: ${tasks.length} ta task\n`);
  
  // Avval barcha mavjud KpiLog yozuvlarini olish
  const existingLogs = await prisma.kpiLog.findMany({
    where: {
      userId: { in: workers.map(w => w.id) },
      taskId: { in: tasks.map(t => t.id) },
      stageName: 'Invoys',
    },
    select: {
      userId: true,
      taskId: true,
      id: true,
      amount: true,
    },
  });
  
  // Mavjud yozuvlarni map qilish (userId-taskId kalit)
  const existingMap = new Map<string, { id: number; amount: number }>();
  existingLogs.forEach(log => {
    const key = `${log.userId}-${log.taskId}`;
    existingMap.set(key, { id: log.id, amount: Number(log.amount) });
  });
  
  // Yaratish kerak bo'lgan yozuvlarni to'plash
  const logsToCreate: Array<{ userId: number; taskId: number; stageName: string; amount: Prisma.Decimal }> = [];
  const logsToUpdate: Array<{ id: number }> = [];
  
  for (const task of tasks) {
    for (const worker of workers) {
      const key = `${worker.id}-${task.id}`;
      const existing = existingMap.get(key);
      
      if (!existing) {
        logsToCreate.push({
          userId: worker.id,
          taskId: task.id,
          stageName: 'Invoys',
          amount: new Prisma.Decimal(WORKER_PAYMENT),
        });
      } else if (existing.amount !== WORKER_PAYMENT) {
        logsToUpdate.push({ id: existing.id });
      }
    }
  }
  
  console.log(`Yaratish kerak: ${logsToCreate.length} ta yozuv`);
  console.log(`Yangilash kerak: ${logsToUpdate.length} ta yozuv\n`);
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  // Yozuvlarni batch'lar bilan yaratish
  const BATCH_SIZE = 500;
  for (let i = 0; i < logsToCreate.length; i += BATCH_SIZE) {
    const batch = logsToCreate.slice(i, i + BATCH_SIZE);
    try {
      await prisma.kpiLog.createMany({
        data: batch,
        skipDuplicates: true,
      });
      created += batch.length;
      console.log(`  Yaratildi: ${created}/${logsToCreate.length} ta yozuv...`);
    } catch (error: any) {
      console.error(`  [ERROR] Batch ${i}-${i + batch.length}: ${error.message}`);
      errors++;
    }
  }
  
  // Amount'larni yangilash
  if (logsToUpdate.length > 0) {
    for (const log of logsToUpdate) {
      try {
        await prisma.kpiLog.update({
          where: { id: log.id },
          data: {
            amount: new Prisma.Decimal(WORKER_PAYMENT),
          },
        });
        updated++;
      } catch (error: any) {
        console.error(`  [ERROR] Update ${log.id}: ${error.message}`);
        errors++;
      }
    }
  }
  
  console.log('\n=== Natijalar ===');
  console.log(`Yaratildi: ${created}`);
  console.log(`Yangilandi: ${updated}`);
  console.log(`Xatolar: ${errors}`);
  
  // Workers bo'yicha final statistika
  console.log('\nWorkers bo\'yicha final statistika:');
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
    const expected = tasks.length * WORKER_PAYMENT;
    console.log(`  ${worker.name}: ${workerLogs.length} ta yozuv, Jami: ${total}$ (Kutilgan: ${expected}$)`);
  }
}

ensureAllKpiLog()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

