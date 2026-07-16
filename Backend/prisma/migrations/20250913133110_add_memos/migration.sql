/*
  Warnings:

  - You are about to drop the column `chartOfAccountId` on the `PurchaseMemo` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `PurchaseMemo` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `PurchaseMemo` table. All the data in the column will be lost.
  - You are about to drop the column `chartOfAccountId` on the `SalesMemo` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SalesMemo` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `SalesMemo` table. All the data in the column will be lost.
  - Added the required column `accountId` to the `PurchaseMemo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `SalesMemo` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PurchaseMemo" DROP CONSTRAINT "PurchaseMemo_chartOfAccountId_fkey";

-- DropForeignKey
ALTER TABLE "SalesMemo" DROP CONSTRAINT "SalesMemo_chartOfAccountId_fkey";

-- AlterTable
ALTER TABLE "PurchaseMemo" DROP COLUMN "chartOfAccountId",
DROP COLUMN "createdAt",
DROP COLUMN "description",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "SalesMemo" DROP COLUMN "chartOfAccountId",
DROP COLUMN "createdAt",
DROP COLUMN "description",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "credit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memoId" TEXT,
    "memoType" TEXT,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SalesMemo" ADD CONSTRAINT "SalesMemo_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseMemo" ADD CONSTRAINT "PurchaseMemo_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
