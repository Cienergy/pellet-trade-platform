-- Add per-batch freight fields (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='OrderBatch' AND column_name='freightCost') THEN
    ALTER TABLE "OrderBatch" ADD COLUMN "freightCost" DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='OrderBatch' AND column_name='freightCurrency') THEN
    ALTER TABLE "OrderBatch" ADD COLUMN "freightCurrency" TEXT DEFAULT 'INR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='OrderBatch' AND column_name='freightVendorName') THEN
    ALTER TABLE "OrderBatch" ADD COLUMN "freightVendorName" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='OrderBatch' AND column_name='freightInvoiceRef') THEN
    ALTER TABLE "OrderBatch" ADD COLUMN "freightInvoiceRef" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='OrderBatch' AND column_name='freightNotes') THEN
    ALTER TABLE "OrderBatch" ADD COLUMN "freightNotes" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='OrderBatch' AND column_name='freightEnteredAt') THEN
    ALTER TABLE "OrderBatch" ADD COLUMN "freightEnteredAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='OrderBatch' AND column_name='freightEnteredBy') THEN
    ALTER TABLE "OrderBatch" ADD COLUMN "freightEnteredBy" TEXT;
  END IF;
END $$;

