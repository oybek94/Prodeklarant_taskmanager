import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEncoding() {
  const tasks = await prisma.task.findMany({
    where: {
      id: { in: [37, 31, 43, 127, 79, 109, 72, 73, 34, 85, 71, 28, 60, 65] },
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      id: 'asc',
    },
  });
  
  console.log('Muammoli task\'lar (encoding tekshiruvi):\n');
  tasks.forEach(task => {
    // Encoding muammosini tekshirish
    const hasIssue = task.title.includes('') || task.title.includes('') || task.title.includes('');
    const status = hasIssue ? '[ISSUE]' : '[OK]';
    console.log(`${status} Task ${task.id}: "${task.title}"`);
  });
}

verifyEncoding()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

