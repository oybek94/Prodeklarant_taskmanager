/**
 * Import natijalarini tekshirish
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyImport() {
  console.log('Import natijalarini tekshirish...\n');
  
  // Bir nechta task'ni tekshirish
  const tasks = await prisma.task.findMany({
    take: 5,
    include: {
      stages: {
        include: {
          assignedTo: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          stageOrder: 'asc',
        },
      },
      client: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      id: 'desc',
    },
  });
  
  console.log(`Tekshirilayotgan task'lar: ${tasks.length}\n`);
  
  for (const task of tasks) {
    console.log(`Task: ${task.title}`);
    console.log(`Client: ${task.client.name}`);
    console.log(`Stages:`);
    
    for (const stage of task.stages) {
      const workerName = stage.assignedTo?.name || 'None';
      const status = stage.status;
      console.log(`  - ${stage.name}: ${workerName} (${status})`);
    }
    
    console.log();
  }
  
  // Umumiy statistika
  const totalTasks = await prisma.task.count();
  const totalStages = await prisma.taskStage.count();
  const assignedStages = await prisma.taskStage.count({
    where: {
      assignedToId: {
        not: null,
      },
    },
  });
  const readyStages = await prisma.taskStage.count({
    where: {
      status: 'TAYYOR',
    },
  });
  
  console.log('=== Umumiy statistika ===');
  console.log(`Jami task'lar: ${totalTasks}`);
  console.log(`Jami stage'lar: ${totalStages}`);
  console.log(`Assignment qilingan stage'lar: ${assignedStages}`);
  console.log(`Tayyor stage'lar: ${readyStages}`);
}

async function main() {
  try {
    await verifyImport();
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

