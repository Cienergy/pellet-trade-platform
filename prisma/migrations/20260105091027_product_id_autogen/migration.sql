/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Product` table. All the data in the column will be lost.
  - You are about to alter the column `cvMin` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `cvMax` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "createdAt",
ALTER COLUMN "cvMin" SET DATA TYPE INTEGER,
ALTER COLUMN "cvMax" SET DATA TYPE INTEGER;
