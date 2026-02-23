-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "PaymentTerm" AS ENUM ('NET_30', 'NET_60', 'NET_90');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Organization
DO $$ BEGIN
    ALTER TABLE "Organization" ADD COLUMN "buyerMargin" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- AlterTable: OrderBatch
DO $$ BEGIN
    ALTER TABLE "OrderBatch" ADD COLUMN "committedMT" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "OrderBatch" ADD COLUMN "suppliedMT" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "OrderBatch" ADD COLUMN "dispatchImageUrl" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "OrderBatch" ADD COLUMN "dispatchedAt" TIMESTAMP(3);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "OrderBatch" ADD COLUMN "batchMargin" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- AlterTable: Invoice
DO $$ BEGIN
    ALTER TABLE "Invoice" ADD COLUMN "cgst" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Invoice" ADD COLUMN "sgst" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Invoice" ADD COLUMN "igst" DOUBLE PRECISION;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Invoice" ADD COLUMN "paymentTerm" "PaymentTerm" NOT NULL DEFAULT 'NET_30';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Invoice" ADD COLUMN "syncedToERP" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Contract" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "pricePMT" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Contract_orgId_idx" ON "Contract"("orgId");

CREATE INDEX IF NOT EXISTS "Contract_productId_idx" ON "Contract"("productId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
    ALTER TABLE "Contract" ADD CONSTRAINT "Contract_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Contract" ADD CONSTRAINT "Contract_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

