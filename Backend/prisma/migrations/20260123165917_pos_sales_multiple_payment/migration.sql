/*
  Warnings:

  - You are about to drop the column `paymentMethod` on the `pos_sales` table. All the data in the column will be lost.
  - The `status` column on the `pos_sales` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PosPaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');

-- AlterTable
ALTER TABLE "pos_sales" DROP COLUMN "paymentMethod",
DROP COLUMN "status",
ADD COLUMN     "status" "PosSaleStatus" NOT NULL DEFAULT 'COMPLETED',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "pos_sale_payments" (
    "id" TEXT NOT NULL,
    "posSaleId" TEXT NOT NULL,
    "method" "PosPaymentMethod" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_sale_lines_posSaleId_idx" ON "pos_sale_lines"("posSaleId");

-- AddForeignKey
ALTER TABLE "pos_sale_payments" ADD CONSTRAINT "pos_sale_payments_posSaleId_fkey" FOREIGN KEY ("posSaleId") REFERENCES "pos_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
