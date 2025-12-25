import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllTaskEncoding() {
  const tasks = await prisma.task.findMany({
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
      id: 'asc',
    },
  });
  
  console.log(`Jami ${tasks.length} ta task tekshirilmoqda...\n`);
  
  const problematicTasks: Array<{ id: number; title: string; client: string }> = [];
  
  tasks.forEach(task => {
    // Encoding muammosini tekshirish - "" yoki boshqa noto'g'ri belgilar bor bo'lsa
    if (task.title.includes('') || task.title.includes('')) {
      problematicTasks.push({
        id: task.id,
        title: task.title,
        client: task.client.name,
      });
    }
  });
  
  console.log(`Encoding muammosi bo'lgan task'lar: ${problematicTasks.length}\n`);
  
  if (problematicTasks.length > 0) {
    console.log('Muammoli task\'lar:');
    problematicTasks.forEach(task => {
      console.log(`  Task ${task.id}: "${task.title}" (Client: ${task.client})`);
    });
  } else {
    console.log('Barcha task\'lar to\'g\'ri encoding bilan!');
  }
}

checkAllTaskEncoding()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

