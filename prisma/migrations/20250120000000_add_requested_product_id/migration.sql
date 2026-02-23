-- AlterTable
ALTER TABLE "Order" ADD COLUMN "requestedProductId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_requestedProductId_fkey" FOREIGN KEY ("requestedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

