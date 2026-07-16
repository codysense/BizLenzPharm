/*
  Warnings:

  - Made the column `preparedBy` on table `cash_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `cash_transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "cash_transactions" DROP CONSTRAINT "cash_transactions_preparedBy_fkey";

-- AlterTable
ALTER TABLE "cash_transactions" ALTER COLUMN "preparedBy" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_preparedBy_fkey" FOREIGN KEY ("preparedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
