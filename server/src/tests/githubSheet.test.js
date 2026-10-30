import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import { resetCatalogCache } from '../services/problemCatalogService.js';
import { getRawGitHubUrls, parseSheetContent, problemRefFromUrl, forkSheetFromGithub } from '../services/githubSheetService.js';

test('getRawGitHubUrls only accepts GitHub links', () => {
  for (const bad of ['http://169.254.169.254/latest/meta-data/', 'http://localhost:5000/api/health', 'https://evil.example.com/a.md', 'https://github.com.evil.com/o/r']) {
    assert.throws(() => getRawGitHubUrls(bad), /Only GitHub links/, bad);
  }
  assert.throws(() => getRawGitHubUrls('not a url'), /not a valid link/);
  assert.throws(() => getRawGitHubUrls('https://github.com/onlyowner'), /repository/);
});

test('getRawGitHubUrls resolves repo, blob, tree and raw links', () => {
  assert.deepEqual(getRawGitHubUrls('https://github.com/o/r'), [
    'https://raw.githubusercontent.com/o/r/main/README.md',
    'https://raw.githubusercontent.com/o/r/main/readme.md',
    'https://raw.githubusercontent.com/o/r/master/README.md',
    'https://raw.githubusercontent.com/o/r/master/readme.md',
  ]);
  assert.deepEqual(getRawGitHubUrls('github.com/o/r/blob/dev/sheets/dsa.md'), ['https://raw.githubusercontent.com/o/r/dev/sheets/dsa.md']);
  assert.equal(getRawGitHubUrls('https://github.com/o/r/tree/main/docs')[0], 'https://raw.githubusercontent.com/o/r/main/docs/README.md');
  assert.deepEqual(getRawGitHubUrls('http://raw.githubusercontent.com/o/r/main/a.md'), ['https://raw.githubusercontent.com/o/r/main/a.md']);
});

test('problemRefFromUrl recognises supported problem pages only', () => {
  assert.deepEqual(problemRefFromUrl('https://leetcode.com/problems/Two-Sum/description/'), { platform: 'leetcode', externalId: 'two-sum' });
  assert.deepEqual(problemRefFromUrl('https://codeforces.com/problemset/problem/1234/a'), { platform: 'codeforces', externalId: '1234A' });
  assert.deepEqual(problemRefFromUrl('https://codeforces.com/contest/1700/problem/B'), { platform: 'codeforces', externalId: '1700B' });
  assert.deepEqual(problemRefFromUrl('https://www.geeksforgeeks.org/problems/two-sum/1'), { platform: 'gfg', externalId: 'two-sum' });
  assert.equal(problemRefFromUrl('https://leetcode.com/explore/'), null);
  assert.equal(problemRefFromUrl('https://example.com/problems/x'), null);
});

const readme = [
  '# My DSA Sheet',
  'A curated list of the problems worth practising before coding interviews.',
  '',
  '## Arrays',
  '| # | Problem | Difficulty | Solution |',
  '|---|---------|------------|----------|',
  '| 1 | [Two Sum](https://leetcode.com/problems/two-sum/) | Easy | [Python](./two_sum.py) |',
  '| 2 | Best Time to Buy and Sell Stock | Easy | [LeetCode](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) |',
  '- [ ] [3Sum](https://leetcode.com/problems/3sum/) (Medium)',
  '- [x] Trapping Rain Water - Hard',
  '- [Contribute](https://github.com/o/r/blob/main/CONTRIBUTING.md)',
  '- [Translations: Francais](./README.fr.md)',
  '- [Two Sum](https://leetcode.com/problems/two-sum/)',
].join('\n');

