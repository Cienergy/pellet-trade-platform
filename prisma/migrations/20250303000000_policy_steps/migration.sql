-- Step 1: Add NET_15 to PaymentTerm enum
ALTER TYPE "PaymentTerm" ADD VALUE 'NET_15' BEFORE 'NET_30';

-- Step 2: Organization - blockNewOrdersIfOverdue
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "blockNewOrdersIfOverdue" BOOLEAN NOT NULL DEFAULT false;

-- Step 3: Invoice - e-invoice IRN placeholder
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "irn" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "irnDate" TIMESTAMP(3);

-- Step 4: Payment - verifiedAt for SLA
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

-- Step 5: CreditNote and Refund tables
CREATE TABLE IF NOT EXISTS "CreditNote" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Refund" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");
CREATE INDEX IF NOT EXISTS "Refund_creditNoteId_idx" ON "Refund"("creditNoteId");

ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
