import { prisma } from '../config/db.js';
import { syncCodeChef } from '../services/codechefSyncService.js';

/**
 * Daily cron job to refresh CodeChef stats for users who connected a username.
 * Calls are spaced out so we stay polite to codechef.com.
 */
export async function ccAutoSync() {
  console.log('[cron] Starting ccAutoSync job');
  let successful = 0;
  let failed = 0;

  try {
    const users = await prisma.user.findMany({
      where: { ccHandle: { not: null } },
      select: { id: true, ccHandle: true },
    });

    for (let i = 0; i < users.length; i++) {
      if (i > 0) await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        await syncCodeChef(users[i].id, users[i].ccHandle);
        successful++;
      } catch (err) {
        console.error(`[cron] Failed to sync CodeChef stats for user ${users[i].id}:`, err.message);
        failed++;
      }
    }

    console.log(`[cron] ccAutoSync complete. Processed: ${users.length}, Successful: ${successful}, Failed: ${failed}`);
  } catch (err) {
    console.error('[cron] Critical error in ccAutoSync job:', err);
  }
}
