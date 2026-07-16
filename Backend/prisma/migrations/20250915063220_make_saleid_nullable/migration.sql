-- DropForeignKey
ALTER TABLE "sales_receipts" DROP CONSTRAINT "sales_receipts_saleId_fkey";

-- AlterTable
ALTER TABLE "sales_receipts" ALTER COLUMN "saleId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "sales_receipts" ADD CONSTRAINT "sales_receipts_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
