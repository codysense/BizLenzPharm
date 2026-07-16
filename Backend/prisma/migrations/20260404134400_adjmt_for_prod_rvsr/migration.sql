-- AlterEnum
ALTER TYPE "WipLedgerType" ADD VALUE 'ADJUSTMENT';

-- AlterTable
ALTER TABLE "wip_ledger" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "isReversal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "itemId" TEXT,
ADD COLUMN     "qty" DECIMAL(15,4),
ADD COLUMN     "refId" TEXT,
ADD COLUMN     "refType" TEXT,
ADD COLUMN     "reversedFromId" TEXT,
ADD COLUMN     "unitCost" DECIMAL(15,4),
ADD COLUMN     "warehouseId" TEXT;

-- CreateIndex
CREATE INDEX "wip_ledger_productionOrderId_idx" ON "wip_ledger"("productionOrderId");

-- CreateIndex
CREATE INDEX "wip_ledger_itemId_idx" ON "wip_ledger"("itemId");

-- CreateIndex
CREATE INDEX "wip_ledger_refType_refId_idx" ON "wip_ledger"("refType", "refId");

-- AddForeignKey
ALTER TABLE "wip_ledger" ADD CONSTRAINT "wip_ledger_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wip_ledger" ADD CONSTRAINT "wip_ledger_reversedFromId_fkey" FOREIGN KEY ("reversedFromId") REFERENCES "wip_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
