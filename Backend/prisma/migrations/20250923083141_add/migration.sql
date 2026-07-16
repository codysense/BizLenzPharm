/*
  Warnings:

  - You are about to drop the `PurchaseMemo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesMemo` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `module` on the `memos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `memoType` on the `memos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MemoModule" AS ENUM ('SALES', 'PURCHASES');

-- DropForeignKey
ALTER TABLE "PurchaseMemo" DROP CONSTRAINT "PurchaseMemo_accountId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseMemo" DROP CONSTRAINT "PurchaseMemo_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "SalesMemo" DROP CONSTRAINT "SalesMemo_accountId_fkey";

-- DropForeignKey
ALTER TABLE "SalesMemo" DROP CONSTRAINT "SalesMemo_customerId_fkey";

-- AlterTable
ALTER TABLE "memos" DROP COLUMN "module",
ADD COLUMN     "module" "MemoModule" NOT NULL,
DROP COLUMN "memoType",
ADD COLUMN     "memoType" "MemoType" NOT NULL;

-- DropTable
DROP TABLE "PurchaseMemo";

-- DropTable
DROP TABLE "SalesMemo";
