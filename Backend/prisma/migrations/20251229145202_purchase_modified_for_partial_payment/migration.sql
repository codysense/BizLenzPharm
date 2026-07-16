-- AlterEnum
ALTER TYPE "PurchaseStatus" ADD VALUE 'PARTIALLY_PAID';

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "balanceAmount" DECIMAL(15,2) NOT NULL DEFAULT 0;
