/*
  Warnings:

  - Added the required column `state` to the `Organization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "state" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "availableMT" DOUBLE PRECISION NOT NULL,
    "reservedMT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productId_key" ON "Inventory"("productId");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