test('parseSheetContent keeps real problems and ignores navigation links', () => {
  const s = parseSheetContent(readme, 'https://github.com/o/my-sheet');
  assert.equal(s.title, 'My DSA Sheet');
  assert.equal(s.description, 'A curated list of the problems worth practising before coding interviews.');
  assert.deepEqual(s.items.map((i) => i.title), ['Two Sum', 'Best Time to Buy and Sell Stock', '3Sum', 'Trapping Rain Water']);
  assert.deepEqual(s.items.map((i) => i.difficulty), ['easy', 'easy', 'medium', 'hard']);
  assert.equal(s.items[1].url, 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/'); // title from the plain cell, not "LeetCode"
  assert.equal(s.items[3].url, null);
  assert.deepEqual(s.items.map((i) => i.position), [0, 1, 2, 3]); // the duplicate Two Sum is dropped
});

test('parseSheetContent never invents problems', () => {
  assert.deepEqual(parseSheetContent('# Handbook\nJust prose and [a link](https://example.com).', 'https://github.com/o/r').items, []);
  assert.deepEqual(parseSheetContent('', 'https://github.com/o/r').items, []);
});

test('parseSheetContent reads JSON sheets', () => {
  const json = JSON.stringify({ title: 'JSON Sheet', problems: [{ title: 'A', url: 'https://leetcode.com/problems/a/', difficulty: 'Hard' }, 'B'] });
  const s = parseSheetContent(json, 'https://github.com/o/r');
  assert.equal(s.title, 'JSON Sheet');
  assert.deepEqual(s.items.map((i) => [i.title, i.difficulty]), [['A', 'hard'], ['B', 'unknown']]);
});

const RAW = 'https://raw.githubusercontent.com/o/my-sheet/main/README.md';
const fakeFetch = (map) => async (url) => {
  const body = map[url];
  return body === undefined ? { ok: false, url } : { ok: true, url, text: async () => body, json: async () => JSON.parse(body) };
};
const newUser = () => prisma.user.create({ data: { email: `gh-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`, passwordHash: 'x', displayName: 'GH Test' } });

test('forkSheetFromGithub creates a private sheet with items linked to problems', async () => {
  let userId;
  try {
    userId = (await newUser()).id;
    const sheet = await forkSheetFromGithub(userId, 'https://github.com/o/my-sheet', fakeFetch({ [RAW]: readme }));
    assert.equal(sheet.title, 'My DSA Sheet');
    assert.equal(sheet.visibility, 'private');
    const rows = await prisma.sheetItem.findMany({ where: { sheetId: sheet.id }, orderBy: { position: 'asc' }, include: { problem: true } });
    assert.equal(rows.length, 4);
    assert.equal(rows[0].problem.url, 'https://leetcode.com/problems/two-sum/');
    assert.equal(rows[0].problem.difficulty, 'easy');
    assert.equal(rows[3].problem, null); // a plain checklist item has no URL to link

    // Importing again reuses the same Problem rows instead of duplicating them.
    await forkSheetFromGithub(userId, 'https://github.com/o/my-sheet', fakeFetch({ [RAW]: readme }));
    assert.equal(await prisma.problem.count({ where: { platform: 'leetcode', externalId: 'two-sum' } }), 1);
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
});

test('forkSheetFromGithub fails clearly and creates nothing for missing repos or files without problems', async () => {
  let userId;
  try {
    userId = (await newUser()).id;
    await assert.rejects(() => forkSheetFromGithub(userId, 'https://github.com/o/missing', fakeFetch({})), /Could not retrieve a README/);
    await assert.rejects(
      () => forkSheetFromGithub(userId, 'https://github.com/o/prose', fakeFetch({ 'https://raw.githubusercontent.com/o/prose/main/README.md': '# Prose\nNothing here.' })),
      /No problems were found/,
    );
    await assert.rejects(() => forkSheetFromGithub(userId, 'http://localhost:5000/api/health', fakeFetch({})), /Only GitHub links/);
    assert.equal(await prisma.sheet.count({ where: { ownerId: userId } }), 0);
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
});

const NL = String.fromCharCode(10);

test('description skips list introductions, badges and HTML, and falls back to the source', () => {
  const md = [
    '# Sheet',
    '[![build](https://img.shields.io/x.svg)](https://ci)',
    '<p align="center">logo</p>',
    'Solutions from these languages will be linked from [NeetCode.io](https://neetcode.io):',
    '- [Two Sum](https://leetcode.com/problems/two-sum/)',
    'A hand-picked set of **array** and [hashing](https://x.dev) problems for beginners.',
  ].join(NL);
  assert.equal(parseSheetContent(md, 'https://github.com/o/r').description, 'A hand-picked set of array and hashing problems for beginners.');

  const bare = parseSheetContent(['# Sheet', '- [Two Sum](https://leetcode.com/problems/two-sum/)'].join(NL), 'https://github.com/owner/repo/blob/main/README.md');
  assert.equal(bare.description, 'Imported from github.com/owner/repo');
});

// A stand-in for LeetCode's public problem list (GraphQL, one page).
const LEVEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const lcAll = (rows) => JSON.stringify({
  data: { problemsetQuestionList: { total: rows.length, questions: rows.map(([titleSlug, title, level]) => ({ titleSlug, title, difficulty: LEVEL[level] })) } },
});
const LC_URL = 'https://leetcode.com/graphql';

test('imported problems get official titles and difficulty from the LeetCode catalog', async () => {
  resetCatalogCache();
  const plain = ['# Sheet', 'A sheet that never states a difficulty anywhere in the file.', '- [ ] [Contains Duplicate](https://leetcode.com/problems/contains-duplicate/)', '- [ ] [Trap](https://leetcode.com/problems/trapping-rain-water/)'].join(NL);
  let userId;
  try {
    userId = (await newUser()).id;
    // One problem is already cached with an unknown difficulty and should be filled in.
    await prisma.problem.upsert({
      where: { platform_externalId: { platform: 'leetcode', externalId: 'trapping-rain-water' } },
      update: { difficulty: 'unknown' },
      create: { platform: 'leetcode', externalId: 'trapping-rain-water', title: 'Trap', url: 'https://leetcode.com/problems/trapping-rain-water/', difficulty: 'unknown', tags: [] },
    });
    const sheet = await forkSheetFromGithub(userId, 'https://github.com/o/my-sheet', fakeFetch({
      [RAW]: plain,
      [LC_URL]: lcAll([['contains-duplicate', 'Contains Duplicate', 1], ['trapping-rain-water', 'Trapping Rain Water', 3]]),
    }));
    const rows = await prisma.sheetItem.findMany({ where: { sheetId: sheet.id }, orderBy: { position: 'asc' }, include: { problem: true } });
    assert.equal(rows[0].problem.difficulty, 'easy');
    assert.equal(rows[0].problem.title, 'Contains Duplicate');
    assert.equal(rows[1].problem.difficulty, 'hard'); // the existing "unknown" row was updated
  } finally {
    resetCatalogCache();
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
});

test('if the LeetCode catalog is unavailable the import still works with the difficulty from the file', async () => {
  resetCatalogCache();
  let userId;
  try {
    userId = (await newUser()).id;
    const sheet = await forkSheetFromGithub(userId, 'https://github.com/o/my-sheet', fakeFetch({ [RAW]: readme })); // no catalog URL -> not ok
    const rows = await prisma.sheetItem.findMany({ where: { sheetId: sheet.id }, orderBy: { position: 'asc' }, include: { problem: true } });
    assert.equal(rows.length, 4);
    assert.equal(rows[0].problem.difficulty, 'easy'); // stated in the table
  } finally {
    resetCatalogCache();
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
});

const API = 'https://api.github.com/repos/o/my-sheet';

test('the sheet description prefers the GitHub repo summary, then the README, then the source', async () => {
  let userId;
  try {
    userId = (await newUser()).id;
    const withApi = await forkSheetFromGithub(userId, 'https://github.com/o/my-sheet', fakeFetch({
      [RAW]: readme,
      [API]: JSON.stringify({ description: '150 hand-picked problems for coding interviews' }),
    }));
    assert.equal(withApi.description, '150 hand-picked problems for coding interviews');

    const withoutApi = await forkSheetFromGithub(userId, 'https://github.com/o/my-sheet', fakeFetch({ [RAW]: readme }));
    assert.equal(withoutApi.description, 'A curated list of the problems worth practising before coding interviews.');

    const bare = ['# Sheet', '- [ ] [Two Sum](https://leetcode.com/problems/two-sum/)'].join(NL);
    const fallback = await forkSheetFromGithub(userId, 'https://github.com/o/my-sheet', fakeFetch({ [RAW]: bare }));
    assert.equal(fallback.description, 'Imported from github.com/o/my-sheet');

    // A description written inside a JSON sheet is the author's own and wins over the repo summary.
    const json = JSON.stringify({ title: 'J', description: 'The exact plan this author wrote', problems: ['A problem to solve'] });
    const jsonSheet = await forkSheetFromGithub(userId, 'https://github.com/o/my-sheet', fakeFetch({
      [RAW]: json,
      [API]: JSON.stringify({ description: 'Some generic repository description' }),
    }));
    assert.equal(jsonSheet.description, 'The exact plan this author wrote');
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  }
});
