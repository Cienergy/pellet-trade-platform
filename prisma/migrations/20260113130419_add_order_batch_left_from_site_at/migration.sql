-- Add OrderBatch.leftFromSiteAt (required by schema and seed)
ALTER TABLE "OrderBatch" ADD COLUMN IF NOT EXISTS "leftFromSiteAt" TIMESTAMP(3);
