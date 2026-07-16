-- AddForeignKey
ALTER TABLE "memos" ADD CONSTRAINT "memos_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
