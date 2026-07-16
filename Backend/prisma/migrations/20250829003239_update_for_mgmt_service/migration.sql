/*
  Warnings:

  - You are about to drop the column `notes` on the `approval_actions` table. All the data in the column will be lost.
  - You are about to drop the column `referenceId` on the `approval_requests` table. All the data in the column will be lost.
  - You are about to drop the column `module` on the `approval_workflows` table. All the data in the column will be lost.
  - You are about to drop the column `fiscalYear` on the `fiscal_periods` table. All the data in the column will be lost.
  - Added the required column `entityId` to the `approval_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityType` to the `approval_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestedBy` to the `approval_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `approval_steps` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity` to the `approval_workflows` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fiscalYearId` to the `fiscal_periods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodNumber` to the `fiscal_periods` table without a default value. This is not possible if the table is not empty.
  - Made the column `category` on table `system_settings` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "system_settings_key_key";

-- AlterTable
ALTER TABLE "approval_actions" DROP COLUMN "notes",
ADD COLUMN     "actionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "comments" TEXT;

-- AlterTable
ALTER TABLE "approval_requests" DROP COLUMN "referenceId",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "currentStepId" TEXT,
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "entityType" TEXT NOT NULL,
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "requestedBy" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "approval_steps" ADD COLUMN     "isRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "approval_workflows" DROP COLUMN "module",
ADD COLUMN     "entity" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxAmount" DECIMAL(15,2),
ADD COLUMN     "minAmount" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "fiscal_periods" DROP COLUMN "fiscalYear",
ADD COLUMN     "fiscalYearId" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isClosed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "periodNumber" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "fiscal_years" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "dataType" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "updatedBy" TEXT,
ALTER COLUMN "category" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "approval_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "approval_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "approval_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "approval_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
