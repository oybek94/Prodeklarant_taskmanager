import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyServerData() {
  const taskCount = await prisma.task.count();
  const tayyorStages = await prisma.taskStage.count({
    where: { status: 'TAYYOR' },
  });
  const duration90 = await prisma.taskStage.count({
    where: { durationMin: 90 },
  });
  const yakunlandiTasks = await prisma.task.count({
    where: { status: 'YAKUNLANDI' },
  });
  
  console.log('=== Server database statistikasi ===');
  console.log(`Jami task'lar: ${taskCount}`);
  console.log(`Tayyor stage'lar: ${tayyorStages}`);
  console.log(`90 daqiqa belgilangan stage'lar: ${duration90}`);
  console.log(`YAKUNLANDI status'dagi task'lar: ${yakunlandiTasks}`);
  
  // Bir nechta task'ni ko'rsatish
  const sampleTasks = await prisma.task.findMany({
    take: 3,
    include: {
      stages: {
        where: { status: 'TAYYOR' },
        take: 1,
        select: {
          name: true,
          durationMin: true,
          completedAt: true,
        },
      },
    },
    orderBy: { id: 'desc' },
  });
  
  console.log('\n=== Namuna task\'lar ===');
  for (const task of sampleTasks) {
    console.log(`\nTask ${task.id}: ${task.title.substring(0, 40)}...`);
    console.log(`  Status: ${task.status}`);
    if (task.stages.length > 0) {
      const stage = task.stages[0];
      console.log(`  Stage: ${stage.name}, Duration: ${stage.durationMin} daqiqa`);
      if (stage.completedAt) {
        console.log(`  Completed: ${stage.completedAt.toLocaleString('uz-UZ')}`);
      }
    }
  }
}

verifyServerData()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

