-- CreateEnum
CREATE TYPE "PurchaseOrderType" AS ENUM ('INVENTORY', 'ASSET');

-- DropForeignKey
ALTER TABLE "purchase_lines" DROP CONSTRAINT "purchase_lines_itemId_fkey";

-- AlterTable
ALTER TABLE "purchase_lines" ADD COLUMN     "assetName" TEXT,
ALTER COLUMN "itemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "orderType" "PurchaseOrderType" NOT NULL DEFAULT 'INVENTORY';

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
