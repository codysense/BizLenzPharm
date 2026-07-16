-- DropForeignKey
ALTER TABLE "purchase_payments" DROP CONSTRAINT "purchase_payments_purchaseId_fkey";

-- AlterTable
ALTER TABLE "purchase_payments" ALTER COLUMN "purchaseId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
