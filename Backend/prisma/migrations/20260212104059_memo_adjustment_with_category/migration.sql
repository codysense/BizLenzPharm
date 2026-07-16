/*
  Warnings:

  - The values [RETURN,PRICE_ADJUSTMENT,WRITE_OFF] on the enum `memoCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "memoCategory_new" AS ENUM ('SALES_RETURN', 'PURCHASE_RETURN', 'FINANCIAL');
ALTER TABLE "public"."memo" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "memo" ALTER COLUMN "category" TYPE "memoCategory_new" USING ("category"::text::"memoCategory_new");
ALTER TYPE "memoCategory" RENAME TO "memoCategory_old";
ALTER TYPE "memoCategory_new" RENAME TO "memoCategory";
DROP TYPE "public"."memoCategory_old";
ALTER TABLE "memo" ALTER COLUMN "category" SET DEFAULT 'FINANCIAL';
COMMIT;
