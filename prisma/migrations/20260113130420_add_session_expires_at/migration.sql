-- Add Session.expiresAt (required by schema and createSession)
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
