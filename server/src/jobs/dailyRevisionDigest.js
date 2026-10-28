import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { sendEmail } from '../utils/mailer.js';
import { isDigestDue, isIdle, buildDigestEmail } from '../utils/digestSchedule.js';

/**
 * Hourly cron job (see jobs/index.js) that emails users their due revisions.
 *
 * Each user chooses whether they want it (digestEnabled), the local hour
 * (digestHour) and their timezone. A user gets at most one digest per local
 * day, sent by the first hourly run at or after their hour — so a run missed
 * by a sleeping host is caught up on the next one. Users with no activity for
 * 30 days are skipped.
 */
export async function dailyRevisionDigest() {
  const now = new Date();
  const batchSize = 100;
  let lastId = null;
  let sentCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  console.log(`[cron] Starting dailyRevisionDigest at ${now.toISOString()}`);

  try {
    while (true) {
      // Keyset pagination on User ID for memory safety
      const users = await prisma.user.findMany({
        where: {
          ...(lastId ? { id: { gt: lastId } } : {}),
          digestEnabled: true,
          emailVerified: true,
          revisions: {
            some: { nextReviewAt: { lte: now }, note: { deletedAt: null } },
          },
        },
        include: {
          revisions: {
            where: { nextReviewAt: { lte: now }, note: { deletedAt: null } },
            include: { note: { select: { title: true } } },
          },
        },
        orderBy: { id: 'asc' },
        take: batchSize,
      });

      if (users.length === 0) break;

      for (const user of users) {
        lastId = user.id;

        if (!isDigestDue(user, now) || isIdle(user, now) || user.revisions.length === 0) {
          skippedCount++;
          continue;
        }

        try {
          const email = buildDigestEmail({
            displayName: user.displayName,
            titles: user.revisions.map((r) => r.note?.title),
            appUrl: env.APP_URL,
          });
          const result = await sendEmail({ to: user.email, ...email });

          // A mock send (no SMTP configured) delivered nothing, so don't mark it sent.
          if (!result?.mock) {
            await prisma.user.update({ where: { id: user.id }, data: { lastDigestAt: now } });
          }
          sentCount++;
        } catch (err) {
          console.error(`[cron] Failed to send daily digest email to user ${user.id}:`, err);
          failCount++;
        }
      }
    }

    console.log(`[cron] dailyRevisionDigest complete. Sent: ${sentCount}, Skipped: ${skippedCount}, Failed: ${failCount}`);
  } catch (err) {
    console.error(`[cron] Critical error in dailyRevisionDigest job:`, err);
  }
}
