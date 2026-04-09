-- Invoice.orgId for SECURITY_DEPOSIT and org-scoped queries (idempotent for drifted DBs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invoice' AND column_name = 'orgId'
  ) THEN
    ALTER TABLE "Invoice" ADD COLUMN "orgId" TEXT;
  END IF;
END $$;

-- FK to Organization (skip if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Invoice_orgId_fkey'
  ) THEN
    ALTER TABLE "Invoice"
      ADD CONSTRAINT "Invoice_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
