/**
 * Import qilingan tasklar uchun KpiLog yozuvlarini qayta yaratish
 * Har bir task uchun 3 ta worker'ga $5 qo'shadi
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const WORKER_NAMES = ['Abdukamol', 'Ahadbek', 'Hakimjon'];
const WORKER_PAYMENT = 5;

async function fixKpiLog() {
  console.log('Import qilingan tasklar uchun KpiLog yozuvlarini tekshirish va qayta yaratish...\n');
  
  // Workers'ni topish
  const workers = await prisma.user.findMany({
    where: { name: { in: WORKER_NAMES } },
    select: { id: true, name: true },
  });
  
  if (workers.length !== 3) {
    console.error(`Xatolik: ${workers.length} ta worker topildi, 3 ta bo'lishi kerak`);
    console.log('Topilgan workers:', workers.map(w => w.name).join(', '));
    return;
  }
  
  console.log(`Workers topildi: ${workers.map(w => w.name).join(', ')}\n`);
  
  // Oltiariq branch'dagi barcha tasklarni topish
  const branch = await prisma.branch.findFirst({
    where: { name: 'Oltiariq' },
  });
  
  if (!branch) {
    console.error('Oltiariq branch topilmadi');
    return;
  }
  
  // 2025 yil tasklarini topish (createdAt 2025 yil)
  const tasks = await prisma.task.findMany({
    where: {
      branchId: branch.id,
      createdAt: {
        gte: new Date('2025-01-01'),
        lt: new Date('2026-01-01'),
      },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });
  
  console.log(`Topildi: ${tasks.length} ta task\n`);
  
  let fixed = 0;
  let alreadyExists = 0;
  let errors = 0;
  
  for (const task of tasks) {
    try {
      // Har bir worker uchun KpiLog yozuvini tekshirish
      let needsFix = false;
      const existingLogs: number[] = [];
      
      for (const worker of workers) {
        const existingLog = await prisma.kpiLog.findFirst({
          where: {
            userId: worker.id,
            taskId: task.id,
            stageName: 'Invoys',
            amount: WORKER_PAYMENT,
          },
        });
        
        if (!existingLog) {
          needsFix = true;
        } else {
          existingLogs.push(worker.id);
        }
      }
      
      // Har bir worker uchun KpiLog yozuvini tekshirish va yaratish
      let taskFixed = false;
      await prisma.$transaction(async (tx) => {
        for (const worker of workers) {
          // Agar allaqachon mavjud bo'lmasa, yaratish
          const exists = await tx.kpiLog.findFirst({
            where: {
              userId: worker.id,
              taskId: task.id,
              stageName: 'Invoys',
              amount: WORKER_PAYMENT,
            },
          });
          
          if (!exists) {
            await tx.kpiLog.create({
              data: {
                userId: worker.id,
                taskId: task.id,
                stageName: 'Invoys',
                amount: new Prisma.Decimal(WORKER_PAYMENT),
              },
            });
            taskFixed = true;
          }
        }
      });
      
      if (taskFixed) {
        fixed++;
        if (fixed % 100 === 0) {
          console.log(`  Tuzatildi: ${fixed} ta task...`);
        }
      } else {
        alreadyExists++;
      }
    } catch (error: any) {
      console.error(`  [ERROR] Task ${task.id}: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n=== Natijalar ===');
  console.log(`Tuzatildi: ${fixed}`);
  console.log(`Allaqachon mavjud: ${alreadyExists}`);
  console.log(`Xatolar: ${errors}`);
  console.log(`Jami: ${tasks.length}`);
  
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
      },
    });
    const total = workerLogs.reduce((sum, log) => sum + Number(log.amount), 0);
    console.log(`  ${worker.name}: ${workerLogs.length} ta yozuv, Jami: ${total}$`);
  }
}

fixKpiLog()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

