import { PrismaClient } from '@prisma/client';
import { calculateTaskStatus } from '../src/services/task-status';

const prisma = new PrismaClient();

async function checkTaskStatuses() {
  // Bir nechta task'ni olish
  const tasks = await prisma.task.findMany({
    take: 5,
    include: {
      stages: {
        select: {
          name: true,
          status: true,
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
  
  console.log(`Tekshirilayotgan task'lar: ${tasks.length}\n`);
  
  for (const task of tasks) {
    const calculatedStatus = await calculateTaskStatus(prisma, task.id);
    
    console.log(`Task ${task.id}: ${task.title.substring(0, 40)}...`);
    console.log(`  Database status: ${task.status}`);
    console.log(`  Calculated status: ${calculatedStatus}`);
    console.log(`  Match: ${task.status === calculatedStatus ? 'YES' : 'NO'}`);
    
    // Pochta stage'ini tekshirish
    const pochtaStage = task.stages.find(s => s.name === 'Pochta');
    if (pochtaStage) {
      console.log(`  Pochta stage: ${pochtaStage.status}`);
    } else {
      console.log(`  Pochta stage: NOT FOUND`);
    }
    
    console.log();
  }
  
  // YAKUNLANDI statusidagi task'lar sonini tekshirish
  const yakunlandiCount = await prisma.task.count({
    where: { status: 'YAKUNLANDI' },
  });
  
  console.log(`\nYAKUNLANDI statusidagi task'lar: ${yakunlandiCount}`);
  
  // Pochta stage'i TAYYOR bo'lgan task'lar sonini tekshirish
  const pochtaReadyTasks = await prisma.taskStage.count({
    where: {
      name: 'Pochta',
      status: 'TAYYOR',
    },
  });
  
  console.log(`Pochta stage'i TAYYOR bo'lgan task'lar: ${pochtaReadyTasks}`);
}

checkTaskStatuses()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

