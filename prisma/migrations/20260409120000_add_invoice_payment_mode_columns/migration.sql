-- Invoice columns for payment modes (ADVANCE/BALANCE/SECURITY_DEPOSIT, discounts, retention). Idempotent.

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

-- Self-relation: advance → balance invoice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_parentInvoiceId_fkey'
  ) THEN
    ALTER TABLE "Invoice"
      ADD CONSTRAINT "Invoice_parentInvoiceId_fkey"
      FOREIGN KEY ("parentInvoiceId") REFERENCES "Invoice"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
