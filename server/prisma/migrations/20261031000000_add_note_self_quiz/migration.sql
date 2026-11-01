-- Student-authored self-quiz fields. Each is a short one-liner that the quiz
-- turns into a problem-specific MCQ with distractors from a stock pool.
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "keyInsight" TEXT;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "edgeCase" TEXT;
