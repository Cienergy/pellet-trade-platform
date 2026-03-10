-- Add Order columns required by app/seed (requestedQuantityMT, deliveryLocation, orderSource, notes, rejectionReason)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "requestedQuantityMT" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLocation" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderSource" TEXT NOT NULL DEFAULT 'WEB';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
