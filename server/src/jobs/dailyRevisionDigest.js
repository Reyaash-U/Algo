import { prisma } from '../config/db.js';
import { sendEmail } from '../utils/mailer.js';

/**
 * Daily cron job to email users a digest of their due revisions.
 * Queries users with pending revisions where nextReviewAt <= now,
 * and sends one email per user listing their due notes.
 */
export async function dailyRevisionDigest() {
  const now = new Date();
  const batchSize = 100;
  let lastId = null;
  let sentCount = 0;
  let failCount = 0;

  console.log(`[cron] Starting dailyRevisionDigest at ${now.toISOString()}`);

  try {
    while (true) {
      // Keyset pagination on User ID for memory safety
      const users = await prisma.user.findMany({
        where: {
          ...(lastId ? { id: { gt: lastId } } : {}),
          revisions: {
            some: {
              nextReviewAt: { lte: now },
              note: { deletedAt: null },
            },
          },
        },
        include: {
          revisions: {
            where: {
              nextReviewAt: { lte: now },
              note: { deletedAt: null },
            },
            include: {
              note: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { id: 'asc' },
        take: batchSize,
      });

      if (users.length === 0) {
        break;
      }

      for (const user of users) {
        const dueCount = user.revisions.length;
        if (dueCount === 0) {
          lastId = user.id;
          continue;
        }

        try {
          const subject = `${dueCount} ${dueCount === 1 ? 'problem' : 'problems'} due today`;
          const text = `Hi ${user.displayName},\n\nYou have ${dueCount} revision ${dueCount === 1 ? 'item' : 'items'} due today on AlgoVault:\n\n` +
            user.revisions.map((r) => `- ${r.note?.title ?? 'Untitled Note'}`).join('\n') +
            `\n\nHappy practicing!\n- The AlgoVault Team`;

          const html = `<p>Hi ${user.displayName},</p>` +
            `<p>You have <strong>${dueCount}</strong> revision ${dueCount === 1 ? 'item' : 'items'} due today on AlgoVault:</p>` +
            `<ul>` +
            user.revisions.map((r) => `<li>${r.note?.title ?? 'Untitled Note'}</li>`).join('') +
            `</ul>` +
            `<p>Happy practicing!<br>- The AlgoVault Team</p>`;

          await sendEmail({
            to: user.email,
            subject,
            text,
            html,
          });

          sentCount++;
        } catch (err) {
          console.error(`[cron] Failed to send daily digest email to user ${user.id} (${user.email}):`, err);
          failCount++;
        }

        lastId = user.id;
      }
    }

    console.log(`[cron] dailyRevisionDigest complete. Sent: ${sentCount}, Failed: ${failCount}`);
  } catch (err) {
    console.error(`[cron] Critical error in dailyRevisionDigest job:`, err);
  }
}
