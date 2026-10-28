import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { isValidTimezone } from './submissionService.js';

const DAY_MS = 86400000;

// Direct profile edits (displayName, cfHandle) — distinct from the cfHandle
// write inside cfSyncService, which only sets it as a side effect of a
// successful sync. This lets a user clear/change it without syncing.
export async function updateProfile(userId, data = {}) {
  if (data.timezone !== undefined && !isValidTimezone(data.timezone)) {
    throw ApiError.badRequest('timezone must be a valid IANA timezone');
  }
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
        ...(data.cfHandle !== undefined ? { cfHandle: data.cfHandle } : {}),
        ...(data.digestEnabled !== undefined ? { digestEnabled: data.digestEnabled } : {}),
        ...(data.digestHour !== undefined ? { digestHour: data.digestHour } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      },
    });
  } catch (err) {
    if (err.code === 'P2025') throw ApiError.notFound('User not found');
    throw err;
  }
}

function startOfUTCDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// Call whenever a user does something that should count toward their daily
// streak (currently: submitting a revision review). Same-day calls are a
// no-op; a gap of exactly one day extends the streak; any bigger gap (or no
// prior activity) resets it to 1.
export async function recordActivity(userId, at = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakCurrent: true, streakLongest: true, streakLastActiveDate: true },
  });
  if (!user) return null;

  const daysSincePrevious = user.streakLastActiveDate
    ? (startOfUTCDay(at) - startOfUTCDay(user.streakLastActiveDate)) / DAY_MS
    : null;

  if (daysSincePrevious === 0) return user;

  const streakCurrent = daysSincePrevious === 1 ? user.streakCurrent + 1 : 1;
  const streakLongest = Math.max(user.streakLongest, streakCurrent);

  return prisma.user.update({
    where: { id: userId },
    data: { streakCurrent, streakLongest, streakLastActiveDate: at },
    select: { streakCurrent: true, streakLongest: true, streakLastActiveDate: true },
  });
}
