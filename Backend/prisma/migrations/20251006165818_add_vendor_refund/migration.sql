-- CreateTable
CREATE TABLE "PurchaseRefund" (
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

    CONSTRAINT "PurchaseRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRefund_refundNo_key" ON "PurchaseRefund"("refundNo");

-- AddForeignKey
ALTER TABLE "PurchaseRefund" ADD CONSTRAINT "PurchaseRefund_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRefund" ADD CONSTRAINT "PurchaseRefund_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRefund" ADD CONSTRAINT "PurchaseRefund_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRefund" ADD CONSTRAINT "PurchaseRefund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
