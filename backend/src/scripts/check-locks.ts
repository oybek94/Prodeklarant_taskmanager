import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking active connections...');
    const activity: any[] = await prisma.$queryRaw`
      SELECT pid, state, query, backend_start
      FROM pg_stat_activity
      WHERE datname = 'prodeklarant' AND pid <> pg_backend_pid();
    `;
    console.log('Active connections:', JSON.stringify(activity, null, 2));

    console.log('Checking for advisory locks...');
    const locks: any[] = await prisma.$queryRaw`
      SELECT * FROM pg_locks WHERE locktype = 'advisory';
    `;
    console.log('Advisory locks:', JSON.stringify(locks, null, 2));

  } catch (error) {
    console.error('Error checking DB status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
