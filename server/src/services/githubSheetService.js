import { ApiError } from '../utils/apiError.js';
import { createSheet } from './sheetService.js';
import { prisma } from '../config/db.js';
import { getLeetCodeCatalog, getCodeforcesCatalog } from './problemCatalogService.js';

// Only these hosts may be fetched. Anything else (localhost, cloud metadata
// addresses, arbitrary sites) is rejected so the import can't be used to make
// the server request internal or third-party URLs.
const ALLOWED_HOSTS = new Set(['github.com', 'www.github.com', 'raw.githubusercontent.com', 'gist.githubusercontent.com']);
const MAX_BYTES = 2 * 1024 * 1024; // README-sized files only
const MAX_ITEMS = 300;

/**
 * Resolves a GitHub repository or file URL into fetchable raw content URLs.
 * Throws a 400 for anything that is not a GitHub link.
 */
export function getRawGitHubUrls(inputUrl) {
  let urlStr = String(inputUrl ?? '').trim();
  if (!/^https?:\/\//i.test(urlStr)) urlStr = `https://${urlStr}`;

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw ApiError.badRequest('That is not a valid link');
  }
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    throw ApiError.badRequest('Only GitHub links are supported (github.com or raw.githubusercontent.com)');
  }

  // Already a raw URL — fetch it exactly (always over https).
  if (host.endsWith('githubusercontent.com')) {
    return [`https://${host}${parsed.pathname}${parsed.search}`];
  }

  const parts = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length < 2) throw ApiError.badRequest('Link to a repository, e.g. https://github.com/owner/repo');
  const [owner, repo] = parts;
  const base = (branch, path) => `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`.replace(/\/$/, '');
  const enc = (p) => p.map(encodeURIComponent).join('/');

  // github.com/owner/repo/blob/<branch>/<path/to/file>
  if (parts[2] === 'blob' && parts.length >= 5) {
    return [base(encodeURIComponent(parts[3]), enc(parts.slice(4)))];
  }
  // github.com/owner/repo/tree/<branch>[/<folder>] -> that folder's README
  if (parts[2] === 'tree' && parts.length >= 4) {
    const folder = parts.length > 4 ? `${enc(parts.slice(4))}/` : '';
    return ['README.md', 'readme.md'].map((name) => base(encodeURIComponent(parts[3]), `${folder}${name}`));
  }
  // github.com/owner/repo -> README on the default branch (main or master)
  return ['main', 'master'].flatMap((branch) => ['README.md', 'readme.md'].map((name) => base(branch, name)));
}

// ── Problem links ───────────────────────────────────────────────────────────

// Returns { platform, externalId } for a problem URL on a supported site, else null.
export function problemRefFromUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'leetcode.com' || host === 'leetcode.cn') {
    const slug = u.pathname.match(/^\/problems\/([^/]+)/)?.[1];
    return slug ? { platform: 'leetcode', externalId: slug.toLowerCase() } : null;
  }
  if (host === 'codeforces.com') {
    const m = u.pathname.match(/^\/(?:problemset\/problem|contest|gym)\/(\d+)\/(?:problem\/)?([A-Za-z0-9]+)/);
    return m ? { platform: 'codeforces', externalId: `${m[1]}${m[2].toUpperCase()}` } : null;
  }
  if (host.endsWith('geeksforgeeks.org')) {
    const slug = u.pathname.match(/^\/problems\/([^/]+)/)?.[1];
    return slug ? { platform: 'gfg', externalId: slug.toLowerCase() } : null;
  }
  return null;
}

const DIFFICULTY_RE = /\b(easy|medium|hard)\b/i;
const GENERIC_LINK_TEXT = /^(leetcode|lc|link|solve|solution|problem|practice|code|view|open|here|gfg|cf|codeforces|\d+)$/i;
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

