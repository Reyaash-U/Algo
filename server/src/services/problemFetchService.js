// BACKEND DEV: Cache-aside problem metadata resolver.
//   parse URL → detect platform → normalize (strip query) → check Problem cache
//   → on MISS: fetch (LeetCode GraphQL / Codeforces API / GFG scrape) → cache → return
//   → on HIT: return cached doc.
// Name the pattern "cache-aside" in the viva.
import { DIFFICULTY, PLATFORMS } from '@algovault/shared';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';

export function detectPlatform(url = '') {
  if (url.includes('leetcode.com')) return PLATFORMS.LEETCODE;
  if (url.includes('codeforces.com')) return PLATFORMS.CODEFORCES;
  if (url.includes('geeksforgeeks.org')) return PLATFORMS.GFG;
  return PLATFORMS.UNKNOWN;
}

export async function resolveProblem(url) {
  const normalizedUrl = normalizeUrl(url);
  const platform = detectPlatform(normalizedUrl.toLowerCase());
  if (platform === PLATFORMS.UNKNOWN || platform === PLATFORMS.GFG) {
    throw ApiError.badRequest('Unsupported problem URL. Use a Codeforces or LeetCode problem URL');
  }

  const externalId = parseExternalId(platform, normalizedUrl);

  const cached = await prisma.problem.findUnique({
    where: {
      platform_externalId: {
        platform,
        externalId,
      },
    },
  });
  if (cached) return cached;

  const metadata =
    platform === PLATFORMS.CODEFORCES
      ? await fetchCodeforcesProblem(externalId)
      : await fetchLeetCodeProblem(externalId);

  return prisma.problem.create({
    data: {
      platform,
      externalId,
      title: metadata.title,
      url: metadata.url,
      difficulty: metadata.difficulty,
      tags: metadata.tags,
    },
  });
}

function normalizeUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    throw ApiError.badRequest('Problem URL is required');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw ApiError.badRequest('Invalid problem URL');
  }

  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function parseExternalId(platform, normalizedUrl) {
  const parsed = new URL(normalizedUrl);
  const path = parsed.pathname.replace(/\/+$/, '');

  if (platform === PLATFORMS.CODEFORCES) {
    const problemsetMatch = path.match(/^\/problemset\/problem\/(\d+)\/([a-z0-9]+)$/i);
    if (problemsetMatch) return `${problemsetMatch[1]}${problemsetMatch[2].toUpperCase()}`;

    const contestMatch = path.match(/^\/contest\/(\d+)\/problem\/([a-z0-9]+)$/i);
    if (contestMatch) return `${contestMatch[1]}${contestMatch[2].toUpperCase()}`;

    throw ApiError.badRequest('Could not parse Codeforces problem URL');
  }

  if (platform === PLATFORMS.LEETCODE) {
    const leetcodeMatch = path.match(/^\/problems\/([a-z0-9-]+)$/i);
    if (leetcodeMatch) return leetcodeMatch[1].toLowerCase();
    throw ApiError.badRequest('Could not parse LeetCode problem URL');
  }

  throw ApiError.badRequest('Unsupported platform');
}

async function fetchCodeforcesProblem(externalId) {
  const match = externalId.match(/^(\d+)([A-Z0-9]+)$/);
  if (!match) throw ApiError.badRequest('Invalid Codeforces problem ID');

  const contestId = Number.parseInt(match[1], 10);
  const index = match[2];

  let payload;
  try {
    const response = await fetch('https://codeforces.com/api/problemset.problems');
    payload = await response.json();
    if (!response.ok || payload?.status !== 'OK') {
      throw new Error('Codeforces API request failed');
    }
  } catch {
    throw ApiError.badRequest('Could not fetch Codeforces problem metadata right now');
  }

  const problem = payload.result?.problems?.find(
    (row) => row.contestId === contestId && String(row.index).toUpperCase() === index,
  );
  if (!problem) {
    throw ApiError.badRequest('Codeforces problem not found');
  }

  return {
    title: problem.name,
    url: `https://codeforces.com/problemset/problem/${contestId}/${index}`,
    difficulty: mapCodeforcesDifficulty(problem.rating),
    tags: Array.isArray(problem.tags) ? problem.tags : [],
  };
}

async function fetchLeetCodeProblem(slug) {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        difficulty
        topicTags {
          name
          slug
        }
      }
    }
  `;

  let payload;
  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { titleSlug: slug } }),
    });
    payload = await response.json();
    if (!response.ok || payload?.errors?.length) {
      throw new Error('LeetCode GraphQL request failed');
    }
  } catch {
    throw ApiError.badRequest(
      'Could not fetch LeetCode metadata automatically. Please enter title/difficulty/tags manually',
    );
  }

  const question = payload?.data?.question;
  if (!question) {
    throw ApiError.badRequest(
      'Could not fetch LeetCode metadata automatically. Please enter title/difficulty/tags manually',
    );
  }

  return {
    title: question.title,
    url: `https://leetcode.com/problems/${slug}/`,
    difficulty: mapLeetCodeDifficulty(question.difficulty),
    tags: Array.isArray(question.topicTags) ? question.topicTags.map((tag) => tag.slug || tag.name) : [],
  };
}

function mapLeetCodeDifficulty(difficulty) {
  const value = String(difficulty || '').toUpperCase();
  if (value === 'EASY') return DIFFICULTY.EASY;
  if (value === 'MEDIUM') return DIFFICULTY.MEDIUM;
  if (value === 'HARD') return DIFFICULTY.HARD;
  return DIFFICULTY.UNKNOWN;
}

function mapCodeforcesDifficulty(rating) {
  if (!Number.isFinite(rating)) return DIFFICULTY.UNKNOWN;
  if (rating <= 1200) return DIFFICULTY.EASY;
  if (rating <= 1900) return DIFFICULTY.MEDIUM;
  return DIFFICULTY.HARD;
}
