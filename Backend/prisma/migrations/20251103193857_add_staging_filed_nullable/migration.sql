/*
  Warnings:

  - You are about to drop the column `contraAccountId` on the `cash_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `glAccountId` on the `cash_transactions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "cash_transactions" DROP CONSTRAINT "cash_transactions_contraAccountId_fkey";

-- DropForeignKey
ALTER TABLE "cash_transactions" DROP CONSTRAINT "cash_transactions_glAccountId_fkey";

-- AlterTable
ALTER TABLE "cash_transactions" DROP COLUMN "contraAccountId",
DROP COLUMN "glAccountId",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "authorizedAt" TIMESTAMP(3),
ADD COLUMN     "authorizedBy" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidBy" TEXT,
ADD COLUMN     "preparedBy" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PREPARED',
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "reference" DROP NOT NULL;

-- CreateTable
CREATE TABLE "cash_transaction_lines" (
    "id" TEXT NOT NULL,
    "cashTransactionId" TEXT NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "contraAccountId" TEXT,
    "lineAmount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transaction_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transaction_postings" (
    "id" TEXT NOT NULL,
    "cashTransactionId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedBy" TEXT NOT NULL,

    CONSTRAINT "cash_transaction_postings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_transaction_postings_cashTransactionId_journalId_key" ON "cash_transaction_postings"("cashTransactionId", "journalId");

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_preparedBy_fkey" FOREIGN KEY ("preparedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_authorizedBy_fkey" FOREIGN KEY ("authorizedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_paidBy_fkey" FOREIGN KEY ("paidBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transaction_lines" ADD CONSTRAINT "cash_transaction_lines_cashTransactionId_fkey" FOREIGN KEY ("cashTransactionId") REFERENCES "cash_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transaction_lines" ADD CONSTRAINT "cash_transaction_lines_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transaction_lines" ADD CONSTRAINT "cash_transaction_lines_contraAccountId_fkey" FOREIGN KEY ("contraAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transaction_postings" ADD CONSTRAINT "cash_transaction_postings_cashTransactionId_fkey" FOREIGN KEY ("cashTransactionId") REFERENCES "cash_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transaction_postings" ADD CONSTRAINT "cash_transaction_postings_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transaction_postings" ADD CONSTRAINT "cash_transaction_postings_postedBy_fkey" FOREIGN KEY ("postedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
