// ─────────────────────────────────────────────────────────────────────────
// SM-2 SPACED REPETITION — the heart of AlgoVault.
//
// `applySm2` is a PURE FUNCTION: (state, rating) → newState. No DB, no dates
// from outside, deterministic. That is deliberate — it makes the algorithm
// trivially unit-testable (see tests/revisionService.test.js) and is the
// single most defensible piece of engineering in a viva.
//
// Rating q ∈ {0,1,2,3}  (Again/Hard/Good/Easy).
//   q < 2  → lapse: repetitions reset, interval back to 1 day.
//   q >= 2 → progress: interval 1 → 6 → round(interval * easeFactor).
//   easeFactor adjusts by the classic SM-2 formula, floored at 1.3.
// ─────────────────────────────────────────────────────────────────────────

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;
const PASS_THRESHOLD = 2; // q >= 2 counts as recalled

/**
 * @param {{repetitions:number, intervalDays:number, easeFactor:number}} state
 * @param {0|1|2|3} rating
 * @returns {{repetitions:number, intervalDays:number, easeFactor:number}}
 */
export function applySm2(state, rating) {
  const q = clampRating(rating);
  let { repetitions, intervalDays, easeFactor } = normalizeState(state);

  // Ease update (applied on every review in classic SM-2).
  easeFactor = easeFactor + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02));
  if (easeFactor < MIN_EASE) easeFactor = MIN_EASE;

  if (q < PASS_THRESHOLD) {
    // Lapse — start the ladder over.
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = q === 3 ? 4 : 1;
    } else if (repetitions === 2) {
      intervalDays = q === 3 ? 10 : 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  }

  return {
    repetitions,
    intervalDays,
    easeFactor: round2(easeFactor),
  };
}

/**
 * Compute the next review Date from an interval. Kept separate so `applySm2`
 * stays free of clock dependencies (pass `now` explicitly in tests).
 */
export function nextReviewDate(intervalDays, now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + intervalDays);
  return d;
}

function clampRating(rating) {
  const q = Math.trunc(Number(rating));
  if (Number.isNaN(q)) return 0;
  return Math.max(0, Math.min(3, q));
}

function normalizeState(state = {}) {
  return {
    repetitions: Number.isFinite(state.repetitions) ? state.repetitions : 0,
    intervalDays: Number.isFinite(state.intervalDays) ? state.intervalDays : 0,
    easeFactor: Number.isFinite(state.easeFactor) ? state.easeFactor : DEFAULT_EASE,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
