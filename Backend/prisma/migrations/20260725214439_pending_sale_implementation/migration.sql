-- CreateTable
CREATE TABLE "pending_pos_sales" (
    "id" TEXT NOT NULL,
    "saleNo" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "subtotal" DECIMAL(15,4) NOT NULL,
    "totalAmount" DECIMAL(15,4) NOT NULL,
    "totalPaid" DECIMAL(15,4) NOT NULL,
    "changeAmount" DECIMAL(15,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_pos_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_pos_sale_lines" (
    "id" TEXT NOT NULL,
    "pendingSaleId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DECIMAL(15,4) NOT NULL,
    "unitPrice" DECIMAL(15,4) NOT NULL,
    "discountPercent" DECIMAL(15,4) NOT NULL DEFAULT 0,

    CONSTRAINT "pending_pos_sale_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_pos_payments" (
    "id" TEXT NOT NULL,
    "pendingSaleId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "amount" DECIMAL(15,4) NOT NULL,

    CONSTRAINT "pending_pos_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_pos_sales_saleNo_key" ON "pending_pos_sales"("saleNo");

-- AddForeignKey
ALTER TABLE "pending_pos_sales" ADD CONSTRAINT "pending_pos_sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_pos_sale_lines" ADD CONSTRAINT "pending_pos_sale_lines_pendingSaleId_fkey" FOREIGN KEY ("pendingSaleId") REFERENCES "pending_pos_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_pos_sale_lines" ADD CONSTRAINT "pending_pos_sale_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_pos_payments" ADD CONSTRAINT "pending_pos_payments_pendingSaleId_fkey" FOREIGN KEY ("pendingSaleId") REFERENCES "pending_pos_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_pos_payments" ADD CONSTRAINT "pending_pos_payments_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "cash_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
