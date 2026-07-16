/*
  Warnings:

  - Added the required column `refrence` to the `cash_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cash_transactions" ADD COLUMN     "refrence" TEXT NOT NULL;
