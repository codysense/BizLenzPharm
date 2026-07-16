-- DropForeignKey
ALTER TABLE "pos_sessions" DROP CONSTRAINT "pos_sessions_cashAccountId_fkey";

-- AlterTable
ALTER TABLE "pos_sales" ALTER COLUMN "paymentMethod" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pos_sessions" ALTER COLUMN "cashAccountId" DROP NOT NULL,
ALTER COLUMN "openingBalance" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "cash_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
