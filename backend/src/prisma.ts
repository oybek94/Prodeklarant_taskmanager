import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  // Increase default transaction timeout to 60 seconds
  // This prevents timeout errors during long-running operations like PDF processing
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

