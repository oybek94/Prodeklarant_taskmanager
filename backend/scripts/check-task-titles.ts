import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTaskTitles() {
  const tasks = await prisma.task.findMany({
    take: 10,
    select: {
      id: true,
      title: true,
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
  
  console.log('Task nomlari (encoding muammosi bilan):\n');
  tasks.forEach(task => {
    console.log(`Task ${task.id}: "${task.title}"`);
    console.log(`  Client: ${task.client.name}`);
    console.log();
  });
}

checkTaskTitles()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

