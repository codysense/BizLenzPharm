/*
  Warnings:

  - You are about to drop the `PurchaseRefund` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PurchaseRefund" DROP CONSTRAINT "PurchaseRefund_cashAccountId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseRefund" DROP CONSTRAINT "PurchaseRefund_purchaseId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseRefund" DROP CONSTRAINT "PurchaseRefund_userId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseRefund" DROP CONSTRAINT "PurchaseRefund_vendorId_fkey";

-- DropTable
DROP TABLE "PurchaseRefund";

-- CreateTable
CREATE TABLE "purchase_refunds" (
    "id" TEXT NOT NULL,
    "refundNo" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "refundDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_refunds_refundNo_key" ON "purchase_refunds"("refundNo");

-- AddForeignKey
ALTER TABLE "purchase_refunds" ADD CONSTRAINT "purchase_refunds_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_refunds" ADD CONSTRAINT "purchase_refunds_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_refunds" ADD CONSTRAINT "purchase_refunds_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_refunds" ADD CONSTRAINT "purchase_refunds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
