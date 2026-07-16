/*
  Warnings:

  - A unique constraint covering the columns `[category,key]` on the table `system_settings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "system_settings_category_key_key" ON "system_settings"("category", "key");
