// Single source of truth for enumerated values used across FE + BE.
// Import from here; never re-declare these strings inline.

export const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

export const VISIBILITY = Object.freeze({
  PRIVATE: 'private',
  LINK: 'link',
  PUBLIC: 'public',
});

export const PLATFORMS = Object.freeze({
  LEETCODE: 'leetcode',
  CODEFORCES: 'codeforces',
  GFG: 'gfg',
  UNKNOWN: 'unknown',
});

export const DIFFICULTY = Object.freeze({
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  UNKNOWN: 'unknown',
});

// SM-2 review ratings. Kept as 0..3 to match the algorithm's q value.
export const REVIEW_RATING = Object.freeze({
  AGAIN: 0,
  HARD: 1,
  GOOD: 2,
  EASY: 3,
});

export const SHEET_ITEM_STATUS = Object.freeze({
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
});

// Machine-readable error codes. FE switches on these, never on message text.
export const ERROR_CODES = Object.freeze({
  VALIDATION: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL_ERROR',
});

export const REPORT_STATUS = Object.freeze({
  OPEN: 'open',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
});

