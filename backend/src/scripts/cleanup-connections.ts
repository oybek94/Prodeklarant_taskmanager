import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  // 1. Count active connections
  const countResult: any[] = await prisma.$queryRaw`
    SELECT count(*)::int as cnt FROM pg_stat_activity WHERE datname = current_database()
  `;
  console.log('Active connections:', countResult[0]?.cnt);

  // 2. Show details
  const details: any[] = await prisma.$queryRaw`
    SELECT pid, usename, application_name, client_addr::text, state, query_start
    FROM pg_stat_activity
    WHERE datname = current_database()
    ORDER BY query_start DESC NULLS LAST
    LIMIT 30
  `;
  console.log('\nConnection details:');
  for (const d of details) {
    console.log(`  PID=${d.pid} user=${d.usename} app=${d.application_name} addr=${d.client_addr} state=${d.state}`);
  }

  // 3. Terminate idle connections (not our own)
  const terminated: any[] = await prisma.$queryRaw`
    SELECT pg_terminate_backend(pid), pid, state, client_addr::text
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid != pg_backend_pid()
      AND state IN ('idle', 'idle in transaction', 'idle in transaction (aborted)')
  `;
  console.log(`\nTerminated ${terminated.length} idle connections`);

  // 4. Recount
  const afterCount: any[] = await prisma.$queryRaw`
    SELECT count(*)::int as cnt FROM pg_stat_activity WHERE datname = current_database()
  `;
  console.log('Connections after cleanup:', afterCount[0]?.cnt);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
