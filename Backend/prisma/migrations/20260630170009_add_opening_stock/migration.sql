-- CreateTable
CREATE TABLE "opening_stock" (
    "id" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "openingDate" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "totalQty" DECIMAL(15,4) NOT NULL,
    "totalValue" DECIMAL(15,4) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opening_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_stock_lines" (
    "id" TEXT NOT NULL,
    "openingStockId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DECIMAL(15,4) NOT NULL,
    "unitCost" DECIMAL(15,4) NOT NULL,
    "lineTotal" DECIMAL(15,4) NOT NULL,

    CONSTRAINT "opening_stock_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opening_stock_referenceNo_key" ON "opening_stock"("referenceNo");

-- AddForeignKey
ALTER TABLE "opening_stock" ADD CONSTRAINT "opening_stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_stock" ADD CONSTRAINT "opening_stock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_stock_lines" ADD CONSTRAINT "opening_stock_lines_openingStockId_fkey" FOREIGN KEY ("openingStockId") REFERENCES "opening_stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_stock_lines" ADD CONSTRAINT "opening_stock_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
