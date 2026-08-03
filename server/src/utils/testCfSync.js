import { prisma, connectDB, disconnectDB } from '../config/db.js';
import { cfAutoSync } from '../jobs/cfAutoSync.js';

async function test() {
  try {
    await connectDB();

    // 1. Find the seeded demo user
    const user = await prisma.user.findFirst({
      where: { email: 'demo@algovault.dev' },
    });

    if (!user) {
      console.error('Demo user demo@algovault.dev not found. Please seed the database first.');
      return;
    }

    // 2. Set a real Codeforces handle
    const handle = 'tourist';
    console.log(`Setting Codeforces handle "${handle}" for user ${user.id}...`);
    await prisma.user.update({
      where: { id: user.id },
      data: { cfHandle: handle },
    });

    // 3. Trigger auto-sync job
    await cfAutoSync();

    // 4. Retrieve and print updated stats
    const stats = await prisma.cfStats.findUnique({
      where: { userId: user.id },
    });

    console.log('\n--- Sync Verification Results ---');
    if (stats) {
      console.log(`Handle: ${stats.handle}`);
      console.log(`Current Rating: ${stats.currentRating}`);
      console.log(`Max Rating: ${stats.maxRating}`);
      console.log(`Solved tags count: ${Array.isArray(stats.solvedByTag) ? stats.solvedByTag.length : 0}`);
      console.log(`Synced At: ${stats.syncedAt}`);
    } else {
      console.error('No Codeforces stats row found for user!');
    }
  } catch (err) {
    console.error('Error during manual CF sync test:', err);
  } finally {
    await disconnectDB();
  }
}

test();
