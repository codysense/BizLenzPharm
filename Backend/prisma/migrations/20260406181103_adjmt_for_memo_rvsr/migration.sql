-- AlterEnum
ALTER TYPE "MemoStatus" ADD VALUE 'REVERSED';

-- AlterTable
ALTER TABLE "memo" ADD COLUMN     "isReversal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reversalReason" TEXT,
ADD COLUMN     "reversedFromId" TEXT;

-- CreateIndex
CREATE INDEX "memo_saleId_idx" ON "memo"("saleId");

-- CreateIndex
CREATE INDEX "memo_purchaseId_idx" ON "memo"("purchaseId");

-- CreateIndex
CREATE INDEX "memo_customerId_idx" ON "memo"("customerId");

-- CreateIndex
CREATE INDEX "memo_vendorId_idx" ON "memo"("vendorId");

-- CreateIndex
CREATE INDEX "memo_reversedFromId_idx" ON "memo"("reversedFromId");

-- AddForeignKey
ALTER TABLE "memo" ADD CONSTRAINT "memo_reversedFromId_fkey" FOREIGN KEY ("reversedFromId") REFERENCES "memo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
