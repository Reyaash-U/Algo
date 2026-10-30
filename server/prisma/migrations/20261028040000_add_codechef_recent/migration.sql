-- Recent CodeChef submissions shown on the CodeChef dashboard.
ALTER TABLE "cc_stats" ADD COLUMN IF NOT EXISTS "recent" JSONB NOT NULL DEFAULT '[]';
