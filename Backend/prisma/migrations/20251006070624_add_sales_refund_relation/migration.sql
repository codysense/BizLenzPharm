-- CreateTable
CREATE TABLE "sales_refunds" (
    "id" TEXT NOT NULL,
    "refundNo" TEXT NOT NULL,
    "saleId" TEXT,
    "customerId" TEXT NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "amountRefunded" DECIMAL(15,2) NOT NULL,
    "refundDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalReceiptId" TEXT,

    CONSTRAINT "sales_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_refunds_refundNo_key" ON "sales_refunds"("refundNo");

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_originalReceiptId_fkey" FOREIGN KEY ("originalReceiptId") REFERENCES "sales_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_refunds" ADD CONSTRAINT "sales_refunds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
