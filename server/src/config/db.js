import { PrismaClient } from '@prisma/client';
import { isDev } from './env.js';

// Single Prisma Client instance for the whole app (per Prisma's own
// guidance — don't instantiate one per request).
export const prisma = new PrismaClient({
  log: isDev ? ['warn', 'error'] : ['error'],
});

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
