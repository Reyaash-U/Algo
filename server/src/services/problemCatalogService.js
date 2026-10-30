// Looks up official titles and difficulty for problems imported from a sheet, using the
// public problem lists LeetCode and Codeforces publish. Each list is fetched at most once
// per day and kept in memory. Everything here is best effort: if a list can't be fetched,
// callers simply get an empty map and keep whatever the sheet itself said.

const CACHE_MS = 24 * 60 * 60 * 1000;
const cache = new Map(); // name -> { at, map }

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';
const CODEFORCES_ALL_URL = 'https://codeforces.com/api/problemset.problems';
const LEETCODE_PAGE_SIZE = 100; // LeetCode caps each page at 100 problems
const LEETCODE_CONCURRENCY = 5;
const LEETCODE_LIST_QUERY = `query list($limit: Int, $skip: Int) {
  problemsetQuestionList: questionList(categorySlug: "", limit: $limit, skip: $skip, filters: {}) {
    total: totalNum
    questions: data { titleSlug title difficulty }
  }
}`;

// Same buckets the single-problem resolver uses (problemFetchService).
function codeforcesDifficulty(rating) {
  if (!Number.isFinite(rating)) return 'unknown';
  if (rating <= 1200) return 'easy';
  if (rating <= 1900) return 'medium';
  return 'hard';
}

async function cached(name, load) {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.map;
  let map = new Map();
  try {
    map = await load();
  } catch {
    return new Map(); // not cached, so the next import tries again
  }
  if (map.size > 0) cache.set(name, { at: Date.now(), map });
  return map;
}

async function getJson(url, fetchImpl, headers = {}) {
  const res = await fetchImpl(url, { headers: { 'User-Agent': 'AlgoVault/1.0', ...headers }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function leetCodePage(skip, fetchImpl) {
  const res = await fetchImpl(LEETCODE_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com', 'User-Agent': 'AlgoVault/1.0' },
    body: JSON.stringify({ query: LEETCODE_LIST_QUERY, variables: { limit: LEETCODE_PAGE_SIZE, skip } }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const list = (await res.json())?.data?.problemsetQuestionList;
  if (!list?.questions) throw new Error('unexpected response');
  return list;
}

/** slug -> { title, difficulty } for every LeetCode problem (via LeetCode's public GraphQL). */
export function getLeetCodeCatalog(fetchImpl = fetch) {
  return cached('leetcode', async () => {
    const first = await leetCodePage(0, fetchImpl);
    const pages = [first];
    const skips = [];
    for (let skip = LEETCODE_PAGE_SIZE; skip < (first.total ?? 0); skip += LEETCODE_PAGE_SIZE) skips.push(skip);
    // A few pages at a time, to stay polite to LeetCode.
    for (let i = 0; i < skips.length; i += LEETCODE_CONCURRENCY) {
      pages.push(...(await Promise.all(skips.slice(i, i + LEETCODE_CONCURRENCY).map((skip) => leetCodePage(skip, fetchImpl)))));
    }
    const map = new Map();
    for (const page of pages) {
      for (const q of page.questions) {
        map.set(String(q.titleSlug).toLowerCase(), { title: q.title, difficulty: String(q.difficulty || 'unknown').toLowerCase() });
      }
    }
    return map;
  });
}

/** "1234A" -> { title, difficulty } for every rated Codeforces problem. */
export function getCodeforcesCatalog(fetchImpl = fetch) {
  return cached('codeforces', async () => {
    const data = await getJson(CODEFORCES_ALL_URL, fetchImpl);
    const map = new Map();
    for (const p of data.result?.problems ?? []) {
      map.set(`${p.contestId}${String(p.index).toUpperCase()}`, { title: p.name, difficulty: codeforcesDifficulty(p.rating) });
    }
    return map;
  });
}

/** For tests: forget the cached lists. */
export function resetCatalogCache() {
  cache.clear();
}
