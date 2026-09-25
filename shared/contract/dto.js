// DTO shapes = the exact fields each entity exposes over the API.
// These are the OUTPUT shapes (what the API returns), not the Mongo schemas.
// Backend maps model → DTO before responding. Frontend types against these.
//
// Each entity also ships a `mock*()` factory. Stubs and the frontend mock layer
// use these so both sides see identical shapes before real logic exists.

import { VISIBILITY, DIFFICULTY, PLATFORMS, SHEET_ITEM_STATUS, ROLES, REPORT_STATUS } from './enums.js';

let _seq = 1;
const id = (prefix) => `${prefix}_${String(_seq++).padStart(6, '0')}`;
const now = () => new Date().toISOString();

// ---------- User ----------
export function mockUser(over = {}) {
  return {
    id: id('usr'),
    email: 'student@example.com',
    displayName: 'Demo Student',
    role: ROLES.USER,
    cfHandle: null,
    createdAt: now(),
    ...over,
  };
}

// ---------- Problem (cached metadata) ----------
export function mockProblem(over = {}) {
  return {
    id: id('prob'),
    platform: PLATFORMS.LEETCODE,
    externalId: '300',
    title: 'Longest Increasing Subsequence',
    url: 'https://leetcode.com/problems/longest-increasing-subsequence/',
    difficulty: DIFFICULTY.MEDIUM,
    tags: ['dp', 'binary-search'],
    fetchedAt: now(),
    ...over,
  };
}

// ---------- Note ----------
export function mockNote(over = {}) {
  return {
    id: id('note'),
    ownerId: id('usr'),
    title: 'LIS with binary search trick',
    contentMarkdown: '## Approach\nPatience sorting; binary search on tails.',
    codeBlocks: [
      { language: 'cpp', code: '// C++ solution', timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)' },
      { language: 'java', code: '// Java solution', timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)' },
    ],
    problemId: null,
    patternTags: ['dp', 'binary-search-on-answer'],
    visibility: VISIBILITY.PRIVATE,
    forkOf: null,
    forkCount: 0,
    confidence: 3, // self-rated 1..5
    createdAt: now(),
    updatedAt: now(),
    ...over,
  };
}

// ---------- Revision (SM-2 state for a note) ----------
export function mockRevision(over = {}) {
  return {
    id: id('rev'),
    userId: id('usr'),
    noteId: id('note'),
    noteTitle: 'Mock Note Title',
    patternTags: ['mock', 'tag'],
    contentMarkdown: 'Mock note content...',
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    lastReviewedAt: null,
    nextReviewAt: now(),
    ...over,
  };
}

// ---------- Sheet + items ----------
export function mockSheetItem(over = {}) {
  return {
    itemId: id('item'),
    problemId: id('prob'),
    title: 'Two Sum',
    status: SHEET_ITEM_STATUS.TODO,
    ...over,
  };
}

export function mockSheet(over = {}) {
  return {
    id: id('sheet'),
    ownerId: id('usr'),
    title: 'Amazon SDE Sheet',
    description: '75 must-do problems',
    visibility: VISIBILITY.PRIVATE,
    targetDate: null,
    items: [mockSheetItem(), mockSheetItem({ title: 'Valid Parentheses' })],
    forkOf: null,
    forkCount: 0,
    progressPct: 0,
    createdAt: now(),
    updatedAt: now(),
    ...over,
  };
}

// ---------- Dashboard summary ----------
export function mockDashboardSummary(over = {}) {
  return {
    patternCounts: [
      { tag: 'dp', count: 12, avgConfidence: 3.2, daysSinceLastPracticed: 4 },
      { tag: 'graphs', count: 7, avgConfidence: 2.0, daysSinceLastPracticed: 18 },
    ],
    difficultyDistribution: { easy: 20, medium: 35, hard: 9 },
    streak: { current: 5, longest: 22, lastActiveDate: now() },
    stalenessAlerts: [{ tag: 'graphs', daysSinceLastPracticed: 18, confidence: 2 }],
    ...over,
  };
}

// ---------- CF stats ----------
export function mockCfStats(over = {}) {
  return {
    handle: 'tourist',
    currentRating: 3800,
    maxRating: 3900,
    ratingHistory: [{ contestId: 1, ratingAfter: 1500, at: now() }],
    solvedByTag: [{ tag: 'greedy', solved: 120 }],
    syncedAt: now(),
    ...over,
  };
}

// ---------- Report ----------
export function mockReport(over = {}) {
  return {
    id: id('rpt'),
    reporterId: id('usr'),
    targetType: 'note',
    targetId: id('note'),
    reason: 'Inappropriate content',
    status: REPORT_STATUS.OPEN,
    createdAt: now(),
    updatedAt: now(),
    ...over,
  };
}

// ---------- Submission ----------
export function mockSubmission(over = {}) {
  return {
    id: id('sub'),
    userId: id('usr'),
    problemId: id('prob'),
    noteId: null,
    status: 'accepted',
    language: 'python',
    code: 'def solve(): pass',
    submittedAt: now(),
    createdAt: now(),
    updatedAt: now(),
    ...over,
  };
}

// ---------- Activity Heatmap ----------
export function mockActivityHeatmap(over = {}) {
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date(Date.now() - 365 * 86400000);
  const from = fromDate.toISOString().slice(0, 10);
  return {
    from,
    to,
    total: 0,
    days: [],
    ...over,
  };
}


