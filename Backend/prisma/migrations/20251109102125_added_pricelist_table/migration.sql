-- CreateTable
CREATE TABLE "ItemPriceList" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "customerGroup" TEXT NOT NULL,
    "price" DECIMAL(15,4) NOT NULL,

    CONSTRAINT "ItemPriceList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemPriceList_itemId_customerGroup_key" ON "ItemPriceList"("itemId", "customerGroup");

-- AddForeignKey
ALTER TABLE "ItemPriceList" ADD CONSTRAINT "ItemPriceList_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
