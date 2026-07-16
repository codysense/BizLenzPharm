/*
  Warnings:

  - You are about to drop the column `paymentTerms` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "paymentTerms",
ADD COLUMN     "CustomerGroup" TEXT;

-- AlterTable
ALTER TABLE "items" DROP COLUMN "sellingPrice",
ADD COLUMN     "sellingPriceBulk" DECIMAL(15,4),
ADD COLUMN     "sellingPriceOdinary" DECIMAL(15,4);
