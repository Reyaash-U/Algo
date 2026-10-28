// Pure helpers for the daily revision digest: per-user local-time scheduling,
// idle detection, and safe email rendering. No DB or clock access, so they
// are trivially unit-testable (see tests/digestSchedule.test.js).

export const IDLE_DAYS = 30; // stop emailing users who have been inactive this long
export const MAX_TITLES = 10; // list at most this many notes in one email

const DAY_MS = 86400000;

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// Local calendar date (YYYY-MM-DD) and hour (0-23) of `date` in an IANA timezone.
// An unknown timezone falls back to UTC rather than throwing.
export function localParts(date, timeZone = 'UTC') {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
  } catch {
    return localParts(date, 'UTC');
  }
  const get = (type) => parts.find((p) => p.type === type).value;
  return { dateStr: `${get('year')}-${get('month')}-${get('day')}`, hour: parseInt(get('hour'), 10) };
}

// True when the user's digest should go out now: they have it enabled, their
// local time has reached `digestHour`, and nothing was sent yet on their local
// day. Because it is `>=` (not `==`), a missed run (sleeping host, failed send)
// is caught up by the next hourly run the same day.
export function isDigestDue(user, now = new Date()) {
  if (!user.digestEnabled) return false;
  const tz = user.timezone || 'UTC';
  const { dateStr, hour } = localParts(now, tz);
  if (hour < (user.digestHour ?? 8)) return false;
  if (user.lastDigestAt && localParts(new Date(user.lastDigestAt), tz).dateStr === dateStr) return false;
  return true;
}

// Idle = no recorded activity (reviews/notes update the streak date) for IDLE_DAYS.
export function isIdle(user, now = new Date(), days = IDLE_DAYS) {
  const last = user.streakLastActiveDate ?? user.createdAt;
  if (!last) return false;
  return now.getTime() - new Date(last).getTime() > days * DAY_MS;
}

export function buildDigestEmail({ displayName, titles, appUrl }) {
  const count = titles.length;
  const noun = count === 1 ? 'item' : 'items';
  const shown = titles.slice(0, MAX_TITLES).map((t) => t || 'Untitled Note');
  const more = count - shown.length;
  const reviseUrl = `${appUrl}/revise`;
  const settingsUrl = `${appUrl}/settings`;

  const subject = `${count} ${count === 1 ? 'problem' : 'problems'} due for revision`;
  const text =
    `Hi ${displayName},\n\nYou have ${count} revision ${noun} due on AlgoVault:\n\n` +
    shown.map((t) => `- ${t}`).join('\n') +
    (more > 0 ? `\n...and ${more} more` : '') +
    `\n\nStart revising: ${reviseUrl}\n\n` +
    `You can turn these emails off or change the time in Settings: ${settingsUrl}\n\n- The AlgoVault Team`;
  const html =
    `<p>Hi ${escapeHtml(displayName)},</p>` +
    `<p>You have <strong>${count}</strong> revision ${noun} due on AlgoVault:</p>` +
    `<ul>${shown.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` +
    (more > 0 ? `<p>...and ${more} more</p>` : '') +
    `<p><a href="${escapeHtml(reviseUrl)}">Start revising</a></p>` +
    `<p style="color:#666;font-size:12px">Turn these emails off or change the time in ` +
    `<a href="${escapeHtml(settingsUrl)}">Settings</a>.<br>- The AlgoVault Team</p>`;
  return { subject, text, html };
}
