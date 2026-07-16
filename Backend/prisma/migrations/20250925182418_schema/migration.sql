/*
  Warnings:

  - Added the required column `value` to the `adjustment_lines` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "adjustment_lines" ADD COLUMN     "value" DECIMAL(15,4) NOT NULL;

-- AlterTable
ALTER TABLE "stock_adjustment" ALTER COLUMN "adjustmentDate" SET DATA TYPE TEXT;
