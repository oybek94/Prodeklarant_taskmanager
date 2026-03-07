import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkKpiLog() {
  const logs = await prisma.kpiLog.findMany({
    take: 10,
    include: {
      user: { select: { name: true } },
      task: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  console.log('Oxirgi 10 ta KpiLog yozuvi:');
  logs.forEach(log => {
    console.log(`  - ${log.user.name}: ${log.amount}$ (Task: ${log.task.title.substring(0, 30)}..., Stage: ${log.stageName})`);
  });
  
  const count = await prisma.kpiLog.count();
  console.log(`\nJami KpiLog yozuvlari: ${count}`);
  
  // Workers bo'yicha guruhlash
  const workers = await prisma.user.findMany({
    where: { name: { in: ['Abdukamol', 'Ahadbek', 'Hakimjon'] } },
    select: { id: true, name: true },
  });
  
  console.log('\nIshchilar bo\'yicha KpiLog:');
  for (const worker of workers) {
    const workerLogs = await prisma.kpiLog.findMany({
      where: { userId: worker.id },
    });
    const total = workerLogs.reduce((sum, log) => sum + Number(log.amount), 0);
    console.log(`  ${worker.name}: ${workerLogs.length} ta yozuv, Jami: ${total}$`);
  }
}

checkKpiLog()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

