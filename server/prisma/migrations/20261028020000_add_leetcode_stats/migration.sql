-- LeetCode integration: per-user stats snapshot and the connected username.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lcHandle" TEXT;

CREATE TABLE IF NOT EXISTS "lc_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "ranking" INTEGER NOT NULL DEFAULT 0,
    "solved" JSONB NOT NULL DEFAULT '{}',
    "totals" JSONB NOT NULL DEFAULT '{}',
    "contest" JSONB,
    "contestHistory" JSONB NOT NULL DEFAULT '[]',
    "topics" JSONB NOT NULL DEFAULT '[]',
    "calendar" JSONB NOT NULL DEFAULT '{}',
    "recent" JSONB NOT NULL DEFAULT '[]',
    "badges" JSONB NOT NULL DEFAULT '[]',
    "profile" JSONB NOT NULL DEFAULT '{}',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lc_stats_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lc_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "lc_stats_userId_key" ON "lc_stats"("userId");
