/*
  Warnings:

  - You are about to drop the `memos` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MemoStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "memoCategory" AS ENUM ('RETURN', 'FINANCIAL', 'PRICE_ADJUSTMENT', 'WRITE_OFF');

-- DropForeignKey
ALTER TABLE "memos" DROP CONSTRAINT "memos_accountId_fkey";

-- DropForeignKey
ALTER TABLE "memos" DROP CONSTRAINT "memos_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "memos" DROP CONSTRAINT "memos_customerId_fkey";

-- DropForeignKey
ALTER TABLE "memos" DROP CONSTRAINT "memos_vendorId_fkey";

-- DropTable
DROP TABLE "memos";

-- CreateTable
CREATE TABLE "memo" (
    "id" TEXT NOT NULL,
    "memoNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "module" "MemoModule" NOT NULL,
    "memoType" "MemoType" NOT NULL,
    "category" "memoCategory" NOT NULL DEFAULT 'FINANCIAL',
    "amount" DECIMAL(65,30) NOT NULL,
    "remaining" DECIMAL(65,30) NOT NULL,
    "status" "MemoStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "saleId" TEXT,
    "purchaseId" TEXT,
    "customerId" TEXT,
    "vendorId" TEXT,
    "accountId" TEXT,
    "journalId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memo_memoNo_key" ON "memo"("memoNo");

-- AddForeignKey
ALTER TABLE "memo" ADD CONSTRAINT "memo_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memo" ADD CONSTRAINT "memo_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memo" ADD CONSTRAINT "memo_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memo" ADD CONSTRAINT "memo_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memo" ADD CONSTRAINT "memo_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memo" ADD CONSTRAINT "memo_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memo" ADD CONSTRAINT "memo_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
