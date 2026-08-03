import { prisma } from '../config/db.js';
import { syncCodeforces } from '../services/cfSyncService.js';

/**
 * Daily cron job to sync Codeforces stats for users with a handle.
 * Respects rate limits by spacing out API calls to Codeforces (~2 seconds per call).
 */
export async function cfAutoSync() {
  console.log('[cron] Starting cfAutoSync job');
  let processed = 0;
  let successful = 0;
  let failed = 0;

  try {
    const users = await prisma.user.findMany({
      where: {
        cfHandle: { not: null },
      },
      select: {
        id: true,
        cfHandle: true,
      },
    });

    console.log(`[cron] Found ${users.length} user(s) with Codeforces handles to sync.`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      // Codeforces rate-limit spacing: 2 seconds delay between user sync requests
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      try {
        console.log(`[cron] Syncing Codeforces stats for user ${user.id} (handle: ${user.cfHandle})`);
        await syncCodeforces(user.id, user.cfHandle);
        successful++;
      } catch (err) {
        console.error(`[cron] Failed to sync Codeforces stats for user ${user.id} (handle: ${user.cfHandle}):`, err.message);
        failed++;
      }
      processed++;
    }

    console.log(`[cron] cfAutoSync complete. Processed: ${processed}, Successful: ${successful}, Failed: ${failed}`);
  } catch (err) {
    console.error('[cron] Critical error in cfAutoSync job:', err);
  }
}
