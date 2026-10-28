import { prisma } from '../config/db.js';
import { recordActivity } from './userService.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates whether a string is a valid IANA timezone.
 */
export function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  if (!/^[a-zA-Z0-9_\-+/\\]+$/.test(tz)) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a Date object as YYYY-MM-DD in the specified timezone.
 */
export function formatDateInTimezone(date, tz = 'UTC') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Generates an array of all calendar date strings (YYYY-MM-DD) from fromStr to toStr (inclusive).
 * Uses pure UTC calendar date arithmetic to correctly handle leap years, month boundaries,
 * and year boundaries without DST shifts.
 */
export function generateDateSequence(fromStr, toStr) {
  const days = [];
  const [startY, startM, startD] = fromStr.split('-').map(Number);
  const [endY, endM, endD] = toStr.split('-').map(Number);

  const cur = new Date(Date.UTC(startY, startM - 1, startD));
  const end = new Date(Date.UTC(endY, endM - 1, endD));

  while (cur <= end) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cur.getUTCDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return days;
}

/**
 * Records a new submission for a user.
 */
export async function createSubmission(userId, {
  problemId = null,
  noteId = null,
  status = 'accepted',
  language = null,
  code = '',
  submittedAt = new Date(),
} = {}) {
  const at = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);

  const [submission] = await Promise.all([
    prisma.submission.create({
      data: {
        userId,
        problemId,
        noteId,
        status,
        language,
        code,
        submittedAt: at,
      },
    }),
    recordActivity(userId, at),
  ]);

  return submission;
}

/**
 * Retrieves daily aggregated submission counts for a given user and date range.
 *
 * @param {string} userId
 * @param {{ from?: string, to?: string, tz?: string }} options
 * @returns {Promise<{ from: string, to: string, total: number, days: Array<{ date: string, count: number }> }>}
 */
export async function getDailySubmissionCounts(userId, { from, to, tz = 'UTC' } = {}) {
  const safeTz = isValidTimezone(tz) ? tz : 'UTC';

  const now = new Date();
  let toStr = to && DATE_REGEX.test(to) ? to : formatDateInTimezone(now, safeTz);

  let fromStr = from && DATE_REGEX.test(from) ? from : null;
  if (!fromStr) {
    // Default to 365 days before toStr
    const [tY, tM, tD] = toStr.split('-').map(Number);
    const fromDate = new Date(Date.UTC(tY, tM - 1, tD));
    fromDate.setUTCDate(fromDate.getUTCDate() - 365);
    const fY = fromDate.getUTCFullYear();
    const fM = String(fromDate.getUTCMonth() + 1).padStart(2, '0');
    const fD = String(fromDate.getUTCDate()).padStart(2, '0');
    fromStr = `${fY}-${fM}-${fD}`;
  }

  // Ensure fromStr <= toStr
  if (fromStr > toStr) {
    const tmp = fromStr;
    fromStr = toStr;
    toStr = tmp;
  }

  // Database aggregation query grouped by date in the specified timezone
  const rows = await prisma.$queryRaw`
    SELECT
      TO_CHAR("submittedAt" AT TIME ZONE ${safeTz}, 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS count
    FROM "submissions"
    WHERE "userId" = ${userId}
      AND ("submittedAt" AT TIME ZONE ${safeTz}) >= (${fromStr} || ' 00:00:00')::timestamp
      AND ("submittedAt" AT TIME ZONE ${safeTz}) <= (${toStr} || ' 23:59:59.999')::timestamp
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const countsByDate = new Map();
  for (const row of rows) {
    countsByDate.set(row.date, row.count);
  }

  // Build the complete contiguous sequence including days with 0 submissions
  const allDays = generateDateSequence(fromStr, toStr);
  let total = 0;
  const days = allDays.map((date) => {
    const count = countsByDate.get(date) || 0;
    total += count;
    return { date, count };
  });

  return {
    from: fromStr,
    to: toStr,
    total,
    days,
  };
}
