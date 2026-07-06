-- One-shot fix when production DB is behind prisma/schema.prisma (P2022 on Invoice.*).
-- Run in Supabase/Neon SQL editor, or:
--   npx prisma db execute --schema prisma/schema.prisma --file scripts/fix-invoice-schema-drift.sql
-- Then: npx prisma migrate deploy (so _prisma_migrations stays aligned) — or rely on vercel-build.

-- === orgId (SECURITY_DEPOSIT) ===
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invoice' AND column_name = 'orgId'
  ) THEN
    ALTER TABLE "Invoice" ADD COLUMN "orgId" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_orgId_fkey') THEN
    ALTER TABLE "Invoice"
      ADD CONSTRAINT "Invoice_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- === Payment mode / linked invoices / commercial fields ===
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invoice' AND column_name = 'invoiceType'
  ) THEN
    ALTER TABLE "Invoice" ADD COLUMN "invoiceType" TEXT NOT NULL DEFAULT 'STANDARD';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invoice' AND column_name = 'parentInvoiceId'
  ) THEN
    ALTER TABLE "Invoice" ADD COLUMN "parentInvoiceId" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invoice' AND column_name = 'advancePercent'
  ) THEN
    ALTER TABLE "Invoice" ADD COLUMN "advancePercent" DOUBLE PRECISION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invoice' AND column_name = 'dueDateOverride'
  ) THEN
    ALTER TABLE "Invoice" ADD COLUMN "dueDateOverride" TIMESTAMP(3);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invoice' AND column_name = 'earlyPayDiscountPercent'
  ) THEN
    ALTER TABLE "Invoice" ADD COLUMN "earlyPayDiscountPercent" DOUBLE PRECISION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invoice' AND column_name = 'earlyPayDiscountDays'
  ) THEN
    ALTER TABLE "Invoice" ADD COLUMN "earlyPayDiscountDays" INTEGER;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invoice' AND column_name = 'retentionPercent'
  ) THEN
    ALTER TABLE "Invoice" ADD COLUMN "retentionPercent" DOUBLE PRECISION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invoice' AND column_name = 'retentionDueDate'
  ) THEN
    ALTER TABLE "Invoice" ADD COLUMN "retentionDueDate" TIMESTAMP(3);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_parentInvoiceId_fkey') THEN
    ALTER TABLE "Invoice"
      ADD CONSTRAINT "Invoice_parentInvoiceId_fkey"
      FOREIGN KEY ("parentInvoiceId") REFERENCES "Invoice"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
