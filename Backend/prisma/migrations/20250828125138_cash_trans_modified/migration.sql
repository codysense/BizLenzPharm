-- AlterTable
ALTER TABLE "cash_accounts" ALTER COLUMN "glAccountId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "purchase_payments" ADD COLUMN     "reference" TEXT;

-- AlterTable
ALTER TABLE "sales_receipts" ADD COLUMN     "reference" TEXT;