const titleFromSlug = (url) => {
  const slug = new URL(url).pathname.split('/').filter(Boolean).find((s, i, a) => a[i - 1] === 'problems') ?? '';
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

function difficultyOf(text) {
  const m = text.match(DIFFICULTY_RE);
  return m ? m[1].toLowerCase() : 'unknown';
}

// ── Parsing ─────────────────────────────────────────────────────────────────

// A README line is only used as the sheet description when it reads like a sentence:
// not a list introduction ("Solutions in these languages:"), badge, HTML or bare link.
function proseDescription(line) {
  const text = line
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < 30 || (text.match(/[A-Za-z]/g) || []).length < 20) return null;
  if (/[:：]$/.test(text)) return null; // introduces a list that follows
  return text.slice(0, 300);
}

// "https://github.com/owner/repo/blob/..." -> "github.com/owner/repo"
function sourceLabel(sourceUrl) {
  try {
    const u = new URL(sourceUrl);
    return [u.hostname.replace(/^www\./, ''), ...u.pathname.split('/').filter(Boolean).slice(0, 2)].join('/');
  } catch {
    return String(sourceUrl);
  }
}

function parseJson(content) {
  let json;
  try {
    json = JSON.parse(content);
  } catch {
    return null;
  }
  const list = Array.isArray(json) ? json : json?.problems || json?.items || json?.questions || [];
  if (!Array.isArray(list)) return null;
  const items = list
    .map((p) => ({
      title: typeof p === 'string' ? p : p?.title || p?.name || '',
      url: typeof p === 'object' ? p?.url || p?.link || null : null,
      difficulty: String(typeof p === 'object' && p?.difficulty ? p.difficulty : 'unknown').toLowerCase(),
    }))
    .filter((i) => i.title);
  return { title: (!Array.isArray(json) && (json.title || json.name)) || '', description: (!Array.isArray(json) && json.description) || '', items };
}

/**
 * Parses markdown or JSON into a sheet. Only real problems are returned: links to
 * known problem sites (LeetCode, Codeforces, GeeksforGeeks) and plain checklist
 * items. Navigation, category and translation links are ignored. Returns an empty
 * `items` list when nothing usable is found — it never invents problems.
 */
