import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';

// CodeChef has no public user-profile API, so this reads the public profile page
// (https://www.codechef.com/users/<handle>) and extracts the stats embedded in it.
// Global/country rank are filled in by the browser after load, so they are not in the page.
// If CodeChef changes that page, parseCodeChefProfile() is the one place to update.
const PROFILE_URL = 'https://www.codechef.com/users';
const USERNAME_RE = /^[A-Za-z0-9_.]{1,40}$/;
const RECENT_URL = 'https://www.codechef.com/recent/user';
const RECENT_PAGES = 2; // ~13 submissions per page, newest first
const MAX_RECENT = 25;
const IST_OFFSET = '+05:30'; // CodeChef shows contest end times in IST

export function normalizeCodeChefUsername(username) {
  const value = typeof username === 'string' ? username.trim() : '';
  if (!value) throw ApiError.badRequest('CodeChef username is required');
  if (!USERNAME_RE.test(value)) throw ApiError.badRequest('That is not a valid CodeChef username');
  return value;
}

export async function fetchCodeChefProfile(username, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(`${PROFILE_URL}/${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlgoVault/1.0)', Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw ApiError.badRequest('Unable to reach CodeChef right now');
  }
  // An unknown username redirects to the CodeChef home page instead of a 404.
  if (response.url && !response.url.includes('/users/')) throw ApiError.badRequest('User not found on CodeChef');
  if (!response.ok) throw ApiError.badRequest('CodeChef request failed');
  return response.text();
}

const toInt = (v) => {
  const n = parseInt(String(v ?? '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};
const clean = (v) => (v ? v.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() : null);

// Pure: profile HTML -> the fields stored in cc_stats. Tested without network.
export function parseCodeChefProfile(html) {
  if (!html.includes('user-details-container')) throw ApiError.badRequest('User not found on CodeChef');

  const header = html.match(/<div class="rating-header text-center">([\s\S]*?)<\/div>\s*<div class="rating-ranks">/);
  const block = header ? header[1] : '';
  const rating = toInt(block.match(/class="rating-number">\s*(\d+)\s*</)?.[1]);
  const stars = (block.match(/&#9733;/g) || []).length;
  const division = block.match(/<div>\(([^)]*Div[^)]*)\)<\/div>/)?.[1] ?? null;
  const highestRating = toInt(html.match(/Highest Rating\s*(\d+)/)?.[1]);

  let history = [];
  try {
    const raw = html.match(/var all_rating\s*=\s*(\[[\s\S]*?\]);/)?.[1];
    history = raw ? JSON.parse(raw) : [];
  } catch {
    history = [];
  }

  return {
    rating,
    highestRating,
    stars,
    division,
    totalSolved: toInt(html.match(/Total Problems Solved:\s*(\d+)/)?.[1]) ?? 0,
    contestHistory: history
      .map((c) => ({
        code: c.code,
        title: c.name || c.code,
        rating: toInt(c.rating) ?? 0,
        rank: toInt(c.rank),
        at: c.end_date ? new Date(`${String(c.end_date).replace(' ', 'T')}${IST_OFFSET}`).toISOString() : null,
      }))
      .filter((c) => c.at),
    profile: {
      name: clean(html.match(/<h1 class="h2-style">([^<]*)<\/h1>/)?.[1]),
      avatar: html.match(/class='profileImage' src='([^']+)'/)?.[1] ?? null,
      country: clean(html.match(/class="user-country-name"[^>]*>([^<]*)</)?.[1]),
    },
  };
}

// "11:49 PM 10/09/25" (hh:mm AM/PM dd/mm/yy, IST) -> ISO string, or null if unparseable.
function parseCodeChefTime(text) {
  const m = String(text || '').match(/(\d{1,2}):(\d{2}) ([AP]M) (\d{2})\/(\d{2})\/(\d{2})/);
  if (!m) return null;
  let hour = parseInt(m[1], 10) % 12;
  if (m[3] === 'PM') hour += 12;
  const iso = `20${m[6]}-${m[5]}-${m[4]}T${String(hour).padStart(2, '0')}:${m[2]}:00${IST_OFFSET}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Pure: HTML table from /recent/user -> submissions, newest first.
export function parseCodeChefRecent(html) {
  const rows = String(html || '').match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  const out = [];
  for (const row of rows) {
    const time = row.match(/<td\s+title='([^']*\d\d:\d\d [AP]M[^']*)'/)?.[1];
    const link = row.match(/<a href='(\/[^']*problems\/([^'/]+))'/);
    if (!time || !link) continue; // header row or malformed
    out.push({
      problem: link[2],
      url: `https://www.codechef.com${link[1]}`,
      status: row.match(/<span title='([^']*)'\s*style=/)?.[1] || 'unknown',
      score: toInt(row.match(/<td\s+title='\((\d+)\)'/)?.[1]),
      language: clean(row.match(/<td\s+title='([^']*)'>[^<]*<\/td><td class="centered"/)?.[1]),
      at: parseCodeChefTime(time),
      solutionUrl: row.match(/href='(\/viewsolution\/\d+)'/)?.[1] ? `https://www.codechef.com${row.match(/href='(\/viewsolution\/\d+)'/)[1]}` : null,
    });
  }
  return out;
}

// Best effort: recent submissions are a bonus, so any failure just yields an empty list.
export async function fetchCodeChefRecent(handle, fetchImpl = fetch) {
  const all = [];
  for (let page = 0; page < RECENT_PAGES; page++) {
    const response = await fetchImpl(`${RECENT_URL}?page=${page}&user_handle=${encodeURIComponent(handle)}&_=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlgoVault/1.0)', 'X-Requested-With': 'XMLHttpRequest', Referer: `${PROFILE_URL}/${handle}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) break;
    const batch = parseCodeChefRecent((await response.json()).content);
    all.push(...batch);
    if (batch.length === 0) break;
  }
  return all.slice(0, MAX_RECENT);
}

export async function syncCodeChef(userId, username, fetchImpl) {
  const handle = normalizeCodeChefUsername(username);
  const stats = parseCodeChefProfile(await fetchCodeChefProfile(handle, fetchImpl));
  const recent = await fetchCodeChefRecent(handle, fetchImpl).catch(() => []);
  const syncedAt = new Date();

  const row = await prisma.ccStats.upsert({
    where: { userId },
    create: { userId, handle, ...stats, recent, syncedAt },
    update: { handle, ...stats, recent, syncedAt },
  });
  await prisma.user.updateMany({
    where: { id: userId, OR: [{ ccHandle: null }, { NOT: { ccHandle: handle } }] },
    data: { ccHandle: handle },
  });
  return row;
}

export async function disconnectCodeChef(userId) {
  await prisma.ccStats.deleteMany({ where: { userId } });
  await prisma.user.update({ where: { id: userId }, data: { ccHandle: null } });
}
