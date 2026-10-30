import cron from 'node-cron';
import { dailyRevisionDigest } from './dailyRevisionDigest.js';
import { cfAutoSync } from './cfAutoSync.js';
import { lcAutoSync } from './lcAutoSync.js';
import { ccAutoSync } from './ccAutoSync.js';
import { env, isDev } from '../config/env.js';

// All scheduled jobs registered in one place. They run in-process, so the
// server must be awake when they fire. The digest is hourly and idempotent
// per user per local day, so a missed run is caught up by the next one, but
// a host that sleeps all day (e.g. a free tier) still won't send anything —
// use an always-on host or ping the server regularly.
export function registerCronJobs() {
  if (isDev && !env.ENABLE_CRON) {
    console.log('[cron] skipped in dev — set ENABLE_CRON=true to run jobs locally');
    return;
  }
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    console.warn('[cron] SMTP_HOST / SMTP_USER not set — revision digests will only be logged, not emailed');
  }
  // Hourly — email each user their due-revision digest at their chosen local hour.
  cron.schedule('0 * * * *', dailyRevisionDigest);
  // 03:00 daily — refresh Codeforces stats for users with a handle.
  cron.schedule('0 3 * * *', cfAutoSync);
  // 03:30 daily — refresh LeetCode stats for users with a username.
  cron.schedule('30 3 * * *', lcAutoSync);
  // 03:45 daily — refresh CodeChef stats for users with a username.
  cron.schedule('45 3 * * *', ccAutoSync);
  console.log('[cron] jobs registered');
}