export function parseSheetContent(content, sourceUrl) {
  let title = '';
  let description = '';
  let items = [];
  let descriptionSource = 'fallback';

  const asJson = parseJson(content);
  if (asJson && asJson.items.length > 0) {
    ({ title, description, items } = asJson);
    if (description) descriptionSource = 'json';
  } else {
    const seen = new Set();
    const push = (item) => {
      const key = (item.url || item.title).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      items.push(item);
    };

    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;

      if (!title && /^#\s+/.test(line)) {
        title = line.replace(/^#+\s*/, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
        continue;
      }
      if (title && !description && !/^[#|\-*>`\d<!\[]/.test(line)) {
        const prose = proseDescription(line);
        if (prose) {
          description = prose;
          descriptionSource = 'readme';
          continue;
        }
      }

      // A line counts as a problem when it links to a supported problem page.
      const links = [...line.matchAll(LINK_RE)].map((m) => ({ text: m[1].trim(), url: m[2].trim() }));
      const problemLink = links.find((l) => problemRefFromUrl(l.url));
      if (problemLink) {
        let itemTitle = problemLink.text;
        if (GENERIC_LINK_TEXT.test(itemTitle)) {
          // "| 1 | Two Sum | [LeetCode](...) |": use the plain cell, else the URL slug.
          const cell = line.split('|').map((c) => c.replace(LINK_RE, '').replace(/[*_`]/g, '').trim())
            .find((c) => c.length > 3 && !/^\d+$/.test(c) && !DIFFICULTY_RE.test(c) && !/^[-:\s]+$/.test(c));
          itemTitle = cell || titleFromSlug(problemLink.url) || itemTitle;
        }
        push({ title: itemTitle, url: problemLink.url, difficulty: difficultyOf(line) });
        continue;
      }

      // Plain checklist item: "- [ ] Two Sum - Easy"
      const checklist = line.match(/^[-*]\s*\[[ xX]?\]\s*([^(\n[]+)/);
      if (checklist && checklist[1].trim().length > 2) {
        push({ title: checklist[1].replace(/\s*[-–]\s*(easy|medium|hard)\s*$/i, '').trim(), url: null, difficulty: difficultyOf(line) });
      }
    }
  }

  if (!title) {
    try {
      const segments = new URL(sourceUrl).pathname.split('/').filter(Boolean);
      title = (segments[1] || segments[0] || 'GitHub Sheet').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
      title = 'GitHub Sheet';
    }
  }
  if (!description) description = `Imported from ${sourceLabel(sourceUrl)}`;

  return { title: title.slice(0, 120), description, descriptionSource, items: items.map((item, position) => ({ ...item, position })) };
}

// ── Fetching ────────────────────────────────────────────────────────────────

async function fetchFirstAvailable(rawUrls, fetchImpl) {
  for (const rawUrl of rawUrls) {
    try {
      const res = await fetchImpl(rawUrl, {
        headers: { 'User-Agent': 'AlgoVault-Sheet-Importer', Accept: 'text/plain, text/markdown, application/json' },
        signal: AbortSignal.timeout(10000),
      });
      // A redirect must not lead somewhere other than GitHub.
      if (res.url && !ALLOWED_HOSTS.has(new URL(res.url).hostname.toLowerCase())) continue;
      if (!res.ok) continue;
      const text = await res.text();
      if (text.length > MAX_BYTES) throw ApiError.badRequest('That file is too large to import (limit 2 MB)');
      return text;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // network error or timeout: try the next candidate
    }
  }
  return null;
}

// The repository's own one-line summary (the "About" text on GitHub). Best effort: private
// repos, rate limits and network errors just mean we fall back to the README.
async function fetchRepoDescription(inputUrl, fetchImpl) {
  try {
    const url = new URL(/^https?:\/\//i.test(inputUrl) ? inputUrl : `https://${inputUrl}`);
    const [owner, repo] = url.pathname.split('/').filter(Boolean); // github.com/owner/repo/... and raw.githubusercontent.com/owner/repo/...
    if (!owner || !repo) return null;
    const res = await fetchImpl(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: { 'User-Agent': 'AlgoVault-Sheet-Importer', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const text = String((await res.json())?.description ?? '').replace(/\s+/g, ' ').trim();
    return text.length >= 10 ? text.slice(0, 300) : null;
  } catch {
    return null;
  }
}

// Creates (or reuses) a Problem row per item URL so sheet items link to real problems.
// Official titles and difficulty come from LeetCode's and Codeforces' public problem lists
// (one request each, cached); if a list is unavailable, the difficulty stated in the sheet
// is used, else "unknown". Done in a handful of queries, not one per item — sheets can hold
// hundreds of problems and each round trip to a hosted database costs hundreds of ms.
async function linkProblems(items, fetchImpl) {
  const key = (ref) => `${ref.platform}:${ref.externalId}`;
  const refs = items.map((item) => (item.url ? problemRefFromUrl(item.url) : null));

  const unique = new Map();
  items.forEach((item, i) => {
    if (refs[i] && !unique.has(key(refs[i]))) unique.set(key(refs[i]), { ref: refs[i], item });
  });
  const entries = [...unique.values()];

  const idByKey = new Map();
  if (entries.length > 0) {
    const has = (platform) => entries.some(({ ref }) => ref.platform === platform);
    const [leetcode, codeforces] = await Promise.all([
      has('leetcode') ? getLeetCodeCatalog(fetchImpl) : new Map(),
      has('codeforces') ? getCodeforcesCatalog(fetchImpl) : new Map(),
    ]);
    const catalogFor = (ref) => (ref.platform === 'leetcode' ? leetcode : ref.platform === 'codeforces' ? codeforces : null)?.get(ref.externalId);

    const rows = entries.map(({ ref, item }) => {
      const official = catalogFor(ref);
      const difficulty = official?.difficulty && official.difficulty !== 'unknown' ? official.difficulty : item.difficulty;
      return { ...ref, title: (official?.title || item.title).slice(0, 200), url: item.url, difficulty, tags: [] };
    });
    await prisma.problem.createMany({ data: rows, skipDuplicates: true }); // existing rows keep their metadata

    // Problems cached earlier without a difficulty can be filled in now.
    for (const level of ['easy', 'medium', 'hard']) {
      const keys = rows.filter((r) => r.difficulty === level);
      if (keys.length === 0) continue;
      await prisma.problem.updateMany({
        where: { difficulty: 'unknown', OR: keys.map((r) => ({ platform: r.platform, externalId: r.externalId })) },
        data: { difficulty: level },
      });
    }

    const found = await prisma.problem.findMany({
      where: { OR: entries.map(({ ref }) => ({ platform: ref.platform, externalId: ref.externalId })) },
      select: { id: true, platform: true, externalId: true, title: true },
    });
    found.forEach((p) => idByKey.set(key(p), p.id));

    // A cached row whose title differs from the official one (e.g. "0217 - Contains Duplicate"
    // taken from some README) is corrected, so titles stay consistent across sheets.
    const retitle = found.filter((p) => {
      const official = catalogFor(p)?.title;
      return official && official !== p.title;
    });
    if (retitle.length > 0) {
      // One statement for all of them: the hosted database allows a single connection, so
      // hundreds of separate updates would queue and time out.
      const ids = retitle.map((p) => p.id);
      const titles = retitle.map((p) => catalogFor(p).title.slice(0, 200));
      await prisma.$executeRaw`UPDATE "problems" AS p SET "title" = d."title", "updatedAt" = NOW()
        FROM (SELECT unnest(${ids}::text[]) AS "id", unnest(${titles}::text[]) AS "title") AS d
        WHERE p."id" = d."id"`;
    }
  }

  return items.map((item, i) => {
    const problemId = refs[i] ? idByKey.get(key(refs[i])) : null;
    return { title: item.title, status: 'todo', position: item.position, ...(problemId ? { problemId } : {}) };
  });
}

/**
 * Main service to import a sheet from a GitHub link under the current user.
 */
export async function forkSheetFromGithub(userId, githubUrl, fetchImpl = fetch) {
  if (!githubUrl || typeof githubUrl !== 'string' || !githubUrl.trim()) {
    throw ApiError.badRequest('A valid GitHub link is required');
  }

  const content = await fetchFirstAvailable(getRawGitHubUrls(githubUrl), fetchImpl);
  if (!content) {
    throw ApiError.badRequest(`Could not retrieve a README from ${githubUrl.trim()}. Check that the repository is public and the link is correct.`);
  }

  const parsed = parseSheetContent(content, githubUrl.trim());
  if (parsed.items.length === 0) {
    throw ApiError.badRequest(
      'No problems were found in that file. Link to a README or file that lists problems with LeetCode, Codeforces or GeeksforGeeks links, a checklist, or JSON.',
    );
  }

  const [items, repoDescription] = await Promise.all([
    linkProblems(parsed.items.slice(0, MAX_ITEMS), fetchImpl),
    fetchRepoDescription(githubUrl.trim(), fetchImpl),
  ]);
  // Prefer the file's own summary, then the repository's, then "Imported from ...".
  const base = parsed.descriptionSource === 'json' ? parsed.description : repoDescription || parsed.description;
  const truncated = parsed.items.length > MAX_ITEMS;
  const description = truncated ? `${base} (Imported the first ${MAX_ITEMS} of ${parsed.items.length} problems.)` : base;
  return createSheet(userId, { title: parsed.title, description, visibility: 'private', items });
}
