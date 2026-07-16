/*
  Warnings:

  - You are about to drop the column `refrence` on the `cash_transactions` table. All the data in the column will be lost.
  - Added the required column `reference` to the `cash_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cash_transactions" DROP COLUMN "refrence",
ADD COLUMN     "reference" TEXT NOT NULL;
