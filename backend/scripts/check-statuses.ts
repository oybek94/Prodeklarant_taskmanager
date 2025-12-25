import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatuses() {
  const result = await prisma.$queryRaw<Array<{ count: bigint; status: string }>>`
    SELECT COUNT(*)::int as count, status::text as status
    FROM "Task"
    GROUP BY status
    ORDER BY status
  `;
  
  console.log('Task status distribution:');
  for (const row of result) {
    console.log(`  ${row.status}: ${row.count}`);
  }
  
  const yakunlandi = await prisma.task.count({
    where: { status: 'YAKUNLANDI' },
  });
  
  console.log(`\nYAKUNLANDI status'dagi task'lar: ${yakunlandi}`);
}

checkStatuses()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

