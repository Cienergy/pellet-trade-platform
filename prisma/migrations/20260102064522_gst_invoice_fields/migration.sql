/*
  Warnings:

  - You are about to drop the column `amount` on the `Invoice` table. All the data in the column will be lost.
  - Added the required column `gstAmount` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gstRate` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gstType` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "amount",
ADD COLUMN     "gstAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "gstRate" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "gstType" TEXT NOT NULL,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL;
