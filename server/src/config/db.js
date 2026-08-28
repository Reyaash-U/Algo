import { PrismaClient } from '@prisma/client';
import { isDev } from './env.js';

// Single Prisma Client instance for the whole app.
// Cache it on the global object in development to prevent hot-reloading from
// exhausting the database connection pool (EMAXCONNSESSION).
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: isDev ? ['warn', 'error'] : ['error'],
});

if (isDev) globalForPrisma.prisma = prisma;

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('[db] connected (postgres via prisma)');
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    process.exit(1);
  }
}

export async function disconnectDB() {
  await prisma.$disconnect();
}
