-- Per-user preferences for the daily revision digest email.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "digestEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "digestHour" INTEGER NOT NULL DEFAULT 8;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastDigestAt" TIMESTAMP(3);
