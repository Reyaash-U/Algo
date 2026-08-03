import cron from 'node-cron';
import { dailyRevisionDigest } from './dailyRevisionDigest.js';
import { cfAutoSync } from './cfAutoSync.js';
import { isDev } from '../config/env.js';

// All scheduled jobs registered in one place. In-process cron (fine for Render
// free tier; note the cold-start tradeoff in docs/DEPLOYMENT.md).
export function registerCronJobs() {
  if (isDev) {
    console.log('[cron] jobs registered (dev: not firing on schedule)');
  }
  // 08:00 daily — email users their due-revision digest.
  cron.schedule('0 8 * * *', dailyRevisionDigest);
  // 03:00 daily — refresh Codeforces stats for users with a handle.
  cron.schedule('0 3 * * *', cfAutoSync);
}
