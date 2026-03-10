-- Restore OrderBatch.deliveryAt (dropped in 20260112082543; required by schema and seed)
ALTER TABLE "OrderBatch" ADD COLUMN IF NOT EXISTS "deliveryAt" TIMESTAMP(3);
