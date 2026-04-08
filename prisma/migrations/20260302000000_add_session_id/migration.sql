-- Add Session.id if missing (schema expects id as primary key; DB may have been created without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Session' AND column_name = 'id'
  ) THEN
    ALTER TABLE "Session" ADD COLUMN "id" TEXT;
    UPDATE "Session" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
    ALTER TABLE "Session" ALTER COLUMN "id" SET NOT NULL;
    ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_pkey";
    ALTER TABLE "Session" ADD PRIMARY KEY ("id");
    CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
  END IF;
END $$;
