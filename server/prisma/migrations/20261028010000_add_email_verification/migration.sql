-- Email verification: reminders are only sent to verified addresses.
-- Existing users are grandfathered in as verified, new sign-ups default to unverified.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ALTER COLUMN "emailVerified" SET DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifyTokenHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifyExpiresAt" TIMESTAMP(3);
