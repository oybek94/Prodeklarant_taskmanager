/**
 * Script to terminate stale PostgreSQL connections
 * Run with: npx tsx src/scripts/reset-connections.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function resetConnections() {
  console.log('🔌 Attempting to terminate stale PostgreSQL connections...');
  
  // Create a fresh client with minimal connection pool
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    // Get current connection count
    const connections: any[] = await prisma.$queryRaw`
      SELECT pid, usename, application_name, state, query_start, state_change
      FROM pg_stat_activity 
      WHERE datname = current_database()
      AND pid != pg_backend_pid()
    `;
    
    console.log(`📊 Found ${connections.length} active connections:`);
    connections.forEach((conn: any) => {
      console.log(`  PID: ${conn.pid}, User: ${conn.usename}, State: ${conn.state}, App: ${conn.application_name}`);
    });

    // Terminate all other connections to this database
    const result: any[] = await prisma.$queryRaw`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = current_database()
      AND pid != pg_backend_pid()
      AND state != 'active'
    `;
    
    console.log(`✅ Terminated ${result.length} idle connections`);

    // Also terminate connections that have been idle for more than 30 seconds
    const staleResult: any[] = await prisma.$queryRaw`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
      AND pid != pg_backend_pid()
      AND state_change < NOW() - INTERVAL '30 seconds'
    `;

    console.log(`✅ Terminated ${staleResult.length} stale connections (idle > 30s)`);

    // Check remaining connections
    const remaining: any[] = await prisma.$queryRaw`
      SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
    `;
    console.log(`📊 Remaining connections: ${(remaining[0] as any).count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Script disconnected');
  }
}

resetConnections();
