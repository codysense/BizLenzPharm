-- DropForeignKey
ALTER TABLE "pos_sales" DROP CONSTRAINT "pos_sales_cashAccountId_fkey";

-- AlterTable
ALTER TABLE "pos_sales" ALTER COLUMN "cashAccountId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "cash_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
