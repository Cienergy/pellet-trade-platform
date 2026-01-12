/*
  Warnings:

  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[productId,siteId]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.
  - Made the column `updatedAt` on table `Inventory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `siteId` on table `Inventory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedBy` on table `Inventory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdBy` on table `Order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdBy` on table `OrderBatch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `siteId` on table `OrderBatch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Site` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BUYER', 'OPS', 'FINANCE', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('CREATED', 'INVOICED', 'PAID');

-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_siteId_fkey";

-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "OrderBatch" DROP CONSTRAINT "OrderBatch_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "OrderBatch" DROP CONSTRAINT "OrderBatch_siteId_fkey";

-- AlterTable
ALTER TABLE "Inventory" ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "siteId" SET NOT NULL,
ALTER COLUMN "updatedBy" SET NOT NULL;

-- AlterTable
ALTER TABLE "Order"
ALTER COLUMN "status" TYPE "OrderStatus"
USING UPPER("status")::"OrderStatus",
ALTER COLUMN "createdBy" SET NOT NULL;



-- AlterTable
ALTER TABLE "OrderBatch" ADD COLUMN     "status" "BatchStatus" NOT NULL DEFAULT 'CREATED',
ALTER COLUMN "createdBy" SET NOT NULL,
ALTER COLUMN "siteId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Site"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();


-- AlterTable
-- Create enum type
-- CREATE TYPE "UserRole" AS ENUM ('BUYER', 'OPS', 'FINANCE', 'ADMIN');

-- Convert role column safely
ALTER TABLE "User"
ALTER COLUMN "role" TYPE "UserRole"
USING "role"::"UserRole",
ALTER COLUMN "name" SET NOT NULL;


-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productId_siteId_key" ON "Inventory"("productId", "siteId");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBatch" ADD CONSTRAINT "OrderBatch_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBatch" ADD CONSTRAINT "OrderBatch_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
