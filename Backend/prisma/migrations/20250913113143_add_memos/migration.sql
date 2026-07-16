-- CreateEnum
CREATE TYPE "MemoType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "SalesMemo" (
    "id" TEXT NOT NULL,
    "type" "MemoType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "customerId" TEXT NOT NULL,
    "chartOfAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseMemo" (
    "id" TEXT NOT NULL,
    "type" "MemoType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "vendorId" TEXT NOT NULL,
    "chartOfAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseMemo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SalesMemo" ADD CONSTRAINT "SalesMemo_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesMemo" ADD CONSTRAINT "SalesMemo_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseMemo" ADD CONSTRAINT "PurchaseMemo_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseMemo" ADD CONSTRAINT "PurchaseMemo_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
