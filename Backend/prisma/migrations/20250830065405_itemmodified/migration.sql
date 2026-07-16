/*
  Warnings:

  - You are about to drop the column `sellingPriceOdinary` on the `items` table. All the data in the column will be lost.
  - Made the column `CustomerGroup` on table `customers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "CustomerGroup" SET NOT NULL;

-- AlterTable
ALTER TABLE "items" DROP COLUMN "sellingPriceOdinary",
ADD COLUMN     "sellingPriceOrdinary" DECIMAL(15,4);
