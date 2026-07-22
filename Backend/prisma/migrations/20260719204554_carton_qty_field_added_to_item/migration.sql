/*
  Warnings:

  - You are about to drop the column `sellingPriceWIC` on the `items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "items" DROP COLUMN "sellingPriceWIC",
ADD COLUMN     "cartonQuantity" DECIMAL(15,4);
