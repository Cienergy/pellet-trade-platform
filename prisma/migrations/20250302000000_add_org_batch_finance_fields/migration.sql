-- AlterTable: Organization - defaultPaymentTerm, creditLimit
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "defaultPaymentTerm" "PaymentTerm";
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "creditLimit" DOUBLE PRECISION;

-- AlterTable: OrderBatch - eWayBill placeholders
ALTER TABLE "OrderBatch" ADD COLUMN IF NOT EXISTS "eWayBillNumber" TEXT;
ALTER TABLE "OrderBatch" ADD COLUMN IF NOT EXISTS "eWayBillDate" TIMESTAMP(3);
