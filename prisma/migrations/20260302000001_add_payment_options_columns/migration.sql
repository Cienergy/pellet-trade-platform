-- Create PaymentMode enum if not exists (for Organization.defaultPaymentMode)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMode') THEN
    CREATE TYPE "PaymentMode" AS ENUM ('NET_TERMS', 'ADVANCE_BALANCE', 'PAY_BEFORE_DISPATCH', 'STANDARD');
  END IF;
END $$;

-- Add Organization columns (payment options) if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'defaultPaymentMode') THEN
    ALTER TABLE "Organization" ADD COLUMN "defaultPaymentMode" "PaymentMode" DEFAULT 'NET_TERMS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'advancePercent') THEN
    ALTER TABLE "Organization" ADD COLUMN "advancePercent" DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'earlyPayDiscountPercent') THEN
    ALTER TABLE "Organization" ADD COLUMN "earlyPayDiscountPercent" DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'earlyPayDiscountDays') THEN
    ALTER TABLE "Organization" ADD COLUMN "earlyPayDiscountDays" INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'retentionPercent') THEN
    ALTER TABLE "Organization" ADD COLUMN "retentionPercent" DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'retentionDays') THEN
    ALTER TABLE "Organization" ADD COLUMN "retentionDays" INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Organization' AND column_name = 'securityDepositAmount') THEN
    ALTER TABLE "Organization" ADD COLUMN "securityDepositAmount" DOUBLE PRECISION;
  END IF;
END $$;
