-- CodeChef integration: per-user stats snapshot and the connected username.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ccHandle" TEXT;

CREATE TABLE IF NOT EXISTS "cc_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "rating" INTEGER,
    "highestRating" INTEGER,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "division" TEXT,
    "totalSolved" INTEGER NOT NULL DEFAULT 0,
    "contestHistory" JSONB NOT NULL DEFAULT '[]',
    "profile" JSONB NOT NULL DEFAULT '{}',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cc_stats_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cc_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "cc_stats_userId_key" ON "cc_stats"("userId");
