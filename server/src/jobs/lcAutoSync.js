import { prisma } from '../config/db.js';
import { syncLeetCode } from '../services/leetcodeSyncService.js';

/**
 * Daily cron job to refresh LeetCode stats for users who connected a username.
 * Calls are spaced out so we stay polite to LeetCode's public endpoint.
 */
export async function lcAutoSync() {
  console.log('[cron] Starting lcAutoSync job');
  let successful = 0;
  let failed = 0;

  try {
    const users = await prisma.user.findMany({
      where: { lcHandle: { not: null } },
      select: { id: true, lcHandle: true },
    });

    for (let i = 0; i < users.length; i++) {
      if (i > 0) await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        await syncLeetCode(users[i].id, users[i].lcHandle);
        successful++;
      } catch (err) {
        console.error(`[cron] Failed to sync LeetCode stats for user ${users[i].id}:`, err.message);
        failed++;
      }
    }

    console.log(`[cron] lcAutoSync complete. Processed: ${users.length}, Successful: ${successful}, Failed: ${failed}`);
  } catch (err) {
    console.error('[cron] Critical error in lcAutoSync job:', err);
  }
}
