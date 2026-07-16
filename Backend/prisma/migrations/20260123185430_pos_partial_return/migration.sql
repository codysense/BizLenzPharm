-- AlterEnum
ALTER TYPE "PosSaleStatus" ADD VALUE 'PARTIALLY_RETURNED';

-- AlterTable
ALTER TABLE "pos_sale_lines" ADD COLUMN     "costPrice" DECIMAL(15,2) NOT NULL DEFAULT 0;
